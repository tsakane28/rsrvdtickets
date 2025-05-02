import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
	return (
		<Html lang='en'>
			<Head>
				{/* Character set and viewport settings */}
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
				
				{/* Security headers */}
				{/* Content Security Policy */}
				<meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.firebasestorage.googleapis.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com; frame-src 'self' https://www.google.com/recaptcha/; worker-src 'self' blob:;" />
				
				{/* Prevent XSS */}
				<meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
				
				{/* Prevent clickjacking */}
				<meta httpEquiv="X-Frame-Options" content="DENY" />
				
				{/* Prevent MIME type sniffing */}
				<meta httpEquiv="X-Content-Type-Options" content="nosniff" />
				
				{/* Referrer Policy */}
				<meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
				
				{/* Permissions Policy */}
				<meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
				
				{/* Prevents browsers from unnecessarily downloading SRI integrity attributes */}
				<meta httpEquiv="Origin-Trial" content="script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" />
				
				{/* Font preloading */}
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
				<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
