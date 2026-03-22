import { logger } from '../utils/logger';
import Redis from 'ioredis';

// Track connection state to avoid log flooding
let connectionAttempts = 0;
let isConnected = false;
let lastErrorLogTime = 0;
const ERROR_LOG_INTERVAL = 60000; // Log errors at most once per minute

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  lazyConnect: true, // Don't connect immediately, connect on first command
  maxRetriesPerRequest: 3, // Limit retries per request
  retryStrategy: (times) => {
    // Stop retrying after 3 attempts since app can run without Redis
    if (times > 3) {
      const now = Date.now();
      // Only log error once per minute to avoid log flooding
      if (now - lastErrorLogTime > ERROR_LOG_INTERVAL) {
        logger.warn(
          `Redis connection failed after ${times} attempts. Application will continue without Redis. Please check if Redis is running and accessible at ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}.`
        );
        lastErrorLogTime = now;
      }
      // Return null to stop retrying
      return null;
    }
    // Retry with increasing delays for first 3 attempts
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect only if error is READONLY, otherwise don't reconnect
      return true;
    }
    return false;
  },
});

redisClient.on('error', (error) => {
  const now = Date.now();
  // Only log errors once per minute to prevent log flooding
  if (now - lastErrorLogTime > ERROR_LOG_INTERVAL) {
    logger.error(`Redis Client Error: ${error.message}`);
    lastErrorLogTime = now;
  }
  isConnected = false;
});

redisClient.on('connect', () => {
  connectionAttempts = 0;
  isConnected = true;
  logger.info('Successfully connected to Redis');
});

redisClient.on('close', () => {
  isConnected = false;
  logger.warn('Redis connection closed');
});

redisClient.on('ready', () => {
  isConnected = true;
  logger.info('Redis client is ready');
});

// Helper function to check if Redis is available
export const isRedisConnected = (): boolean => {
  return isConnected && redisClient.status === 'ready';
};

// Helper function to safely execute Redis commands with fallback
export const safeRedisCommand = async <T>(
  command: () => Promise<T>,
  fallback?: T,
  logError: boolean = true
): Promise<T | undefined> => {
  try {
    if (!isRedisConnected() && redisClient.status !== 'connecting') {
      // Try to connect if not connected
      if (redisClient.status === 'end') {
        await redisClient.connect().catch(() => {
          // Connection failed, will be handled by retry strategy
        });
      }
    }
    return await command();
  } catch (error) {
    if (logError) {
      const now = Date.now();
      if (now - lastErrorLogTime > ERROR_LOG_INTERVAL) {
        logger.error(`Redis command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        lastErrorLogTime = now;
      }
    }
    return fallback;
  }
};

export { redisClient }; 