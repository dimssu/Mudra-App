import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

// Define rate limit configurations for different endpoints
// window: time period in seconds
// max: maximum number of requests allowed in the window
const RATE_LIMITS = {
  login: { window: 300, max: 5 },
  register: { window: 3600, max: 3 },
  refreshToken: { window: 300, max: 10 }
};

// Middleware factory function that creates a rate limiter for specified endpoint
export const rateLimiter = (endpoint: keyof typeof RATE_LIMITS) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get client's IP address
      const ip = req.ip;
      // Create unique Redis key combining endpoint and IP
      const key = `rateLimit:${endpoint}:${ip}`;
      // Get rate limit settings for the endpoint
      const { window, max } = RATE_LIMITS[endpoint];
      
      // Increment request counter in Redis
      // If key doesn't exist, it's created and set to 1
      const requests: any = await redisClient.incr(key);
      
      // If this is the first request, set the expiration time
      if (requests === 1) {
        await redisClient.expire(key, window);
      }

      // If request count exceeds limit, return 429 Too Many Requests
      if (requests > max) {
        logger.warn(`Rate limit exceeded for IP: ${ip} on ${endpoint}`);
        return res.status(429).json({
          error: 'Too many requests, please try again later.',
          retryAfter: await redisClient.ttl(key), // Time remaining until limit resets
        });
      }

      // If within limits, proceed to next middleware
      next();
    } catch (error) {
      // Log any Redis errors but allow request to proceed
      logger.error('Rate limiter error:', error);
      next();
    }
  };
}; 