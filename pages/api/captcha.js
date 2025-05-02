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
    // Generate CAPTCHA with svg-captcha
    const captcha = svgCaptcha.create({
      size: 6, // CAPTCHA length
      ignoreChars: '0o1il', // Exclude ambiguous characters
      noise: 3, // Number of noise lines
      color: true, // Random colors
      width: 200,
      height: 100,
      fontSize: 60
    });

    // Store the CAPTCHA text in session
    await setSessionValue(req, 'captchaText', captcha.text);
    
    // Log CAPTCHA generation (not the solution)
    console.log('CAPTCHA generated for session:', req.session.id);

    // Send the SVG image directly
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(200).send(captcha.data);
  } catch (error) {
    console.error('Error generating CAPTCHA:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate CAPTCHA'
    });
  }
};

// Apply session middleware and rate limiting
export default ticketRateLimiter(
  withSession(handler)
); 