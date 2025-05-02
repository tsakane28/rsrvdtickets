import { withSession } from '../../middleware/sessionMiddleware';
import { ticketRateLimiter } from '../../middleware/rateLimit';

/**
 * Verify if the provided CAPTCHA solution matches the one in session
 */
const handler = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false,
        message: 'Method not allowed' 
      });
    }

    // Validate the input
    const { captcha } = req.body;
    if (!captcha) {
      return res.status(400).json({ 
        success: false,
        message: 'CAPTCHA solution is required' 
      });
    }

    // Log for debugging
    console.log('Verifying CAPTCHA session data:', { 
      captchaFromUser: captcha,
      captchaInSession: req.session?.captchaText || 'Not found in session',
      sessionId: req.session?.id || 'No session ID'
    });

    // Check if CAPTCHA session exists
    const sessionCaptcha = req.session?.captchaText;
    if (!sessionCaptcha) {
      return res.status(400).json({ 
        success: false,
        message: 'CAPTCHA session expired or not found' 
      });
    }

    // Verify CAPTCHA (case-insensitive)
    const isValid = sessionCaptcha.toLowerCase() === captcha.toLowerCase();

    // Clear the CAPTCHA from session either way (one-time use)
    req.session.captchaText = null;
    await new Promise(resolve => req.session.save(resolve));
    
    // Return verification result
    if (isValid) {
      return res.status(200).json({ 
        success: true,
        message: 'CAPTCHA verified successfully' 
      });
    } else {
      return res.status(400).json({ 
        success: false,
        message: 'Incorrect CAPTCHA solution' 
      });
    }
  } catch (error) {
    console.error('Error verifying CAPTCHA:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

// Apply rate limiting before session handling
export default ticketRateLimiter(
  withSession(handler)
); 