import session from 'express-session';
import { parse } from 'cookie';

const SESSION_SECRET = process.env.SESSION_SECRET || '8c14a5c7bc4dc7b624df94f93effa546';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Express session middleware configured for Next.js API routes
 */
export const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: isProduction, // Use secure cookies in production
    httpOnly: true,
    maxAge: 60 * 60 * 1000, // 1 hour
    sameSite: 'lax' // Changed from 'strict' to 'lax' for better compatibility
  }
});

/**
 * Wrapper function to enable session in Next.js API routes
 * @param {Function} handler - The API route handler
 * @returns {Function} - Enhanced handler with session support
 */
export const withSession = (handler) => {
  return async (req, res) => {
    // For GET requests to captcha endpoint, ensure proper headers
    if (req.method === 'GET' && req.url.startsWith('/api/captcha')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    return new Promise((resolve, reject) => {
      sessionMiddleware(req, res, (result) => {
        if (result instanceof Error) {
          console.error('Session middleware error:', result);
          return reject(result);
        }
        
        return resolve(handler(req, res));
      });
    });
  };
};

/**
 * Set a value in the session
 * @param {Object} req - Express request object
 * @param {string} key - Session key
 * @param {any} value - Value to store
 */
export const setSessionValue = (req, key, value) => {
  if (!req.session) {
    console.warn('Session not initialized. Make sure to use withSession middleware.');
    return Promise.resolve(); // Return a resolved promise even if there's an issue
  }
  
  req.session[key] = value;
  
  // Save session explicitly
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return reject(err);
      }
      resolve();
    });
  });
};

/**
 * Get a value from the session
 * @param {Object} req - Express request object
 * @param {string} key - Session key
 * @returns {any} - Stored value or undefined
 */
export const getSessionValue = (req, key) => {
  if (!req.session) {
    console.warn('Session not initialized. Make sure to use withSession middleware.');
    return undefined;
  }
  
  return req.session[key];
}; 