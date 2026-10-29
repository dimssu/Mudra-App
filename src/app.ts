import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middlewares/error.middleware';
import { validateRegister, validateLogin, validateRefreshToken } from './middlewares/validation.middleware';
import { AuthController } from './controllers/auth.controller';
import { loadAppContext } from './middlewares/app-context.middleware';
import { STATUS_CODES } from './constants/statusCodes';
import { ensureReady } from './bootstrap';

const app = express();

// Requests arrive through one proxy hop (Vercel's edge, or nginx on a VM).
// Without this every visitor shares the proxy's IP, so the login rate limit
// would lock everyone out together.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS infrastructure — allow any origin at this level;
// per-app origin enforcement happens after loadAppContext (see below)
app.use(cors({ credentials: true }));

app.use(compression());

app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check — exempt from app context requirement
app.get('/mudra/health-check', (_req: Request, res: Response) => {
  res.status(STATUS_CODES.SUCCESS).json({ status: 'healthy' });
});

// Connect to MongoDB and load each app's Firebase credentials before the first
// request (a no-op after that). Needed on Vercel, where index.ts never runs.
app.use((_req: Request, _res: Response, next: NextFunction) => {
  ensureReady().then(() => next(), next);
});

// Admin routes — registered BEFORE loadAppContext since they use their own API key auth
app.use('/mudra/admin', adminRoutes);

// Apply loadAppContext to all remaining /mudra/* routes
app.use('/mudra', loadAppContext);

// Per-app CORS enforcement — runs after loadAppContext has set req.appConfig
app.use('/mudra', (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (!origin) return next(); // Non-browser clients always allowed

  const allowedOrigins = req.appConfig?.allowedOrigins || [];
  if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    return next();
  }

  res.status(403).json({
    error: `Origin "${origin}" is not allowed for app "${req.appConfig?.appId}"`,
  });
});

// Auth and user routes — loadAppContext already applied above
app.use('/mudra/auth', authRoutes);
app.use('/mudra/users', userRoutes);

// Legacy routes (backward compat — no X-App-ID required; uses DEFAULT_APP_ID)
app.post('/auth/register', loadAppContext, validateRegister, AuthController.register);
app.post('/auth/login', loadAppContext, validateLogin, AuthController.login);
app.post('/auth/refresh-token', loadAppContext, validateRefreshToken, AuthController.refreshToken);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
