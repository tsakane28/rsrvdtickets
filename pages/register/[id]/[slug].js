import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { FaUserAlt } from "react-icons/fa";
import { HiMail } from "react-icons/hi";
import { doc, getDoc } from "@firebase/firestore";
import { db } from "../../../utils/firebase";
import { registerAttendee } from "../../../utils/util";
import { useRouter } from "next/router";
import RegClosed from "../../../components/RegClosed";
import ErrorPage from "../../../components/ErrorPage";
import Loading from "../../../components/Loading";

export async function getServerSideProps(context) {
	const docRef = doc(db, "events", context.query.id);
	const docSnap = await getDoc(docRef);
	let firebaseEvent = {};
	if (docSnap.exists()) {
		firebaseEvent = docSnap.data();
	} else {
		console.log("No such document!");
	}
	return {
		props: { event: firebaseEvent },
	};
}

const RegisterPage = ({ event }) => {
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [showPayment, setShowPayment] = useState(false);
	const [paymentComplete, setPaymentComplete] = useState(false);
	const [paynowError, setPaynowError] = useState("");
	const [pollUrl, setPollUrl] = useState("");
	const [redirectUrl, setRedirectUrl] = useState("");
	const { query } = useRouter();

	const handleSubmit = (e) => {
		e.preventDefault();
		
		// Show payment form instead of immediately registering
		setShowPayment(true);
	};
	
	const initiatePaynowPayment = async () => {
		try {
			setLoading(true);
			
			// Use the server-side API endpoint instead of direct Paynow SDK call
			const ticketPrice = event.price || 10; // Default to 10 if price not specified
			
			const response = await fetch('/api/paynow/initiate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					eventId: query.id,
					eventTitle: event.title,
					amount: ticketPrice,
					email,
					name
				}),
			});
			
			const data = await response.json();
			console.log("Payment initiation response:", data);
			
			setLoading(false);
			
			// Follow the exact pattern from Paynow documentation
			if (data.success) {
				// Save the poll URL and payment tracking details
				setPollUrl(data.pollUrl);
				setRedirectUrl(data.redirectUrl);
				
				// Store payment ID in localStorage for tracking
				if (data.paymentId) {
					localStorage.setItem('paymentId', data.paymentId);
					localStorage.setItem('paymentTime', new Date().toISOString());
					localStorage.setItem('eventId', query.id);
					localStorage.setItem('userEmail', email);
					localStorage.setItem('userName', name);
				}
				
				// Open Paynow in new window
				window.open(data.redirectUrl, "_blank");
				
				// Start polling for payment status
				startPolling(data.pollUrl);
			} else {
				setPaynowError("Failed to initiate payment: " + (data.error || "Unknown error"));
			}
		} catch (error) {
			setLoading(false);
			setPaynowError("Payment error: " + error.message);
			console.error("Paynow payment error:", error);
		}
	};
	
	const initiatePaynowMobilePayment = async (phoneNumber, method) => {
		try {
			setLoading(true);
			
			// Use the server-side API endpoint instead of direct Paynow SDK call
			const ticketPrice = event.price || 10; // Default to 10 if price not specified
			
			const response = await fetch('/api/paynow/initiate-mobile', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					eventId: query.id,
					eventTitle: event.title,
					amount: ticketPrice,
					email,
					name,
					phoneNumber,
					method
				}),
			});
			
			const data = await response.json();
			console.log("Mobile payment initiation response:", data);
			
			setLoading(false);
			
			// Follow the exact pattern from Paynow documentation
			if (data.success) {
				// Save the poll URL and display instructions
				setPollUrl(data.pollUrl);
				
				// Store payment ID in localStorage for tracking
				if (data.paymentId) {
					localStorage.setItem('paymentId', data.paymentId);
					localStorage.setItem('paymentTime', new Date().toISOString());
					localStorage.setItem('eventId', query.id);
					localStorage.setItem('userEmail', email);
					localStorage.setItem('userName', name);
					localStorage.setItem('paymentMethod', method);
					localStorage.setItem('phoneNumber', phoneNumber);
				}
				
				// Show instructions to the user
				alert(data.instructions);
				
				// Start polling for payment status
				startPolling(data.pollUrl);
			} else {
				setPaynowError("Failed to initiate mobile payment: " + (data.error || "Unknown error"));
			}
		} catch (error) {
			setLoading(false);
			setPaynowError("Mobile payment error: " + error.message);
			console.error("Paynow mobile payment error:", error);
		}
	};
	
	const startPolling = async (url) => {
		if (!url) return;
		
		// Set up interval to check payment status using the server API
		const pollInterval = setInterval(async () => {
			try {
				const response = await fetch('/api/paynow/poll-status', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ pollUrl: url }),
				});
				
				const status = await response.json();
				
				if (status.paid) {
					clearInterval(pollInterval);
					handlePaymentSuccess(status);
				}
			} catch (error) {
				console.error("Error polling transaction:", error);
			}
		}, 5000); // Check every 5 seconds
		
		// Clear interval after 10 minutes (timeout)
		setTimeout(() => {
			clearInterval(pollInterval);
		}, 10 * 60 * 1000);
	};
	
	const handlePaymentSuccess = async (paymentStatus) => {
		try {
			setPaymentComplete(true);
			setLoading(true);
			
			// Create payment info object from Paynow status
			const paymentInfo = {
				paymentId: paymentStatus.reference || 'paynow-payment',
				amount: paymentStatus.amount,
				currency: 'ZWL', // Zimbabwe currency
				timestamp: new Date().toISOString(),
				status: 'COMPLETED',
				paid: true,
				provider: 'Paynow'
			};
			
			// Register attendee with payment info
			registerAttendee(name, email, query.id, setSuccess, setLoading, paymentInfo);
			setEmail("");
			setName("");
		} catch (error) {
			console.error("Payment success handling error:", error);
			setLoading(false);
		}
	};
	
	// For compatibility with the existing PayPal implementation
	const handlePayPalMessage = (event) => {
		if (event.data === 'paypal-payment-success') {
			// This is left for compatibility with existing PayPal integration
			// In a production app, you would probably want to remove this eventually
		}
	};
	
	// Listen for messages (for PayPal callback - kept for compatibility)
	React.useEffect(() => {
		window.addEventListener('message', handlePayPalMessage);
		return () => {
			window.removeEventListener('message', handlePayPalMessage);
		};
	}, []);
	
	if (loading) {
		return <Loading title='Processing your request🤞🏼' />;
	}
	if (!event.title) {
		return <ErrorPage />;
	}

	if (event.disableRegistration) {
		return <RegClosed event={event} />;
	}

	return (
		<div>
			<Head>
				<title>{`${event.title} | RSRVD`}</title>
				<meta
					name='description'
					content='An event ticketing system built with NextJS and Firebase'
				/>
				<meta name='viewport' content='width=device-width, initial-scale=1' />
				<link rel='icon' href='/favicon.ico' />
			</Head>
			<main className='w-full flex items-center justify-between min-h-[100vh] relative'>
				<div className='md:w-[60%] w-full flex flex-col items-center justify-center min-h-[100vh] px-[30px] py-[30px] relative'>
					<h2 className='text-2xl font-medium mb-3'>
						{showPayment ? 'Complete Payment to Get Your Ticket 💳' : 'Get your ticket 🎉'}
					</h2>
					
					{!showPayment ? (
						<form
							className='w-full flex flex-col justify-center'
							onSubmit={handleSubmit}
						>
							<label htmlFor='name'>Full name</label>
							<div className='w-full relative'>
								<input
									type='text'
									name='name'
									value={name}
									onChange={(e) => setName(e.target.value)}
									className='border px-10 py-2 mb-3 rounded-md w-full'
									required
								/>
								<FaUserAlt className=' absolute left-4 top-3 text-gray-300' />
							</div>

							<label htmlFor='email'>Email address</label>
							<div className='w-full relative'>
								<input
									type='email'
									name='email'
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className='border px-10 py-2 mb-3 rounded-md w-full'
									required
								/>
								<HiMail className=' absolute left-4 top-3 text-gray-300 text-xl' />
							</div>
							<button
								type='submit'
								className='bg-[#FFD95A] p-3 font-medium hover:bg-[#C07F00] hover:text-[#FFF8DE] mb-3 rounded-md'
							>
								CONTINUE TO PAYMENT
							</button>
						</form>
					) : (
						<div className='w-full flex flex-col items-center'>
							<div className='mb-5 text-center'>
								<p className='text-gray-600 mb-2'>Please complete payment to receive your ticket</p>
								<div className='p-3 bg-gray-100 rounded-md mb-2'>
									<p className='font-bold'>{event.title}</p>
									<p>Name: {name}</p>
									<p>Email: {email}</p>
									<p className='font-bold mt-2'>Amount: ${event.price || 10}</p>
								</div>
							</div>
							
							{paynowError && (
								<div className='bg-red-100 text-red-700 p-3 rounded-md mb-4'>
									{paynowError}
								</div>
							)}
							
							{!paymentComplete && !redirectUrl ? (
								<div className='w-full'>
									<div className='flex justify-center mb-4'>
										<button
											onClick={initiatePaynowPayment}
											className='bg-[#FFD140] text-black font-bold py-2 px-6 rounded-md hover:bg-[#E5BC3A]'
										>
											Pay with Paynow
										</button>
									</div>
									
									<div className='mt-5 border-t pt-5'>
										<p className='text-center mb-3 font-medium'>Pay with mobile money</p>
										<div className='flex flex-col'>
											<div className='mb-3'>
												<label htmlFor='phone' className='block mb-1'>Phone Number</label>
												<input 
													type='tel' 
													id='phone' 
													placeholder='07xx xxx xxx'
													className='border px-4 py-2 rounded-md w-full'
												/>
											</div>
											<div className='flex space-x-3'>
												<button
													onClick={() => {
														const phoneNumber = document.getElementById('phone').value;
														if (!phoneNumber) {
															alert('Please enter a phone number');
															return;
														}
														initiatePaynowMobilePayment(phoneNumber, 'ecocash');
													}}
													className='bg-[#4CAF50] text-white font-bold py-2 px-4 rounded-md flex-1'
												>
													Ecocash
												</button>
												<button
													onClick={() => {
														const phoneNumber = document.getElementById('phone').value;
														if (!phoneNumber) {
															alert('Please enter a phone number');
															return;
														}
														initiatePaynowMobilePayment(phoneNumber, 'onemoney');
													}}
													className='bg-[#2196F3] text-white font-bold py-2 px-4 rounded-md flex-1'
												>
													OneMoney
												</button>
											</div>
										</div>
									</div>
								</div>
							) : (
								!paymentComplete && (
									<div className='text-center'>
										<p>Payment initiated. Please complete your payment.</p>
										<button
											onClick={() => window.open(redirectUrl, "_blank")}
											className='bg-[#FFD140] text-black font-bold py-2 px-6 rounded-md hover:bg-[#E5BC3A] mt-3'
										>
											Open Paynow Again
										</button>
									</div>
								)
							)}
							
							{paymentComplete && (
								<p className='text-green-600 font-bold mb-4'>Payment successful! Generating your ticket...</p>
							)}
							
							<button
								className='text-blue-600 underline mt-3'
								onClick={() => {
									setShowPayment(false);
									setPaynowError("");
									setRedirectUrl("");
									setPollUrl("");
								}}
							>
								Go back
							</button>
						</div>
					)}
					
					<div className='absolute bottom-5 left-5'>
						<p className='opacity-50 text-sm'>
							<Link href='/'>{event.title}</Link> &copy; Copyright{" "}
							{new Date().getFullYear()}{" "}
						</p>
					</div>
				</div>
				<div className='login md:w-[40%] h-[100vh] relative'>
					<div className='absolute bottom-5 right-5'>
						<a
							href='https://github.com/tsakane28'
							target='_blank'
							className='text-gray-100'
						>
							Built by RSRVD
						</a>
					</div>
				</div>
				{success && (
					<div className='w-full h-[100vh] dim absolute top-0 flex items-center justify-center z-40'>
						<div className='w-[400px] bg-white h-[300px] flex items-center justify-center flex-col rounded-md shadow-[#FFD95A] shadow-md'>
							<h2 className='text-2xl font-extrabold mb-4 text-center'>
								Registered Successfully! 🎉
							</h2>
							<p className='text-center mb-3'>
								Check your email for your ticket and event information.
							</p>
							<p className='text-center mb-6 text-sm text-gray-600'>
								A PDF ticket has been attached to the email. You can download, print, or show it on your device at the event.
							</p>
							<button
								className='px-4 py-2 bg-[#FFD95A] rounded-md'
								onClick={() => setSuccess(false)}
							>
								OK
							</button>
						</div>
					</div>
				)}
			</main>
		</div>
	);
};
export default RegisterPage;
