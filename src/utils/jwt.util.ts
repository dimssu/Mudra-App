import jwt from 'jsonwebtoken';
import { redisClient } from '../config/redis';
import { logger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  logger.error('JWT_SECRET is not defined');
  process.exit(1);
}
// const ACCESS_TOKEN_EXPIRY = '15m'; // Access tokens now never expire
const REFRESH_TOKEN_EXPIRY = '7d';

export const generateTokens = async (userId: string) => {
  // Access token never expires - no expiresIn option
  const accessToken = jwt.sign({ userId }, JWT_SECRET);

  const refreshToken = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  // Store access token in Redis without expiration
  try {
    await redisClient.set(
      `access_token:${userId}`,
      accessToken
    );
  } catch (error) {
    // Log warning but don't throw - token generation should succeed even if Redis is unavailable
    logger.warn(`Failed to store access token in Redis for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}; 