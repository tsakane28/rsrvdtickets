import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { MdCancel } from "react-icons/md";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../utils/firebase";
import { addEventToFirebase } from "../../utils/util";
import { useRouter } from "next/router";
import Loading from "../../components/Loading";

const event = () => {
	const [user, setUser] = useState({});
	const [title, setTitle] = useState("");
	const [date, setDate] = useState("");
	const [time, setTime] = useState("");
	const [venue, setVenue] = useState("");
	const [description, setDescription] = useState("");
	const [note, setNote] = useState("");
	const [flier, setFlier] = useState(null);
	const [buttonClicked, setButtonClicked] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [fileError, setFileError] = useState("");
	const router = useRouter();

	const isUserLoggedIn = useCallback(() => {
		onAuthStateChanged(auth, (user) => {
			if (user) {
				setUser({ email: user.email, uid: user.uid });
			} else {
				return router.push("/register");
			}
		});
	}, []);

	useEffect(() => {
		isUserLoggedIn();
	}, [isUserLoggedIn]);

	const handleSubmit = (e) => {
		e.preventDefault();
		if (fileError) {
			alert("Please fix the file error before submitting.");
			return;
		}
		setButtonClicked(true);
		addEventToFirebase(
			user.uid,
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
		);
	};

	const compressImage = (file, maxSizeMB = 1) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = (event) => {
				const img = new Image();
				img.src = event.target.result;
				img.onload = () => {
					const canvas = document.createElement('canvas');
					let width = img.width;
					let height = img.height;
					
					// Calculate new dimensions to maintain aspect ratio
					const maxDimension = 1200;
					if (width > height && width > maxDimension) {
						height = Math.round((height * maxDimension) / width);
						width = maxDimension;
					} else if (height > maxDimension) {
						width = Math.round((width * maxDimension) / height);
						height = maxDimension;
					}
					
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext('2d');
					ctx.drawImage(img, 0, 0, width, height);
					
					// Get compressed image as Data URL
					const quality = 0.7; // Adjust quality to achieve target size
					const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
					
					resolve(compressedDataUrl);
				};
				img.onerror = (error) => reject(error);
			};
			reader.onerror = (error) => reject(error);
		});
	};

	const handleFileReader = async (e) => {
		setFileError("");
		const file = e.target.files[0];
		
		if (!file) return;
		
		// Check file type
		if (!file.type.match('image.*')) {
			setFileError("Please upload an image file (JPEG, PNG, etc)");
			return;
		}
		
		// Check file size (5MB max)
		const maxSize = 5 * 1024 * 1024; // 5MB in bytes
		if (file.size > maxSize) {
			setFileError(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 5MB.`);
			// We'll still try to compress it below
		}
		
		try {
			// Show progress indicator
			setUploadProgress(10);
			
			// Try to compress the image if it's large
			let imageData;
			if (file.size > 1 * 1024 * 1024) { // Over 1MB
				imageData = await compressImage(file);
				setUploadProgress(50);
			} else {
				// For smaller files, just read as data URL without compression
				const reader = new FileReader();
				imageData = await new Promise((resolve, reject) => {
					reader.onload = (readerEvent) => resolve(readerEvent.target.result);
					reader.onerror = reject;
					reader.readAsDataURL(file);
				});
				setUploadProgress(50);
			}
			
			// Set the compressed or original image data
			setFlier(imageData);
			setUploadProgress(100);
			
			// Reset progress after a delay
			setTimeout(() => setUploadProgress(0), 1000);
			
			// If we had a size error but managed to compress, clear the error
			if (fileError.includes("too large")) {
				setFileError("");
			}
		} catch (error) {
			console.error("Error processing image:", error);
			setFileError("Failed to process image. Please try a different file.");
			setUploadProgress(0);
		}
	};

	return (
		<div>
			<Head>
				<title>Create New Event | RSRVD</title>
				<meta
					name='description'
					content='An event ticketing system built with NextJS and Firebase'
				/>
				<meta name='viewport' content='width=device-width, initial-scale=1' />
				<link rel='icon' href='/favicon.ico' />
			</Head>
			<main className='p-6'>
				<div className='flex items-center justify-between'>
					<h2 className='text-2xl font-bold mb-6'>Create a new event</h2>
					<Link href='/dashboard'>
						<MdCancel className='text-4xl text-[#C07F00] cursor-pointer' />
					</Link>
				</div>

				<form className='flex flex-col' onSubmit={handleSubmit}>
					<label htmlFor='title'>Title</label>
					<input
						name='title'
						type='text'
						className='border-[1px] py-2 px-4 rounded-md mb-3'
						required
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
					<div className='w-full flex justify-between'>
						<div className='w-1/2 flex flex-col mr-[20px]'>
							<label htmlFor='date'>Date</label>
							<input
								name='date'
								type='date'
								className='border-[1px] py-2 px-4 rounded-md mb-3'
								required
								value={date}
								onChange={(e) => setDate(e.target.value)}
							/>
						</div>
						<div className='w-1/2 flex flex-col'>
							<label htmlFor='time'>Time</label>
							<input
								name='time'
								type='time'
								className='border-[1px] py-2 px-4 rounded-md mb-3'
								required
								value={time}
								onChange={(e) => setTime(e.target.value)}
							/>
						</div>
					</div>
					<label htmlFor='venue'>Venue</label>
					<input
						name='venue'
						type='text'
						className='border-[1px] py-2 px-4 rounded-md mb-3'
						required
						value={venue}
						onChange={(e) => setVenue(e.target.value)}
						placeholder='Plot Address, Harare, Zimbabwe'
					/>
					<label htmlFor='description'>
						Event Description <span className='text-gray-500'>(optional)</span>
					</label>
					<textarea
						name='description'
						rows={2}
						className='border-[1px] py-2 px-4 rounded-md mb-3'
						placeholder='Any information or details about the event'
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
					<label htmlFor='note'>
						Note to Attendees <span className='text-gray-500'>(optional)</span>
					</label>
					<textarea
						name='note'
						rows={2}
						value={note}
						onChange={(e) => setNote(e.target.value)}
						className='border-[1px] py-2 px-4 rounded-md mb-3'
						placeholder='Every attendee must take note of this'
					/>
					<label htmlFor='flier'>
						Event Flier <span className='text-gray-500'>(optional, max 5MB)</span>
					</label>
					<input
						name='flier'
						type='file'
						className='border-[1px] py-2 px-4 rounded-md mb-1'
						accept='image/*'
						onChange={handleFileReader}
					/>
					{uploadProgress > 0 && (
						<div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 dark:bg-gray-700">
							<div className="bg-[#C07F00] h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
						</div>
					)}
					{fileError && (
						<p className="text-red-500 text-sm mb-3">{fileError}</p>
					)}
					{flier && !fileError && (
						<div className="mb-3">
							<p className="text-green-600 text-sm">Image ready to upload ✓</p>
						</div>
					)}
					{buttonClicked ? (
						<Loading title='Processing flier and creating event - please wait...' />
					) : (
						<button className='px-4 py-2 bg-[#C07F00] w-[200px] mt-3 text-white rounded-md'>
							Create Event
						</button>
					)}
				</form>
			</main>
		</div>
	);
};

export default event;
