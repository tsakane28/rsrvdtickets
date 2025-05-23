import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { HiMail } from "react-icons/hi";
import { AiTwotoneLock } from "react-icons/ai";
import { useRouter } from "next/router";
import { firebaseLoginUser } from "../utils/util";
import PuzzleCaptcha from '../components/PuzzleCaptcha';

const Login = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [captchaVerified, setCaptchaVerified] = useState(false);
	const [captchaError, setCaptchaError] = useState(null);
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const isFormValid = email && password && captchaVerified;

	const handleCaptchaVerify = (token) => {
		console.log('CAPTCHA verified successfully');
		setCaptchaVerified(true);
		setCaptchaError(null);
	};

	const handleCaptchaError = (error) => {
		console.error('CAPTCHA error:', error);
		setCaptchaError(error.message || 'CAPTCHA verification failed');
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		
		if (!email || !password) {
			setError('Please enter both email and password');
			return;
		}
		
		if (!captchaVerified) {
			setError('Please complete the security check');
			return;
		}
		
		try {
			setLoading(true);
			
			await firebaseLoginUser(email, password, router)
				.catch(err => {
					console.error("Login error:", err);
					setError(err.message || 'Login failed');
				});
				
		} catch (err) {
			setError(err.message || 'An error occurred');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div>
			<Head>
				<title>Login | RSRVD</title>
				<meta
					name='description'
					content='An event ticketing system built with NextJS and Firebase'
				/>
				<meta name='viewport' content='width=device-width, initial-scale=1' />
				<link rel='icon' href='/favicon.ico' />
			</Head>
			<main className='w-full flex items-center justify-between min-h-[100vh]'>
				<div className='md:w-[60%] w-full flex flex-col items-center justify-center min-h-[100vh] px-[30px] py-[30px] relative'>
					<Link href='/'>
						<h2 className='text-2xl font-medium mb-6'>Log into your account</h2>
					</Link>
					<form
						className='w-full flex flex-col justify-center'
						onSubmit={handleSubmit}
					>
						{error && (
							<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
								<span className="block sm:inline">{error}</span>
							</div>
						)}
						{captchaError && (
							<div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4" role="alert">
								<span className="block sm:inline">CAPTCHA Error: {captchaError}</span>
							</div>
						)}
						<label htmlFor='email'>Email address</label>
						<div className='w-full relative'>
							<input
								type='email'
								name='email'
								className='border px-10 py-2 mb-3 rounded-md w-full'
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
							<HiMail className=' absolute left-4 top-3 text-gray-300 text-xl' />
						</div>
						<label htmlFor='password'>Password</label>
						<div className='w-full relative'>
							<input
								type='password'
								name='password'
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className='border px-10 py-2 mb-4 rounded-md w-full'
								required
							/>
							<AiTwotoneLock className=' absolute left-4 top-3 text-gray-300 text-xl' />
						</div>
						<div className="mb-4">
							<PuzzleCaptcha 
								onVerify={handleCaptchaVerify} 
								onError={handleCaptchaError}
							/>
							{captchaError && (
								<p className="text-red-500 text-sm mt-1">{captchaError}</p>
							)}
						</div>
						<button
							type='submit'
							className={`w-full py-3 bg-black text-white rounded-md hover:bg-gray-800 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
							disabled={!isFormValid || loading}
						>
							{loading ? 'Logging in...' : 'Login'}
						</button>
						<p className='text-center'>
							Don't have an account?{" "}
							<Link href='/register' className='text-[#C07F00]'>
								Register
							</Link>
						</p>
					</form>
					<div className='absolute bottom-5 left-5'>
						<p className='opacity-50 text-sm'>
							<Link href='/'>RSRVD</Link> &copy; Copyright{" "}
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
			</main>
		</div>
	);
};

export default Login;
