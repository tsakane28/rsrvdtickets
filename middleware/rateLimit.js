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
export const ticketRateLimiter = (handler) => {
  // Store rate limit data in memory (simple implementation)
  // Note: This is reset on serverless function cold starts
  const ipRequests = new Map();
  
  return async (req, res) => {
    // Get client IP
    const clientIp = 
      req.headers['x-forwarded-for']?.split(',').shift() || 
      req.socket?.remoteAddress ||
      'unknown';
    
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 30; // Max requests per window
    
    // Get existing requests data for this IP or create new entry
    const ipData = ipRequests.get(clientIp) || { count: 0, resetTime: now + windowMs };
    
    // If window has expired, reset the counter
    if (now > ipData.resetTime) {
      ipData.count = 0;
      ipData.resetTime = now + windowMs;
    }
    
    // Increment request count
    ipData.count += 1;
    ipRequests.set(clientIp, ipData);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - ipData.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(ipData.resetTime / 1000));
    
    // If rate limit exceeded
    if (ipData.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.'
      });
    }
    
    // Continue to the actual handler
    return handler(req, res);
  };
}; 