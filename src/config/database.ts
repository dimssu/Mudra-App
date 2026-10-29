import mongoose from 'mongoose';
import { logger } from '../utils/logger';

/**
 * Connect to MongoDB. Throws on failure so the caller decides what to do:
 * index.ts exits the process; on Vercel the next request retries.
 */
export const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/auth-service';
  try {
    await mongoose.connect(mongoUri, {
      // Serverless instances are short-lived and many can run at once
      ...(process.env.VERCEL ? { maxPoolSize: 5, minPoolSize: 0 } : {}),
      serverSelectionTimeoutMS: 10000,
    });
    logger.info('Successfully connected to MongoDB.');
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    throw error;
  }
};
