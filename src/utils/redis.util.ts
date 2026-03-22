import { redisClient } from '../config/redis';
import { logger } from './logger';

export class RedisCache {
  private static DEFAULT_TTL = 3600; // 1 hour in seconds

  static async set(key: string, value: any, ttl: number = RedisCache.DEFAULT_TTL): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await redisClient.setex(key, ttl, serializedValue);
    } catch (error) {
      logger.error('Redis cache set error:', error);
      throw error;
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis cache get error:', error);
      throw error;
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Redis cache delete error:', error);
      throw error;
    }
  }
} 