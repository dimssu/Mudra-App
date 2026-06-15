import jwt from 'jsonwebtoken';
import { redisClient } from '../config/redis';
import { logger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  logger.error('JWT_SECRET is not defined');
  process.exit(1);
}

const REFRESH_TOKEN_EXPIRY = '7d';

/** Optional profile claims for downstream apps (e.g. Saved Spark user provisioning). */
export interface JwtUserClaims {
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface TokenPayload {
  userId: string;
  appId: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

export function buildTokenClaimsFromUser(user: {
  email: string;
  displayName?: string;
  first_name?: string;
  last_name?: string;
  photoURL?: string;
  profile_picture_url?: string;
}): JwtUserClaims {
  const fromParts = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  const displayName =
    user.displayName?.trim() || (fromParts.length > 0 ? fromParts : undefined);
  const avatarUrl = user.photoURL || user.profile_picture_url;
  return {
    email: user.email,
    ...(displayName ? { displayName } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
  };
}

export const generateTokens = async (
  userId: string,
  appId: string,
  claims?: JwtUserClaims
) => {
  const payload: TokenPayload = {
    userId,
    appId,
    ...(claims?.email ? { email: claims.email } : {}),
    ...(claims?.displayName ? { displayName: claims.displayName } : {}),
    ...(claims?.avatarUrl ? { avatarUrl: claims.avatarUrl } : {}),
  };

  // Access token never expires
  const accessToken = jwt.sign(payload, JWT_SECRET);

  const refreshToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  // Redis key namespaced by appId — same user can have independent sessions per app
  try {
    await redisClient.set(`access_token:${appId}:${userId}`, accessToken);
  } catch (error) {
    logger.warn(
      `Failed to store access token in Redis for user ${userId} app ${appId}: ` +
      `${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string): Promise<TokenPayload & Record<string, any>> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded as TokenPayload & Record<string, any>);
    });
  });
};
