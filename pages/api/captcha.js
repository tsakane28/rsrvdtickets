import { withSession, setSessionValue } from '../../middleware/sessionMiddleware';
import svgCaptcha from 'svg-captcha';
import { ticketRateLimiter } from '../../middleware/rateLimit';

/**
 * Generate a CAPTCHA SVG image and store the solution in the session
 */
const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    // Log session information
    console.log('Session ID:', req.session?.id || 'Not available');
    console.log('Headers:', JSON.stringify(req.headers));
    
    // Generate CAPTCHA with svg-captcha (simpler options for better compatibility)
    const captcha = svgCaptcha.create({
      size: 4, // Reduced size for better readability
      ignoreChars: '0o1ilI', // Exclude more ambiguous characters
      noise: 1, // Less noise for better readability
      color: false, // No color for better compatibility
      width: 150,
      height: 50,
      fontSize: 40,
      background: '#f0f0f0' // Light gray background
    });
    
    // Log captcha text for debugging (remove in production)
    console.log('Generated CAPTCHA text:', captcha.text);

    // Store the CAPTCHA text in session
    req.session.captchaText = captcha.text;
    await new Promise((resolve) => req.session.save(resolve));
    
    // Double-check that the value was stored
    console.log('Stored in session:', req.session.captchaText);
    
    // Ensure proper content type and cache headers
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Send the SVG image directly
    return res.status(200).send(captcha.data);
  } catch (error) {
    console.error('Error generating CAPTCHA:', error);
    // Return a simple error SVG instead of JSON for image requests
    const errorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50">
      <rect width="200" height="50" fill="#f8d7da"/>
      <text x="10" y="30" font-family="Arial" font-size="12" fill="#721c24">
        Error loading CAPTCHA
      </text>
    </svg>`;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(errorSvg);
  }
};

// Apply rate limiting before session handling
export default ticketRateLimiter(
  withSession(handler)
); 