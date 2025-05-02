import { ticketRateLimiter } from '../../../middleware/rateLimit';

export const config = {
  api: {
    bodyParser: true,
  },
};

const handler = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://rsrvdtickets.com' 
    : 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Missing token' });
    }

    // In a real implementation, you would:
    // 1. Decrypt the token using a server-side secret
    // 2. Verify it hasn't been tampered with
    // 3. Check if it's expired
    
    // Simple validation for demo purposes
    try {
      const tokenData = JSON.parse(atob(token));
      
      // Verify the token hasn't expired (30 minute max)
      const currentTime = Date.now();
      const tokenTime = tokenData.timestamp;
      
      if (!tokenTime || currentTime - tokenTime > 30 * 60 * 1000) {
        console.log('Shape CAPTCHA token expired');
        return res.status(400).json({ 
          success: false, 
          message: 'CAPTCHA expired, please try again' 
        });
      }

      console.log('Shape CAPTCHA token valid');
      
      // Token is valid
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Invalid shape CAPTCHA token:', error);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification token' 
      });
    }
  } catch (error) {
    console.error('Shape CAPTCHA verification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during verification' 
    });
  }
};

export default ticketRateLimiter(handler); 