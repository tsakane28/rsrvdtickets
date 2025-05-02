import { ticketRateLimiter } from '../../middleware/rateLimit';
import crypto from 'crypto';

// Secret key for CAPTCHA solution encryption
const CAPTCHA_SECRET = process.env.SESSION_SECRET || '8c14a5c7bc4dc7b624df94f93effa546';

/**
 * Verify a CAPTCHA solution with the provided token
 */
const handler = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false,
        message: 'Method not allowed' 
      });
    }

    // Get the CAPTCHA solution and token from the request
    const { captcha, token } = req.body;
    
    // Validate inputs
    if (!captcha || !token) {
      return res.status(400).json({ 
        success: false,
        message: 'CAPTCHA solution and token are required' 
      });
    }
    
    // Log the verification attempt
    console.log('Verifying alt CAPTCHA:', {
      captchaFromUser: captcha,
      token: token
    });
    
    // Decrypt the token to get the actual solution
    const decrypted = decryptCaptchaSolution(token);
    
    // If decryption failed, return an error
    if (!decrypted) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CAPTCHA token'
      });
    }
    
    // Check if the CAPTCHA has expired
    if (decrypted.expires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA has expired'
      });
    }
    
    // Compare the user's solution with the decrypted solution (case-insensitive)
    const isValid = decrypted.solution === captcha.toLowerCase();
    
    // Return the result
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
    console.error('Error verifying alt CAPTCHA:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Decrypt a CAPTCHA token to get the original solution
 * @param {string} token - The encrypted token
 * @returns {Object|null} - The decrypted payload or null if invalid
 */
function decryptCaptchaSolution(token) {
  try {
    // Split the token into IV and encrypted data
    const [ivString, encrypted] = token.split(':');
    
    if (!ivString || !encrypted) {
      console.error('Invalid token format');
      return null;
    }
    
    // Convert the IV back to a Buffer
    const iv = Buffer.from(ivString, 'base64');
    
    // Create the decipher with the same key and IV
    const key = crypto.createHash('sha256').update(CAPTCHA_SECRET).digest('base64').substring(0, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Parse the decrypted JSON
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting CAPTCHA token:', error);
    return null;
  }
}

export default ticketRateLimiter(handler); 