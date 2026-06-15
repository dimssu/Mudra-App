import 'dotenv/config';
import app from './app';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { AppConfig } from './models/AppConfig';
import { initAllFirebaseApps } from './utils/firebase.utils';
import { seedDefaultAppConfigs } from './scripts/seed-app-configs';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDatabase();

    // Load all active app configs and initialize Firebase for each
    let appConfigs = await AppConfig.find({ isActive: true })
      .select('appId firebaseCredsEnvKey')
      .lean();

    if (appConfigs.length === 0) {
      logger.warn(
        'No active AppConfig entries found in DB — inserting defaults from seed script.'
      );
      await seedDefaultAppConfigs();
      appConfigs = await AppConfig.find({ isActive: true })
        .select('appId firebaseCredsEnvKey')
        .lean();
    }

    if (appConfigs.length === 0) {
      logger.warn(
        'No active AppConfig entries found in DB after seed attempt. ' +
          'Run: npx ts-node src/scripts/seed-app-configs.ts'
      );
    }

    await initAllFirebaseApps(appConfigs);

    app.listen(PORT, () => {
      logger.info(`Mudra multi-tenant auth service running on port ${PORT}`);
      logger.info(
        `Loaded ${appConfigs.length} app(s): ${appConfigs.map((a) => a.appId).join(', ')}`
      );
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

startServer();
