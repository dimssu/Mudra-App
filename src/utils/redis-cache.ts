import { redisClient, isRedisConnected } from '../config/redis';
import { logger } from './logger';

export class RedisCache {
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redisClient.setex(key, ttl, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
    } catch (error) {
      // Log error but don't throw - allow app to continue if Redis is unavailable
      logger.warn(`Redis cache set failed for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw - caching is not critical, app should continue to function
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      // Log error but return null - cache miss is acceptable
      logger.warn(`Redis cache get failed for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      // Log error but don't throw - deletion failure is not critical
      logger.warn(`Redis cache delete failed for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 