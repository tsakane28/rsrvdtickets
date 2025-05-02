import svgCaptcha from 'svg-captcha';
import { ticketRateLimiter } from '../../middleware/rateLimit';
import crypto from 'crypto';

// Secret key for CAPTCHA solution encryption
const CAPTCHA_SECRET = process.env.SESSION_SECRET || '8c14a5c7bc4dc7b624df94f93effa546';

/**
 * Generate a CAPTCHA SVG image without relying on sessions
 * Instead, encrypts the solution and passes it as a token
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
      size: 4, // Reduced size for better readability 
      ignoreChars: '0o1ilI', // Exclude ambiguous characters
      noise: 1, // Less noise for better readability
      color: false, // No color for better compatibility
      width: 150,
      height: 50,
      fontSize: 40,
      background: '#f0f0f0' // Light gray background
    });
    
    // Create a timestamp to limit the validity of the CAPTCHA
    const timestamp = Date.now();
    
    // Create a token containing the encrypted CAPTCHA solution
    const token = encryptCaptchaSolution(captcha.text, timestamp);
    
    // Debug log (without exposing solution in production)
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log('Alt CAPTCHA generated:', captcha.text, 'Token:', token);
    }
    
    // Check if JSON response is preferred
    if (req.query.format === 'json') {
      return res.status(200).json({
        success: true,
        image: captcha.data,
        token: token,
        text: isDev ? captcha.text : undefined // Only in dev mode
      });
    }
    
    // Set headers for the SVG response
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Captcha-Token', token);
    
    // Send the SVG data
    return res.status(200).send(captcha.data);
  } catch (error) {
    console.error('Error generating alt CAPTCHA:', error);
    
    // Return simple error response
    if (req.query.format === 'json') {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate CAPTCHA'
      });
    }
    
    // Return simple error SVG
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

/**
 * Encrypt the CAPTCHA solution with a timestamp to prevent reuse
 * @param {string} solution - The CAPTCHA solution to encrypt
 * @param {number} timestamp - Current timestamp
 * @returns {string} - Encrypted token
 */
function encryptCaptchaSolution(solution, timestamp) {
  try {
    // Create a payload with the solution and timestamp
    const payload = JSON.stringify({
      solution: solution.toLowerCase(), // Store lowercase for case-insensitive comparison
      timestamp: timestamp,
      expires: timestamp + 15 * 60 * 1000 // 15 minutes expiry
    });
    
    // Create an initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create a cipher with the secret key and IV
    const key = crypto.createHash('sha256').update(CAPTCHA_SECRET).digest('base64').substring(0, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // Encrypt the payload
    let encrypted = cipher.update(payload, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Combine the IV and encrypted data
    return `${iv.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting CAPTCHA solution:', error);
    // Return a dummy token in case of error
    return 'error';
  }
}

export default ticketRateLimiter(handler); 