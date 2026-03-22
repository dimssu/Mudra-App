import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRefreshToken } from '../middlewares/validation.middleware';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', validateRefreshToken, AuthController.refreshToken);
router.post('/logout', authenticate, AuthController.logout);
router.post('/google/get-access', AuthController.getAccessWithGoogle)
router.post('/verify-token', AuthController.verifyToken)
export default router; 