import LRU from 'lru-cache';

// Create cache instance for storing rate limit data
const rateLimit = new LRU({
  max: 5000, // Maximum size of cache
  ttl: 60 * 1000, // Default TTL (time to live) in milliseconds
});

/**
 * Rate limiting middleware factory for Next.js API routes
 * @param {Object} options - Rate limiting options
 * @param {number} options.limit - Maximum number of requests allowed in the window
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {string} options.keyGenerator - Function to generate a unique key for the request (defaults to IP address)
 * @returns {Function} - Next.js API middleware function
 */
export const rateLimiter = (options = {}) => {
  const {
    limit = 60, // Default 60 requests
    windowMs = 60 * 1000, // Default 1 minute
    keyGenerator = (req) => {
      // Default key is IP + route
      const ip = req.headers['x-forwarded-for'] || 
                 req.connection.remoteAddress ||
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
      
      // Get current request count
      const tokenCount = rateLimit.get(key) || 0;
      
      // Check if they've exceeded their limit
      if (tokenCount >= limit) {
        console.warn(`Rate limit exceeded for ${key}`);
        
        // Set rate limit headers
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Date.now() + windowMs);
        
        return res.status(statusCode).json({
          success: false,
          message,
        });
      }
      
      // Update token count and expiry
      rateLimit.set(key, tokenCount + 1, { ttl: windowMs });
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - tokenCount - 1));
      
      // Continue to the handler
      return handler(req, res);
    };
  };
};

/**
 * Specialized rate limiter for login attempts
 * More strict limits for login to prevent brute force
 */
export const loginRateLimiter = rateLimiter({
  limit: 5, // 5 attempts
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many login attempts, please try again later',
  keyGenerator: (req) => {
    // Use email as part of key for login attempts
    const ip = req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress || 
               'unknown-ip';
    const email = req.body.email || 'unknown-email';
    return `login-${ip}-${email}`;
  }
});

/**
 * Specialized rate limiter for payment verification
 * Moderate protection for payment endpoints
 */
export const paymentRateLimiter = rateLimiter({
  limit: 30, // 30 attempts
  windowMs: 5 * 60 * 1000, // 5 minutes
  message: 'Too many payment requests, please try again later',
});

/**
 * Specialized rate limiter for ticket verification
 * Moderate protection for verification endpoints
 */
export const ticketRateLimiter = rateLimiter({
  limit: 20, // 20 attempts
  windowMs: 2 * 60 * 1000, // 2 minutes
  message: 'Too many verification attempts, please try again later',
}); 