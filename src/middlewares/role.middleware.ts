import { Request, Response, NextFunction } from 'express';
import { IUser, User } from '../models/User';
import { logger } from '../utils/logger';
import { RedisCache } from '../utils/redis-cache';

export const Roles = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await RedisCache.get<IUser>(`user:${req.user?.id}`);
      
      if (!user) {
        const dbUser = await User.findById(req.user?.id);
        if (!dbUser) {
          return res.status(404).json({ error: 'User not found' });
        }
        await RedisCache.set(`user:${req.user?.id}`, dbUser);
      }

      if (!roles.includes(user?.role as string)) {
        logger.warn(`Unauthorized access attempt by user ${user?.id} with role ${user?.role}`);
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      logger.error('Role middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/** Allows request if user is acting on themselves (req.params.id === req.user.id) OR has one of the specified roles */
export const requireRoleOrSelf = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.user?.id;

      if (targetUserId && currentUserId && String(targetUserId) === String(currentUserId)) {
        return next();
      }

      return requireRole(roles)(req, res, next);
    } catch (error) {
      logger.error('Role middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}; 