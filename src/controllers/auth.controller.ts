import { Request, Response } from 'express';
import { STATUS_CODES } from '../constants/statusCodes';
import AuthService from '../services/auth.service';

export class AuthController {
  static async getAccessWithGoogle(req: Request, res: Response){
    try{
      const { idToken } = req.body;
      const result = await AuthService.getAccessWithGoogle(idToken)
      res.status(STATUS_CODES.SUCCESS).json(result)
    }catch(error: any){
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { 
        email, 
        password, 
        userName, 
        first_name, 
        last_name, 
        profile_picture_url, 
        phone_number 
      } = req.body;
      
      const userData = {
        userName,
        first_name,
        last_name,
        profile_picture_url,
        phone_number
      };
      
      const result = await AuthService.register(email, password, userData);
      res.status(STATUS_CODES.SUCCESS).json(result);
    } catch (error: any) {
      if(error.name == "ValidationError"){
        return res.status(STATUS_CODES.BAD_REQUEST).json({ error: error.message})
      }

      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.status(STATUS_CODES.SUCCESS).json(result);
    } catch (error: any) {
      res.status(STATUS_CODES.UNAUTHORIZED).json({ error: error.message });
    }
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);
      res.status(STATUS_CODES.SUCCESS).json(result);
    } catch (error: any) {
      res.status(STATUS_CODES.UNAUTHORIZED).json({ error: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(STATUS_CODES.UNAUTHORIZED).json({ error: 'Unauthorized' });
      }
      await AuthService.logout(userId);
      res.status(STATUS_CODES.SUCCESS).json({ message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  static async verifyToken(req: Request, res: Response) {
    try {
      const accessToken  = req.headers.authorization;
      if (!accessToken) {
        return res.status(STATUS_CODES.NOT_FOUND).json({ error: 'Access token not provided' });
      }

      const token = accessToken.split(' ')[1];

      const decodedToken = await AuthService.verifyToken(token);
      
      res.status(STATUS_CODES.SUCCESS).json({ verified: true, decodedToken, message: 'Token verified successfully' });
    } catch (error: any) {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ verified: false, error: error.message });
    }
  }
} 