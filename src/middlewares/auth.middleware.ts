import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { redisClient } from '../config/redis';
import { User, IUser } from '../models/User';
import { RedisCache } from '../utils/redis-cache';
import { logger } from '../utils/logger';

const DEFAULT_APP_ID = process.env.DEFAULT_APP_ID || 'techanewz';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);

    // Backward compat: old tokens don't have appId — fall back to X-App-ID header or default
    const tokenAppId = decoded.appId || req.appConfig?.appId || DEFAULT_APP_ID;

    // Security: reject cross-app token reuse
    if (req.appConfig && decoded.appId && decoded.appId !== req.appConfig.appId) {
      return res.status(401).json({
        error: `Token was issued for app "${decoded.appId}" but request targets app "${req.appConfig.appId}"`,
      });
    }

    const userId = decoded.userId;

    // Redis check — try new namespaced key first, then legacy key for backward compat
    try {
      const storedToken =
        (await redisClient.get(`access_token:${tokenAppId}:${userId}`)) ||
        (await redisClient.get(`access_token:${userId}`)); // legacy fallback

      if (storedToken && storedToken !== token) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    } catch (error) {
      logger.warn(
        'Redis token validation failed, falling back to JWT-only validation: ' +
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    let user = await RedisCache.get<IUser>(`user:${userId}`);
    if (!user) {
      user = await User.findOne(
        { _id: userId, isDeleted: { $ne: true } },
        { password: 0 }
      );
      if (user) {
        await RedisCache.set(`user:${userId}`, user);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found or deleted' });
    }

    req.user = {
      id: userId,
      role: user.role,
      appId: tokenAppId,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
