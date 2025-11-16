import rateLimit from 'express-rate-limit';

/**
 * Rate limiter middleware
 * Prevents abuse and follows security best practices
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limiter for AI endpoints
 */
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Lower limit for AI operations
  message: 'Too many AI requests, please try again later.',
});

