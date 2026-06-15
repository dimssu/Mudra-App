import { IAppConfig } from '../../models/AppConfig';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: string;
        appId?: string;
        [key: string]: any;
      };
      appConfig?: IAppConfig;
    }
  }
}
