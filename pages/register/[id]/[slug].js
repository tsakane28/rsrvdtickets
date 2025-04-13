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
import TicketRegistration from "../../../components/TicketRegistration";

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
	const [loading, setLoading] = useState(false);
	const [showPayment, setShowPayment] = useState(false);
	const [success, setSuccess] = useState(false);
	const { query } = useRouter();

	if (loading) {
		return <Loading title='Generating your ticket🤞🏼' />;
	}
	if (!event.title) {
		return <ErrorPage />;
	}
	if (event.disableRegistration) {
		return <RegClosed event={event} />;
	}

	const handleAccountCreated = () => {
		setShowPayment(true); // Show payment form after account creation
	};

	const handleSuccess = () => {
		setSuccess(true);
		// Additional logic for successful registration can go here
	};

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
						<TicketRegistration event={event} onSuccess={handleSuccess} />
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
