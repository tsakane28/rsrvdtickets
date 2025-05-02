import Joi from 'joi';

/**
 * Creates a middleware function that validates a request body against a Joi schema
 * @param {Joi.Schema} schema - The Joi schema to validate against
 * @returns {Function} - Express/Next.js middleware function
 */
export const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      // Request body validation against schema
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      
      if (error) {
        // Log validation errors
        console.warn('Validation error:', JSON.stringify(error.details));
        
        // Return formatted validation errors
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }
      
      // Update request with validated data
      req.body = value;
      return next();
    } catch (err) {
      console.error('Request validation error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during validation'
      });
    }
  };
};

/**
 * Common validation schemas for reuse across endpoints
 */
export const ticketVerificationSchema = Joi.object({
  ticketId: Joi.string().required().pattern(/^[a-zA-Z0-9-]{8,36}$/),
  eventId: Joi.string().optional().pattern(/^[a-zA-Z0-9-]{20,36}$/),
  csrfToken: Joi.string().required()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  csrfToken: Joi.string().required()
});

export const paymentUpdateSchema = Joi.object({
  reference: Joi.string().required(),
  paynow_reference: Joi.string().optional(),
  amount: Joi.number().positive().required(),
  status: Joi.string().required(),
  poll_url: Joi.string().uri().optional(),
  hash: Joi.string().optional(),
  phone: Joi.string().optional()
}); 