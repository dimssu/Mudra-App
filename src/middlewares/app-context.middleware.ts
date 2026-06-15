import { Request, Response, NextFunction } from 'express';
import { AppConfig, IAppConfig } from '../models/AppConfig';
import { RedisCache } from '../utils/redis-cache';
import { logger } from '../utils/logger';

const DEFAULT_APP_ID = process.env.DEFAULT_APP_ID || 'techanewz';
const APP_CONFIG_CACHE_TTL = 300; // 5 minutes

/**
 * Reads X-App-ID header, loads AppConfig from cache or DB,
 * and attaches it as req.appConfig.
 *
 * Falls back to DEFAULT_APP_ID if no header is sent (backward compat).
 */
export const loadAppContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Allow CORS preflight to pass through without app context
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const appId = (
      (req.headers['x-app-id'] as string) || DEFAULT_APP_ID
    ).toLowerCase().trim();

    const cacheKey = `appconfig:${appId}`;
    let appConfig = await RedisCache.get<IAppConfig>(cacheKey);

    if (!appConfig) {
      appConfig = await AppConfig.findOne({ appId, isActive: true }).lean() as IAppConfig | null;

      if (!appConfig) {
        res.status(400).json({
          error: `Unknown or inactive app: "${appId}". Send a valid X-App-ID header.`,
        });
        return;
      }

      await RedisCache.set(cacheKey, appConfig, APP_CONFIG_CACHE_TTL);
    }

    req.appConfig = appConfig;
    next();
  } catch (err) {
    logger.error('app-context middleware error:', err);
    res.status(500).json({ error: 'Failed to resolve app context' });
  }
};
