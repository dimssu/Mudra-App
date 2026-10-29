import { connectDatabase } from './config/database';
import { AppConfig } from './models/AppConfig';
import { initAllFirebaseApps } from './utils/firebase.utils';
import { seedDefaultAppConfigs } from './scripts/seed-app-configs';
import { logger } from './utils/logger';

let ready: Promise<string[]> | null = null;

/**
 * Connect to MongoDB and initialize Firebase for every active app, once per
 * process. index.ts awaits this before listening; on Vercel, where there is no
 * listen step, app.ts awaits it before the first request. A failed attempt is
 * forgotten so the next request tries again.
 *
 * @returns The appIds that were loaded
 */
export const ensureReady = (): Promise<string[]> => {
  if (!ready) {
    ready = initialize().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
};

const loadActiveAppConfigs = () =>
  AppConfig.find({ isActive: true }).select('appId firebaseCredsEnvKey').lean();

const initialize = async (): Promise<string[]> => {
  await connectDatabase();

  let appConfigs = await loadActiveAppConfigs();

  if (appConfigs.length === 0) {
    logger.warn('No active AppConfig entries found in DB — inserting defaults from seed script.');
    await seedDefaultAppConfigs();
    appConfigs = await loadActiveAppConfigs();
  }

  if (appConfigs.length === 0) {
    logger.warn(
      'No active AppConfig entries found in DB after seed attempt. ' +
        'Run: npx ts-node src/scripts/seed-app-configs.ts'
    );
  }

  await initAllFirebaseApps(appConfigs);
  return appConfigs.map((a) => a.appId);
};
