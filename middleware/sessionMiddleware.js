// This file is kept for compatibility with existing code but no longer used for CAPTCHA
// We're using a token-based approach instead of sessions for the puzzle CAPTCHA

const SESSION_SECRET = process.env.SESSION_SECRET || '8c14a5c7bc4dc7b624df94f93effa546';
const isProduction = process.env.NODE_ENV === 'production';
const VERCEL_ENV = process.env.VERCEL_ENV || 'development';
const isVercel = !!process.env.VERCEL;

/**
 * Simple middleware wrapper that doesn't actually use sessions
 * @param {Function} handler - The API route handler
 * @returns {Function} - The handler without session modification
 */
export const withSession = (handler) => {
  return async (req, res) => {
    // Add CORS headers for API requests
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Special handling for OPTIONS requests (preflight)
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Simply call the handler directly without session processing
    return handler(req, res);
  };
};

// These functions are kept for backward compatibility
export const setSessionValue = (req, key, value) => {
  console.warn('Session functionality is deprecated');
  return Promise.resolve();
};

export const getSessionValue = (req, key) => {
  console.warn('Session functionality is deprecated');
  return undefined;
}; 