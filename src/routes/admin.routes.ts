import { Router, Request, Response, NextFunction } from 'express';
import { AdminController } from '../controllers/admin.controller';

const router = Router();

/**
 * Simple API key auth for admin endpoints.
 * Send: Authorization: Bearer <SUPER_ADMIN_API_KEY>
 */
const adminApiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin API key required' });
  }
  const key = authHeader.split(' ')[1];
  if (!process.env.SUPER_ADMIN_API_KEY || key !== process.env.SUPER_ADMIN_API_KEY) {
    return res.status(403).json({ error: 'Invalid admin API key' });
  }
  next();
};

router.use(adminApiKeyAuth);

router.get('/apps', AdminController.listApps);
router.post('/apps', AdminController.createApp);
router.get('/apps/:appId', AdminController.getApp);
router.patch('/apps/:appId', AdminController.updateApp);
router.delete('/apps/:appId', AdminController.deactivateApp);

export default router;
