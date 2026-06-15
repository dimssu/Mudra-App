/**
 * Seed script — run once after initial deployment to create app config entries.
 *
 * Usage:
 *   npx ts-node src/scripts/seed-app-configs.ts
 *
 * Requirements:
 *   - MONGODB_URI env var must be set
 *   - TECHANEWZ_FIREBASE_CREDS env var must be set (base64-encoded service account JSON)
 *   - LAKAWAT_FIREBASE_CREDS env var must be set (base64-encoded service account JSON)
 *   - SAVED_SPARK_FIREBASE_CREDS env var must be set (base64-encoded service account JSON)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { AppConfig } from '../models/AppConfig';
import { logger } from '../utils/logger';

const SEED_CONFIGS = [
  {
    appId: 'techanewz',
    appName: 'TechaNewz',
    allowedOrigins: [
      'https://app.techshup.dimssu.com',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    firebaseCredsEnvKey: 'TECHANEWZ_FIREBASE_CREDS',
    isActive: true,
  },
  {
    appId: 'lakawat',
    appName: 'Lakawat',
    allowedOrigins: [
      'https://app.lakawat.dimssu.com',
      'http://localhost:5174',
      'http://localhost:3001',
    ],
    firebaseCredsEnvKey: 'LAKAWAT_FIREBASE_CREDS',
    isActive: true,
  },
  {
    appId: 'saved-spark',
    appName: 'Saved Spark',
    allowedOrigins: [
      'https://saved-spark-frontend.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5180',
    ],
    firebaseCredsEnvKey: 'SAVED_SPARK_FIREBASE_CREDS',
    isActive: true,
  },
];

/**
 * Creates missing AppConfig rows from SEED_CONFIGS.
 * Expects mongoose to already be connected when called from the server.
 */
export async function seedDefaultAppConfigs(): Promise<number> {
  let created = 0;
  for (const config of SEED_CONFIGS) {
    const existing = await AppConfig.findOne({ appId: config.appId });
    if (existing) {
      logger.info(`AppConfig for "${config.appId}" already exists — skipping`);
      continue;
    }

    if (!process.env[config.firebaseCredsEnvKey]) {
      logger.warn(
        `WARNING: env var "${config.firebaseCredsEnvKey}" is not set. ` +
          `App will be created but Firebase auth won't work until you set it and restart.`
      );
    }

    await AppConfig.create(config);
    logger.info(`Created AppConfig for "${config.appId}"`);
    created += 1;
  }
  return created;
}

async function runCli(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    logger.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  logger.info('Connected to MongoDB for seeding');

  await seedDefaultAppConfigs();

  await mongoose.disconnect();
  logger.info('Seeding complete');
}

if (require.main === module) {
  runCli().catch((err) => {
    logger.error('Seed failed:', err);
    process.exit(1);
  });
}
