import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GiHamburgerMenu } from "react-icons/gi";
import { MdCancel } from "react-icons/md";
import { BsGithub, BsTwitter } from "react-icons/bs";

const Nav = () => {
	const [hamburger, setHamburger] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [hasMounted, setHasMounted] = useState(false);

	useEffect(() => {
		setHasMounted(true);
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 10);
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const navClass = hasMounted && isScrolled
		? 'bg-black/70 backdrop-blur-lg border-b border-gray-800 shadow-md'
		: 'bg-black bg-opacity-80';

	const linkClass = hasMounted && isScrolled
		? 'text-[#C07F00] hover:text-gray-900 font-bold drop-shadow-sm transition-colors duration-200'
		: 'text-gray-300 hover:text-white font-bold drop-shadow-sm transition-colors duration-200';

	const iconClass = hasMounted && isScrolled
		? 'text-[#C07F00] text-2xl hover:text-gray-900 drop-shadow-sm transition-colors duration-200'
		: 'text-gray-300 text-2xl hover:text-white drop-shadow-sm transition-colors duration-200';

	const hamburgerIconClass = 'text-[#C07F00] text-2xl font-bold drop-shadow-sm transition-colors duration-200';

	return (
		<div
			className={`h-[10vh] flex items-center justify-between px-[20px] sticky top-0 z-50 transition-all duration-300 ${navClass}`}
		>
			<Link href='/'>
				<h1 className={`text-xl font-bold tracking-widest ${linkClass}`}>RSRVD</h1>
			</Link>
			<div className='md:flex items-center justify-between hidden space-x-8'>
				<Link href='/login' className={linkClass}>
					Login
				</Link>
				<Link href='/register' className={linkClass}>
					Register
				</Link>
				<a href='https://github.com/tsakane28' target='_blank'>
					<BsGithub className={iconClass} />
				</a>
			</div>
			<div className='md:hidden block'>
				<GiHamburgerMenu
					className={hamburgerIconClass}
					onClick={() => setHamburger(true)}
				/>
			</div>
			{hamburger && (
				<nav className={`fixed top-0 right-0 w-1/2 dim h-[100vh] p-6 bg-black bg-opacity-90 z-50`}>
					<div className='w-full flex items-center justify-end mb-8'>
						<MdCancel
							className='text-4xl text-[#C07F00] cursor-pointer hover:text-white drop-shadow-sm'
							onClick={() => setHamburger(false)}
						/>
					</div>
					<div className='flex w-full flex-col space-y-8'>
						<Link href='/login' className='text-white hover:text-[#C07F00] font-bold drop-shadow-sm'>
							Login
						</Link>
						<Link href='/register' className='text-white hover:text-[#C07F00] font-bold drop-shadow-sm'>
							Register
						</Link>
						<div className='flex items-center space-x-6'>
							<a href='https://github.com/tsakane28' target='_blank'>
								<BsGithub className='text-white text-2xl hover:text-[#C07F00] drop-shadow-sm' />
							</a>
							<a href='https://twitter.com/' target='_blank'>
								<BsTwitter className='text-white text-2xl hover:text-[#C07F00] drop-shadow-sm' />
							</a>
						</div>
					</div>
				</nav>
			)}
		</div>
	);
};

export default Nav;
