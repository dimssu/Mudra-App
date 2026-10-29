import 'dotenv/config';
import app from './app';
import { ensureReady } from './bootstrap';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    const appIds = await ensureReady();

    app.listen(PORT, () => {
      logger.info(`Mudra multi-tenant auth service running on port ${PORT}`);
      logger.info(`Loaded ${appIds.length} app(s): ${appIds.join(', ')}`);
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
