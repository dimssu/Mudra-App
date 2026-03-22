import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { generateTokens, verifyToken } from '../utils/jwt.util';
import { redisClient } from '../config/redis';
import { AuthenticationError, ValidationError } from '../utils/errors';
import { RedisCache } from '../utils/redis-cache';
import { verifyIdToken, getUserDetails } from '../utils/firebase.utils';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

import { storeTokenAndCacheUser } from '../utils/auth.helper';

export default class AuthService {

  static async getAccessWithGoogle(idToken: string){
    try {
      const decodedToken = await verifyIdToken(idToken);
      const uid = decodedToken.uid;

      const userDetails = await getUserDetails(uid);

      if (!userDetails) {
        throw new AuthenticationError('Unable to fetch user details from Google');
      }

      let user: IUser | null = await User.findOne({ email: userDetails.email });

      if (!user) {
        // New user - create account with Google details
        user = new User({ 
          email: userDetails.email, 
          authMethod: "google",
          googleId: uid,
          displayName: userDetails.displayName || '',
          first_name: userDetails.displayName?.split(' ')[0] || '',
          last_name: userDetails.displayName?.split(' ').slice(1).join(' ') || '',
          photoURL: userDetails.photoURL || '',
          profile_picture_url: userDetails.photoURL || '',
          emailVerified: userDetails.emailVerified || false,
          isVerified: userDetails.emailVerified || false,
        });
        await user.save();
      } else {
        // Existing user - update Google details if they signed up with email/password before
        if (user.authMethod === 'email/password') {
          user.authMethod = 'google';
        }
        user.googleId = uid;
        user.displayName = userDetails.displayName || user.displayName;
        user.photoURL = userDetails.photoURL || user.photoURL;
        user.profile_picture_url = userDetails.photoURL || user.profile_picture_url;
        user.emailVerified = userDetails.emailVerified || user.emailVerified;
        if (userDetails.emailVerified) {
          user.isVerified = true;
        }
        await user.save();
      }

      const { accessToken, refreshToken } = await generateTokens(user._id.toString());
      const tokenFamily = crypto.randomUUID();
      
      await RefreshToken.create({
        userId: user._id,
        token: refreshToken,
        family: tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await RedisCache.set(`user:${user._id}`, {
        id: user._id,
        email: user.email,
        role: user.role,
      });

      return { 
        accessToken, 
        refreshToken, 
        user: { 
          id: user._id, 
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          first_name: user.first_name,
          last_name: user.last_name,
        } 
      };
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Google authentication failed: ' + error.message);
    }
  }

  static async register(email: string, password: string, userData: Partial<IUser> = {}) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    // Check if userName is provided and if it's already taken
    if (userData.userName) {
      const existingUserName = await User.findOne({ userName: userData.userName });
      if (existingUserName) {
        throw new ValidationError('Username already taken');
      }
    }

    // Create user with additional fields
    const user = new User({ 
      email, 
      password, 
      authMethod: "email/password",
      ...userData
    });
    
    await user.save();

    const { accessToken, refreshToken } = await generateTokens(user._id.toString());
    await storeTokenAndCacheUser(user, { accessToken, refreshToken });

    return { 
      accessToken, 
      refreshToken, 
      user: { 
        id: user._id, 
        email: user.email,
        userName: user.userName,
        first_name: user.first_name,
        last_name: user.last_name
      } 
    };
  }

  static async login(email: string, password: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    const { accessToken, refreshToken } = await generateTokens(user._id.toString());
    await storeTokenAndCacheUser(user, { accessToken, refreshToken });

    return { accessToken, refreshToken, user: { id: user._id, email: user.email } };
  }

  static async refreshToken(token: string) {
    const storedToken = await RefreshToken.findOne({ 
      token: crypto.createHash('sha256').update(token).digest('hex'),
      isRevoked: false 
    });

    if (!storedToken) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Revoke all refresh tokens in the same family to prevent reuse
    await RefreshToken.updateMany(
      { family: storedToken.family },
      { isRevoked: true }
    );

    const { accessToken, refreshToken } = await generateTokens(storedToken.userId.toString());
    
    // Create new refresh token with new family
    await RefreshToken.create({
      userId: storedToken.userId,
      token: refreshToken,
      family: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken };
  }

  static async logout(userId: string) {
    await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true }
    );
    try {
      await redisClient.del(`access_token:${userId}`);
    } catch (error) {
      // Log warning but don't throw - logout should succeed even if Redis is unavailable
      logger.warn(`Failed to delete access token from Redis for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async verifyToken(accessToken: string) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET as string
      const decodedToken = jwt.verify(accessToken, JWT_SECRET)
      return decodedToken
    } catch (error) {
      throw new AuthenticationError('Invalid token')
    }
  }
} 