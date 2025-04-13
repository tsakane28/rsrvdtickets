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
import AccountRegistration from "../../../components/AccountRegistration";

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
	const [showPayment, setShowPayment] = useState(false);
	const [paymentComplete, setPaymentComplete] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const { query } = useRouter();

	const handleAccountCreated = () => {
		setShowPayment(true); // Show payment form after account creation
	};

	const handlePaymentSuccess = async () => {
		// Verify payment with our API endpoint
		try {
			const verifyResponse = await fetch('/api/verify-payment', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					paymentId: 'sample-payment-id',
					payerId: 'sample-payer-id',
					orderId: 'sample-order-id',
				}),
			});

			const verifyData = await verifyResponse.json();
			
			if (verifyData.success) {
				console.log("Payment verified successfully, registering with event_id:", query.id);
				setPaymentComplete(true);
				setLoading(true);
				
				const paymentInfo = {
					paymentId: 'sample-payment-id',
					amount: verifyData.details.amount,
					currency: verifyData.details.currency,
					timestamp: new Date().toISOString(),
					status: verifyData.details.status,
					paid: true
				};
				
				// Pass payment info to registerAttendee
				await registerAttendee(name, email, query.id, setSuccess, setLoading, paymentInfo);
				setEmail("");
				setName("");
			} else {
				alert("Payment verification failed: " + verifyData.message);
				setPaymentComplete(false);
			}
		} catch (error) {
			console.error("Payment verification error:", error);
			alert("Payment verification error: " + error.message);
			setPaymentComplete(false);
		}
	};
	
	// Monitor payment callbacks from PayPal
	const handlePayPalMessage = (event) => {
		// Check if the message is from PayPal and payment was successful
		if (event.data === 'paypal-payment-success') {
			handlePaymentSuccess();
		}
	};
	
	// Listen for messages (for PayPal callback)
	React.useEffect(() => {
		window.addEventListener('message', handlePayPalMessage);
		return () => {
			window.removeEventListener('message', handlePayPalMessage);
		};
	}, []);

	if (loading) {
		return <Loading title='Generating your ticket🤞🏼' />;
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
						<AccountRegistration onAccountCreated={handleAccountCreated} />
					) : (
						<div className='w-full flex flex-col items-center'>
							<div className='mb-5 text-center'>
								<p className='text-gray-600 mb-2'>Please complete payment to receive your ticket</p>
								<div className='p-3 bg-gray-100 rounded-md mb-2'>
									<p className='font-bold'>{event.title}</p>
									<p>Name: {name}</p>
									<p>Email: {email}</p>
								</div>
							</div>
							
							{!paymentComplete ? (
								<div className='w-full flex justify-center mb-4'>
									<style jsx>{`
										.pp-5DQJWXVXVDQG6 {
											text-align: center;
											border: none;
											border-radius: 0.25rem;
											min-width: 11.625rem;
											padding: 0 2rem;
											height: 2.625rem;
											font-weight: bold;
											background-color: #FFD140;
											color: #000000;
											font-family: "Helvetica Neue", Arial, sans-serif;
											font-size: 1rem;
											line-height: 1.25rem;
											cursor: pointer;
										}
									`}</style>
									<form 
										action="https://www.sandbox.paypal.com/ncp/payment/5DQJWXVXVDQG6" 
										method="post" 
										target="_blank" 
										style={{display: 'inline-grid', justifyItems: 'center', alignContent: 'start', gap: '0.5rem'}}
										onSubmit={(e) => {
											// Prevent the default form submission to handle it ourselves
											e.preventDefault();
											
											// Open PayPal in a new window manually
											window.open("https://www.sandbox.paypal.com/ncp/payment/5DQJWXVXVDQG6", "_blank");
											
											// In real implementation with PayPal callback:
											// 1. PayPal would redirect to a return URL after payment
											// 2. Or we'd use the PayPal JavaScript SDK to handle the completion
											// For now, simulate payment completion after 2 seconds
											setTimeout(() => handlePaymentSuccess(), 2000);
										}}
									>
										<input className="pp-5DQJWXVXVDQG6" type="submit" value="Get a Ticket" />
										<img src="https://www.paypalobjects.com/images/Debit_Credit_APM.svg" alt="cards" />
										<section> Powered by <img src="https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-wordmark-color.svg" alt="paypal" style={{height: '0.875rem', verticalAlign: 'middle'}}/></section>
									</form>
								</div>
							) : (
								<p className='text-green-600 font-bold mb-4'>Payment successful! Generating your ticket...</p>
							)}
							
							<button
								className='text-blue-600 underline'
								onClick={() => setShowPayment(false)}
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
