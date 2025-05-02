import { withSession, getSessionValue } from '../../middleware/sessionMiddleware';
import { ticketRateLimiter } from '../../middleware/rateLimit';
import { validateRequest } from '../../middleware/validateRequest';
import Joi from 'joi';

// Validation schema for CAPTCHA verification
const captchaSchema = Joi.object({
  captchaValue: Joi.string().required().trim()
});

// Main handler logic
const handler = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Get the CAPTCHA solution from the request body
    const { captchaValue } = req.body;

    // Get the stored CAPTCHA text from the session
    const sessionCaptchaText = getSessionValue(req, 'captchaText');
    
    if (!sessionCaptchaText) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA session expired or not found'
      });
    }

    // Case-insensitive comparison of the CAPTCHA solution
    const isValid = sessionCaptchaText.toLowerCase() === captchaValue.toLowerCase();

    // Log verification result (without exposing the actual solution)
    console.log('CAPTCHA verification:', isValid ? 'success' : 'failed', 'for session:', req.session.id);

    // Clear the CAPTCHA text from session after verification (one-time use)
    req.session.captchaText = null;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA verification failed'
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'CAPTCHA verification successful'
    });
  } catch (error) {
    console.error('Error verifying CAPTCHA:', error);
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred while verifying CAPTCHA'
    });
  }
};

// Apply middlewares
export default ticketRateLimiter(
  validateRequest(captchaSchema)(
    withSession(handler)
  )
); 