// Simple rate limiter for API routes - no external dependencies
// This avoids compatibility issues in serverless environments

// In-memory storage for rate limiting (resets on cold starts)
const ipRequests = new Map();

/**
 * Create a rate limiter for API routes
 * @param {Object} options - Rate limiting options
 * @returns {Function} - Middleware function
 */
export const rateLimiter = (options = {}) => {
  const {
    limit = 60, // Default 60 requests
    windowMs = 60 * 1000, // Default 1 minute
    keyGenerator = (req) => {
      // Default key is IP + route
      const ip = req.headers['x-forwarded-for']?.split(',').shift() || 
                req.socket?.remoteAddress ||
                'unknown-ip';
      return `${ip}-${req.url}`;
    },
    message = 'Too many requests, please try again later',
    statusCode = 429, // Too Many Requests
  } = options;
  
  return (handler) => {
    return async (req, res) => {
      // Generate unique identifier for this client
      const key = keyGenerator(req);
      const now = Date.now();
      
      // Get or create rate limit data for this key
      const currentData = ipRequests.get(key) || { 
        count: 0, 
        resetTime: now + windowMs 
      };
      
      // Reset if the window has expired
      if (now > currentData.resetTime) {
        currentData.count = 0;
        currentData.resetTime = now + windowMs;
      }
      
      // Increment count
      currentData.count++;
      ipRequests.set(key, currentData);
      
      // Check if they've exceeded their limit
      if (currentData.count > limit) {
        console.warn(`Rate limit exceeded for ${key}`);
        
        // Set rate limit headers
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil(currentData.resetTime / 1000));
        
        return res.status(statusCode).json({
          success: false,
          message,
        });
      }
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - currentData.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(currentData.resetTime / 1000));
      
      // Continue to the handler
      return handler(req, res);
    };
  };
};

/**
 * Specialized rate limiter for login attempts
 */
export const loginRateLimiter = rateLimiter({
  limit: 5, // 5 attempts
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many login attempts, please try again later',
  keyGenerator: (req) => {
    // Use email as part of key for login attempts
    const ip = req.headers['x-forwarded-for']?.split(',').shift() || 
              req.socket?.remoteAddress || 
              'unknown-ip';
    const email = req.body?.email || 'unknown-email';
    return `login-${ip}-${email}`;
  }
});

/**
 * Specialized rate limiter for payment verification
 */
export const paymentRateLimiter = rateLimiter({
  limit: 30, // 30 attempts
  windowMs: 5 * 60 * 1000, // 5 minutes
  message: 'Too many payment requests, please try again later',
});

/**
 * Specialized rate limiter for ticket and CAPTCHA verification
 */
export const ticketRateLimiter = rateLimiter({
  limit: 30, // 30 attempts 
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many requests, please try again later.'
}); 