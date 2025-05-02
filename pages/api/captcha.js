import { withSession } from '../../middleware/sessionMiddleware';
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
    console.log('Request origin:', req.headers.origin || 'No origin');
    console.log('Request host:', req.headers.host || 'No host');
    
    // Handle content negotiation based on accept header
    const acceptHeader = req.headers.accept || '';
    const preferJson = req.query.format === 'json' || acceptHeader.includes('application/json');
    
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
    
    // Log captcha text for debugging
    console.log('Generated CAPTCHA text:', captcha.text);

    // Store the CAPTCHA text in session
    req.session.captchaText = captcha.text;
    await new Promise((resolve) => req.session.save(resolve));
    
    // Double-check that the value was stored
    console.log('Stored in session:', req.session.captchaText);
    
    // If JSON format is requested, return text and image data as JSON
    if (preferJson) {
      // Don't expose the actual CAPTCHA text in production
      const isDev = process.env.NODE_ENV !== 'production';
      
      return res.status(200).json({
        success: true,
        image: captcha.data,
        // Only include the text in development mode
        text: isDev ? captcha.text : undefined,
        sessionId: req.session.id
      });
    }
    
    // Otherwise send as SVG image
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // CORS headers for image
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Send the SVG image directly
    return res.status(200).send(captcha.data);
  } catch (error) {
    console.error('Error generating CAPTCHA:', error);
    
    // Check if JSON is preferred
    if (req.query.format === 'json' || (req.headers.accept || '').includes('application/json')) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate CAPTCHA'
      });
    }
    
    // Return a simple error SVG for image requests
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