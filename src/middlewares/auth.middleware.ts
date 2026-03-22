import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { redisClient } from '../config/redis';
import { User, IUser } from '../models/User';
import { RedisCache } from '../utils/redis-cache';
import { logger } from '../utils/logger';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization 
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);

    // Optional: Check if token is in Redis (only if Redis is available)
    try {
      const storedToken = await redisClient.get(`access_token:${decoded.userId}`);
      if (storedToken && storedToken !== token) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      // If Redis is unavailable, we'll still proceed with JWT verification
    } catch (error) {
      // If Redis check fails, log warning but continue with JWT-only validation
      // This allows the app to function even if Redis is temporarily unavailable
      logger.warn('Redis token validation failed, falling back to JWT-only validation:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Get user from cache or database to include role
    let user = await RedisCache.get<IUser>(`user:${decoded.userId}`);
    if (!user) {
      user = await User.findOne(
        { _id: decoded.userId, isDeleted: { $ne: true } }, 
        { password: 0 }
      );
      if (user) {
        await RedisCache.set(`user:${decoded.userId}`, user);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found or deleted' });
    }

    req.user = { 
      id: decoded.userId,
      role: user.role
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}; 