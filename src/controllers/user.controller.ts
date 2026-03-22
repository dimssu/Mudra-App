import { Request, Response } from 'express';
import { STATUS_CODES } from '../constants/statusCodes';
import UserService from '../services/user.service';

export class UserController {
  static async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      
      const result = await UserService.getAllUsers(page, limit, search);
      res.status(STATUS_CODES.SUCCESS).json(result);
    } catch (error: any) {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const user = await UserService.getUserById(userId);
      res.status(STATUS_CODES.SUCCESS).json(user);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return res.status(STATUS_CODES.NOT_FOUND).json({ error: error.message });
      }
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      
      // Check if the user is an admin
      const isAdmin = ['SUPER_ADMIN', 'ORG_ADMIN'].includes(req.user?.role);
      
      const updatedUser = await UserService.updateUser(userId, updateData, isAdmin);
      res.status(STATUS_CODES.SUCCESS).json(updatedUser);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return res.status(STATUS_CODES.NOT_FOUND).json({ error: error.message });
      }
      if (error.name === 'ValidationError') {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ error: error.message });
      }
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const result = await UserService.deleteUser(userId);
      res.status(STATUS_CODES.SUCCESS).json(result);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return res.status(STATUS_CODES.NOT_FOUND).json({ error: error.message });
      }
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  static async permanentlyDeleteUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const result = await UserService.permanentlyDeleteUser(userId);
      res.status(STATUS_CODES.SUCCESS).json(result);
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return res.status(STATUS_CODES.NOT_FOUND).json({ error: error.message });
      }
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }
} 