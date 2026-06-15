import { Request, Response } from 'express';
import { AppConfig } from '../models/AppConfig';
import { RedisCache } from '../utils/redis-cache';
import { initFirebaseApp } from '../utils/firebase.utils';
import { STATUS_CODES } from '../constants/statusCodes';
import { logger } from '../utils/logger';

export class AdminController {

  static async listApps(req: Request, res: Response) {
    try {
      const apps = await AppConfig.find({}).lean();
      res.status(STATUS_CODES.SUCCESS).json({ apps });
    } catch (error: any) {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  static async createApp(req: Request, res: Response) {
    try {
      const { appId, appName, allowedOrigins, firebaseCredsEnvKey } = req.body;

      if (!appId || !appName || !firebaseCredsEnvKey) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          error: 'appId, appName, and firebaseCredsEnvKey are required',
        });
      }

      const existing = await AppConfig.findOne({ appId: appId.toLowerCase() });
      if (existing) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          error: `App "${appId}" already exists`,
        });
      }

      // Validate that the env var exists and credentials are parseable
      const credsBase64 = process.env[firebaseCredsEnvKey];
      if (!credsBase64) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          error: `Env var "${firebaseCredsEnvKey}" is not set on this server. Set it and restart before registering this app.`,
        });
      }

      try {
        JSON.parse(Buffer.from(credsBase64, 'base64').toString('utf-8'));
      } catch {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          error: `Env var "${firebaseCredsEnvKey}" does not contain valid base64-encoded JSON`,
        });
      }

      const appConfig = await AppConfig.create({
        appId: appId.toLowerCase(),
        appName,
        allowedOrigins: allowedOrigins || [],
        firebaseCredsEnvKey,
        isActive: true,
      });

      // Eagerly initialize Firebase app so it's ready immediately
      try {
        initFirebaseApp(appConfig.appId, firebaseCredsEnvKey);
      } catch (err) {
        logger.warn(`App config created but Firebase init failed: ${err}`);
      }

      res.status(STATUS_CODES.CREATED).json({ app: appConfig });
    } catch (error: any) {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  static async getApp(req: Request, res: Response) {
    try {
      const appConfig = await AppConfig.findOne({
        appId: req.params.appId.toLowerCase(),
      }).lean();

      if (!appConfig) {
        return res.status(STATUS_CODES.NOT_FOUND).json({ error: 'App not found' });
      }
      res.status(STATUS_CODES.SUCCESS).json({ app: appConfig });
    } catch (error: any) {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  static async updateApp(req: Request, res: Response) {
    try {
      const { appName, allowedOrigins, firebaseCredsEnvKey, isActive } = req.body;
      const appId = req.params.appId.toLowerCase();

      const appConfig = await AppConfig.findOneAndUpdate(
        { appId },
        { $set: { appName, allowedOrigins, firebaseCredsEnvKey, isActive } },
        { new: true, runValidators: true }
      );

      if (!appConfig) {
        return res.status(STATUS_CODES.NOT_FOUND).json({ error: 'App not found' });
      }

      // Bust cache so updated config is picked up immediately
      await RedisCache.del(`appconfig:${appId}`);

      res.status(STATUS_CODES.SUCCESS).json({ app: appConfig });
    } catch (error: any) {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  static async deactivateApp(req: Request, res: Response) {
    try {
      const appId = req.params.appId.toLowerCase();

      // Protected app IDs are env-configurable so no app is special-cased in code.
      const protectedAppIds = (process.env.PROTECTED_APP_IDS || 'techanewz,lakawat')
        .split(',')
        .map((id) => id.trim().toLowerCase())
        .filter(Boolean);
      if (protectedAppIds.includes(appId)) {
        return res.status(STATUS_CODES.FORBIDDEN).json({
          error: `Cannot deactivate protected core app "${appId}" via API`,
        });
      }

      const appConfig = await AppConfig.findOneAndUpdate(
        { appId },
        { $set: { isActive: false } },
        { new: true }
      );

      if (!appConfig) {
        return res.status(STATUS_CODES.NOT_FOUND).json({ error: 'App not found' });
      }

      await RedisCache.del(`appconfig:${appId}`);
      res.status(STATUS_CODES.SUCCESS).json({ message: `App "${appId}" deactivated` });
    } catch (error: any) {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }
}
