import * as admin from 'firebase-admin';
import { logger } from './logger';

// Map of appId -> initialized Firebase app instance
const firebaseApps: Map<string, admin.app.App> = new Map();

/**
 * Initialize a Firebase Admin app for the given appId using credentials
 * stored in the env var identified by envKey.
 * Safe to call multiple times — idempotent per appId.
 */
export function initFirebaseApp(appId: string, envKey: string): admin.app.App {
  if (firebaseApps.has(appId)) {
    return firebaseApps.get(appId)!;
  }

  const credsBase64 = process.env[envKey];
  if (!credsBase64) {
    throw new Error(
      `Firebase credentials env var "${envKey}" is not set for app "${appId}"`
    );
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    const credsJson = Buffer.from(credsBase64, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(credsJson);
  } catch (e) {
    throw new Error(
      `Failed to parse Firebase credentials for app "${appId}" from env var "${envKey}": ${e}`
    );
  }

  const app = admin.initializeApp(
    { credential: admin.credential.cert(serviceAccount) },
    appId
  );

  firebaseApps.set(appId, app);
  logger.info(`Firebase Admin initialized for app: ${appId}`);
  return app;
}

/**
 * Get an already-initialized Firebase app. Throws if not initialized.
 */
export function getFirebaseApp(appId: string): admin.app.App {
  const app = firebaseApps.get(appId);
  if (!app) {
    throw new Error(
      `Firebase app for "${appId}" is not initialized. ` +
      `Call initFirebaseApp("${appId}", envKey) at startup.`
    );
  }
  return app;
}

/**
 * Verify a Firebase ID token using the correct app for the given appId.
 */
export async function verifyIdToken(
  idToken: string,
  appId: string
): Promise<admin.auth.DecodedIdToken> {
  if (!idToken) {
    throw new Error('ID token is required');
  }
  const app = getFirebaseApp(appId);
  try {
    return await app.auth().verifyIdToken(idToken);
  } catch (error) {
    logger.error(`googleAuthError [${appId}]: Error verifying ID token:`, error);
    throw new Error('googleAuthError: Invalid ID token');
  }
}

/**
 * Get Firebase user details using the correct app for the given appId.
 */
export async function getUserDetails(
  uid: string,
  appId: string
): Promise<admin.auth.UserRecord> {
  const app = getFirebaseApp(appId);
  try {
    return await app.auth().getUser(uid);
  } catch (error) {
    logger.error(`googleAuthError [${appId}]: Error fetching user details:`, error);
    throw new Error('googleAuthError: Failed to retrieve user details');
  }
}

/**
 * Pre-warm all Firebase apps at server startup.
 */
export async function initAllFirebaseApps(
  appConfigs: Array<{ appId: string; firebaseCredsEnvKey: string }>
): Promise<void> {
  for (const { appId, firebaseCredsEnvKey } of appConfigs) {
    try {
      initFirebaseApp(appId, firebaseCredsEnvKey);
    } catch (err) {
      logger.error(`Failed to initialize Firebase for app "${appId}":`, err);
    }
  }
}
