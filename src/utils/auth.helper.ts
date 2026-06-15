import crypto from 'crypto';
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
  appId: string,
  expiresInDays: number = 7
): Promise<void> {
  const tokenFamily = crypto.randomUUID();

  await RefreshToken.create({
    userId: user._id,
    token: tokens.refreshToken,
    family: tokenFamily,
    appId,
    expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
  });

  // User cache is app-agnostic (users are global across apps)
  await RedisCache.set(`user:${user._id}`, {
    id: user._id,
    email: user.email,
    role: user.role,
  });
}
