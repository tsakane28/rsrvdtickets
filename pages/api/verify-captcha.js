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
    // Get the CAPTCHA response token from the request body
    const { captchaValue } = req.body;

    // Secret key from environment variable
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY is not defined in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    // Send verification request to Google reCAPTCHA
    const verificationURL = 'https://www.google.com/recaptcha/api/siteverify';
    const response = await fetch(verificationURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: captchaValue
      })
    });

    // Parse the response
    const data = await response.json();

    // Log verification result (excluding the secret key)
    console.log('CAPTCHA verification result:', {
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      timestamp: new Date().toISOString()
    });

    // Check if verification was successful
    if (!data.success) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA verification failed',
        errors: data['error-codes']
      });
    }

    // For reCAPTCHA v3, also check the score
    if (data.score !== undefined && data.score < 0.5) {
      console.warn(`Low CAPTCHA score: ${data.score}`);
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA verification score too low'
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
  validateRequest(captchaSchema)(handler)
); 