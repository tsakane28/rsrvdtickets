import {
	signInWithEmailAndPassword,
	signOut,
	createUserWithEmailAndPassword,
  } from "firebase/auth";
  import { toast } from "react-toastify";
  import {
	getDownloadURL,
	ref,
	uploadString,
	deleteObject,
  } from "@firebase/storage";
  import {
	getDoc,
	addDoc,
	collection,
	doc,
	updateDoc,
	onSnapshot,
	query,
	deleteDoc,
	where,
	arrayUnion,
  } from "@firebase/firestore";
  import { generateQRCode } from "../utils/qr"; // Ensure this path is correct
  import { convertTo12HourFormat } from "../utils/timeFormat"; // Import the time format function
  import { auth, db, storage } from "../utils/firebase"; // Import Firebase services from firebase.js
  
  // Utility functions
  export const sendEmail = async ({
	name,
	email,
	title,
	time,
	date,
	note,
	description,
	passcode,
	flier_url,
	setSuccess,
	setLoading,
	qrCode = null, // Optional base64 QR code
	event_id, // This parameter is received but not used in request body
  }) => {
	setLoading(true);
  
	try {
	  // Use fetch to call our API endpoint
	  const response = await fetch('/api/email', {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({
		  name,
		  email,
		  title,
		  time,
		  date,
		  note,
		  description,
		  passcode,
		  flier_url,
		  qrCode,
		  event_id, // Add event_id to the request body
		}),
	  });

	  const data = await response.json();
	  
	  if (data.success) {
		setLoading(false);
		setSuccess(true);
	  } else {
		console.error("❌ Email error:", data.message);
		setLoading(false);
		alert("Failed to send email: " + data.message);
	  }
	} catch (error) {
	  console.error("❌ Email error:", error);
	  setLoading(false);
	  alert("Failed to send email: " + error.message);
	}
  };
  
  export const generateID = () => Math.random().toString(36).substring(2, 10);
  
  export const createSlug = (sentence) => {
	let slug = sentence.toLowerCase().trim();
	slug = slug.replace(/[^a-z0-9]+/g, "-");
	slug = slug.replace(/^-+|-+$/g, "");
	return slug;
  };
  
  export const addEventToFirebase = async (
	id,
	title,
	date,
	time,
	venue,
	description,
	note,
	flier,
	router,
	setButtonClicked,
	setUploadProgress
  ) => {
	// Add timeout protection to prevent infinite loading
	const uploadTimeout = setTimeout(() => {
	  console.log("Upload timeout reached - resetting UI state");
	  if (setButtonClicked) setButtonClicked(false);
	  if (setUploadProgress) setUploadProgress(0);
	  successMessage("Event created, but flier upload took too long. The event was saved.");
	  router.push("/dashboard");
	}, 60000); // 60 second timeout as a safety net
	
	try {
	  // First create the event document without the image
	  const docRef = await addDoc(collection(db, "events"), {
		user_id: id,
		title,
		date,
		time,
		venue,
		description,
		note,
		slug: createSlug(title),
		attendees: [],
		disableRegistration: false,
		createdAt: new Date().toISOString(),
	  });
	  
	  console.log("Event document created successfully:", docRef.id);
  
	  // If there's no flier, we're done
	  if (flier === null) {
		clearTimeout(uploadTimeout);
		successMessage("Event created! 🎉");
		if (setButtonClicked) setButtonClicked(false);
		router.push("/dashboard");
		return;
	  }
	  
	  try {
		// Update progress if the function is provided
		if (setUploadProgress) setUploadProgress(30);
		console.log("Beginning image upload process");
		
		// Create a reference to Firebase Storage
		const imageRef = ref(storage, `events/${docRef.id}/image`);
  
		// Update progress
		if (setUploadProgress) setUploadProgress(50);
		
		// Upload the image data with more detailed error handling
		console.log("Uploading image data...");
		await uploadString(imageRef, flier, "data_url").catch(error => {
		  console.error("Error during uploadString:", error);
		  throw error; // Re-throw to be caught by the outer catch
		});
		
		console.log("Image uploaded successfully, getting download URL");
		// Update progress
		if (setUploadProgress) setUploadProgress(75);
		
		// Get the download URL for the uploaded image
		let downloadURL;
		try {
		  downloadURL = await getDownloadURL(imageRef);
		  console.log("Download URL obtained:", downloadURL.substring(0, 50) + "...");
		} catch (urlError) {
		  console.error("Failed to get download URL:", urlError);
		  // Even if we can't get the URL, we can still complete the event creation
		  // since the image is uploaded
		  clearTimeout(uploadTimeout);
		  successMessage("Event created but image URL couldn't be retrieved. Your image was uploaded but may not be visible.");
		  if (setButtonClicked) setButtonClicked(false);
		  router.push("/dashboard");
		  return;
		}
		
		// Update progress
		if (setUploadProgress) setUploadProgress(90);
		
		// Update the event document with the image URL
		console.log("Updating event document with image URL");
		await updateDoc(doc(db, "events", docRef.id), {
		  flier_url: downloadURL,
		}).catch(error => {
		  console.error("Error updating document with image URL:", error);
		  // Even if updating the doc fails, we've created the event and uploaded the image
		  clearTimeout(uploadTimeout);
		  successMessage("Event created but flier may not appear correctly.");
		  if (setButtonClicked) setButtonClicked(false);
		  router.push("/dashboard");
		  return;
		});
		
		// Complete progress
		if (setUploadProgress) setUploadProgress(100);
		console.log("Upload process completed successfully");
  
		clearTimeout(uploadTimeout);
		successMessage("Event created with flier! 🎉");
		if (setButtonClicked) setButtonClicked(false);
		router.push("/dashboard");
	  } catch (uploadError) {
		console.error("Error in image upload flow:", uploadError);
		// If the upload fails, still redirect since the event was created
		clearTimeout(uploadTimeout);
		errorMessage("Event created but failed to upload image ❌");
		if (setButtonClicked) setButtonClicked(false);
		router.push("/dashboard");
	  }
	} catch (error) {
	  console.error("Error in event creation:", error);
	  clearTimeout(uploadTimeout);
	  errorMessage("Failed to create event ❌");
	  if (setButtonClicked) setButtonClicked(false);
	  if (setUploadProgress) setUploadProgress(0);
	}
  };
  
  export const successMessage = (message) => {
	toast.success(message, {
	  position: "top-right",
	  autoClose: 5000,
	  hideProgressBar: false,
	  closeOnClick: true,
	  pauseOnHover: true,
	  draggable: true,
	  progress: undefined,
	  theme: "light",
	});
  };
  
  export const errorMessage = (message) => {
	toast.error(message, {
	  position: "top-right",
	  autoClose: 5000,
	  hideProgressBar: false,
	  closeOnClick: true,
	  pauseOnHover: true,
	  draggable: true,
	  progress: undefined,
	  theme: "light",
	});
  };
  
  export const firebaseCreateUser = (email, password, router) => {
	createUserWithEmailAndPassword(auth, email, password)
	  .then((userCredential) => {
		successMessage("Account created 🎉");
		router.push("/login");
	  })
	  .catch((error) => {
		console.error("Error creating user:", error);
		errorMessage("Account creation declined ❌");
	  });
  };
  
  export const firebaseLoginUser = (email, password, router) => {
	signInWithEmailAndPassword(auth, email, password)
	  .then((userCredential) => {
		successMessage("Authentication successful 🎉");
		router.push("/dashboard");
	  })
	  .catch((error) => {
		console.error("Error logging in:", error);
		errorMessage("Incorrect Email/Password ❌");
	  });
  };
  
  export const firebaseLogOut = (router) => {
	signOut(auth)
	  .then(() => {
		successMessage("Logout successful! 🎉");
		router.push("/");
	  })
	  .catch((error) => {
		console.error("Error logging out:", error);
		errorMessage("Couldn't sign out ❌");
	  });
  };
  
  export const getEvents = (id, setEvents, setLoading) => {
	try {
	  const q = query(collection(db, "events"), where("user_id", "==", id));
  
	  const unsubscribe = onSnapshot(q, (querySnapshot) => {
		const firebaseEvents = [];
		querySnapshot.forEach((doc) => {
		  firebaseEvents.push({ data: doc.data(), id: doc.id });
		});
		setEvents(firebaseEvents);
		setLoading(false);
	  });
  
	  return () => unsubscribe();
	} catch (error) {
	  console.error("Error fetching events:", error);
	}
  };
  
  export const updateRegLink = async (id) => {
	const number = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
	const eventRef = doc(db, "events", id);
	await updateDoc(eventRef, {
	  disableRegistration: true,
	  slug: `expired-${number}`,
	});
  };
  
  export const registerAttendee = async (
	name,
	email,
	event_id,
	setSuccess,
	setLoading,
	paymentInfo = null // Add payment info parameter
  ) => {
	setLoading(true);
	
	try {
	  // Validate inputs
	  if (!name || !email || !event_id) {
		setLoading(false);
		errorMessage("Missing required information ❌");
		return;
	  }
	  
	  // Debug event ID
	  console.log("Registering for event_id:", event_id);
	  
	  const passcode = generateID();
	  const qrCode = await generateQRCode(passcode);

	  const eventRef = doc(db, "events", event_id);
	  const eventSnap = await getDoc(eventRef);

	  if (!eventSnap.exists()) {
		setLoading(false);
		errorMessage("Event not found ❌");
		return;
	  }

	  const firebaseEvent = eventSnap.data();
	  const attendees = firebaseEvent.attendees || [];
	  const result = attendees.filter((item) => item.email === email);

	  if (result.length > 0) {
		setLoading(false);
		errorMessage("User already registered ❌");
		return;
	  }

	  if (firebaseEvent.disableRegistration) {
		setLoading(false);
		errorMessage("Registration for this event is closed ❌");
		return;
	  }

	  // Create the attendee object with payment info
	  const attendeeData = { 
	    name, 
	    email, 
	    passcode,
	    // Add payment information if provided
	    paymentInfo: paymentInfo || {
	      paymentId: 'direct-registration',
	      timestamp: new Date().toISOString(),
	      paid: true
	    }
	  };

	  // Add attendee to event
	  await updateDoc(eventRef, {
		attendees: arrayUnion(attendeeData),
	  });

	  const flierURL = firebaseEvent.flier_url
		? firebaseEvent.flier_url
		: "No flier for this event";

	  // Send email with ticket info
	  await sendEmail({
		name,
		email,
		title: firebaseEvent.title,
		time: firebaseEvent.time,
		date: firebaseEvent.date,
		note: firebaseEvent.note,
		description: firebaseEvent.description,
		passcode,
		flier_url: flierURL,
		qrCode,
		event_id,
		setSuccess,
		setLoading,
	  });
	} catch (error) {
	  console.error("Error registering attendee:", error);
	  setLoading(false);
	  errorMessage("Failed to register attendee ❌");
	}
  };
  
  export const deleteEvent = async (id) => {
	try {
	  await deleteDoc(doc(db, "events", id));
  
	  const imageRef = ref(storage, `events/${id}/image`);
	  await deleteObject(imageRef).catch((error) => {
		if (error.code === "storage/object-not-found") {
		  console.log("Image does not exist");
		} else {
		  console.error("Error deleting image:", error);
		}
	  });
	} catch (error) {
	  console.error("Error deleting event:", error);
	}
  };
  