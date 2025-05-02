import { auth } from '../utils/firebase-admin';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware to verify authentication for protected API routes
 */
export const withAuth = (handler) => {
  return async (req, res) => {
    try {
      // Get the authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Missing or invalid authorization header'
        });
      }
      
      // Extract the token
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: No token provided'
        });
      }
      
      try {
        // Verify the token with Firebase
        const decodedToken = await auth.verifyIdToken(token);
        
        // Add the user to the request
        req.user = decodedToken;
        
        // Continue to the handler
        return handler(req, res);
      } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid token'
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication'
      });
    }
  };
};

/**
 * Middleware to check for API key authentication
 * This is a simpler alternative to JWT for internal/admin API calls
 */
export const withApiKey = (handler) => {
  return async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid API key'
        });
      }
      
      return handler(req, res);
    } catch (error) {
      console.error('API key verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication'
      });
    }
  };
};

/**
 * Combined middleware for either session-based or API key authentication
 * Allows either method to authenticate
 */
export const withAuthOrApiKey = (handler) => {
  return async (req, res) => {
    try {
      // First try API key
      const apiKey = req.headers['x-api-key'];
      if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
        return handler(req, res);
      }
      
      // Then try session/token auth
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Authentication required'
        });
      }
      
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: No token provided'
        });
      }
      
      try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;
        return handler(req, res);
      } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid authentication'
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication'
      });
    }
  };
}; 