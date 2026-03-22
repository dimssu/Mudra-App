import crypto from 'crypto';
import { Types } from 'mongoose';
import { RedisCache } from './redis-cache';
import { RefreshToken } from '../models/RefreshToken';
import { IUser } from '../models/User';

interface TokenData {
  accessToken: string;
  refreshToken: string;
}

export async function storeTokenAndCacheUser(
  user: IUser,
  tokens: TokenData,
  expiresInDays: number = 7
): Promise<void> {
  const tokenFamily = crypto.randomUUID();
  
  await RefreshToken.create({
    userId: user._id,
    token: tokens.refreshToken,
    family: tokenFamily,
    expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
  });

  // Cache user data in Redis
  await RedisCache.set(`user:${user._id}`, {
    id: user._id,
    email: user.email,
    role: user.role,
  });
} 