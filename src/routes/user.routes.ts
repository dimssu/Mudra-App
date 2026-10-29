import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole, requireRoleOrSelf } from '../middlewares/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users - only admins can access
router.get('/', requireRole(['SUPER_ADMIN', 'ORG_ADMIN']), UserController.getAllUsers);

// Get user by ID
router.get('/:id', UserController.getUserById);

// Update user
router.put('/:id', UserController.updateUser);

// Soft delete user - any user can delete themselves, admins can delete others
router.delete('/:id', requireRoleOrSelf(['SUPER_ADMIN', 'ORG_ADMIN']), UserController.deleteUser);

// Permanently delete user - users can erase their own account (App Store / Play rule), super admins can erase anyone
router.delete('/:id/permanent', requireRoleOrSelf(['SUPER_ADMIN']), UserController.permanentlyDeleteUser);

export default router; 