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
  import { initializeApp } from "firebase/app";
  import { getAuth, getFirestore, getStorage } from "firebase/app";
  import { generateQRCode } from "../utils/qr"; // Ensure this path is correct
  import { convertTo12HourFormat } from "../utils/timeFormat"; // Import the time format function
  
  // Initialize Firebase
  const firebaseConfig = {
	apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
	authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
	storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };
  
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  
  // Dynamically import nodemailer only on the server side
  let transporter;
  if (typeof window === "undefined") {
	transporter = await import("nodemailer").then((nodemailer) =>
	  nodemailer.createTransport({
		host: process.env.EMAIL_HOST,
		port: process.env.EMAIL_PORT,
		secure: false,
		auth: {
		  user: process.env.EMAIL_USER,
		  pass: process.env.EMAIL_PASS,
		},
	  })
	);
  }
  
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
  }) => {
	if (!transporter) {
	  console.error("Email transporter is not initialized.");
	  return;
	}
  
	setLoading(true);
  
	const htmlContent = `
	  <h2>You're registered for: ${title}</h2>
	  <p><strong>Date:</strong> ${date}</p>
	  <p><strong>Time:</strong> ${convertTo12HourFormat(time)}</p>
	  <p><strong>Note:</strong> ${note}</p>
	  <p><strong>Description:</strong> ${description}</p>
	  <p><strong>Passcode:</strong> ${passcode}</p>
	  ${
		flier_url !== "No flier for this event"
		  ? `<img src="${flier_url}" alt="Event Flier" style="max-width:100%"/>`
		  : ""
	  }
	  ${
		qrCode
		  ? `<p><strong>Scan this QR code at the event:</strong></p><img src="${qrCode}" alt="QR Code" style="width:200px"/>`
		  : ""
	  }
	`;
  
	try {
	  await transporter.sendMail({
		from: '"RSRVD Events" <rsrvd@reserveddigitalbranding.com>',
		to: email,
		subject: `RSRVD Ticket: ${title}`,
		html: htmlContent,
	  });
  
	  setLoading(false);
	  setSuccess(true);
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
	router
  ) => {
	try {
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
	  });
  
	  const imageRef = ref(storage, `events/${docRef.id}/image`);
  
	  if (flier !== null) {
		await uploadString(imageRef, flier, "data_url").then(async () => {
		  const downloadURL = await getDownloadURL(imageRef);
		  await updateDoc(doc(db, "events", docRef.id), {
			flier_url: downloadURL,
		  });
  
		  successMessage("Event created! 🎉");
		  router.push("/dashboard");
		});
	  } else {
		successMessage("Event created! 🎉");
		router.push("/dashboard");
	  }
	} catch (error) {
	  console.error("Error adding event:", error);
	  errorMessage("Failed to create event ❌");
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
	setLoading
  ) => {
	setLoading(true);
	const passcode = generateID();
	const qrCode = await generateQRCode(passcode);
  
	try {
	  const eventRef = doc(db, "events", event_id);
	  const eventSnap = await getDoc(eventRef);
  
	  if (eventSnap.exists()) {
		const firebaseEvent = eventSnap.data();
		const attendees = firebaseEvent.attendees;
		const result = attendees.filter((item) => item.email === email);
  
		if (result.length === 0 && !firebaseEvent.disableRegistration) {
		  await updateDoc(eventRef, {
			attendees: arrayUnion({ name, email, passcode }),
		  });
  
		  const flierURL = firebaseEvent.flier_url
			? firebaseEvent.flier_url
			: "No flier for this event";
  
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
			setSuccess,
			setLoading,
		  });
		} else {
		  setLoading(false);
		  errorMessage("User already registered ❌");
		}
	  }
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
  