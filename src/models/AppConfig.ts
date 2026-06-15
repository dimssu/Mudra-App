import mongoose, { Document, Schema } from 'mongoose';

export interface IAppConfig extends Document {
  appId: string;
  appName: string;
  allowedOrigins: string[];
  firebaseCredsEnvKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const appConfigSchema = new Schema<IAppConfig>(
  {
    appId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    appName: {
      type: String,
      required: true,
      trim: true,
    },
    allowedOrigins: {
      type: [String],
      required: true,
      default: [],
    },
    firebaseCredsEnvKey: {
      type: String,
      required: true,
      trim: true,
      // Stores the env var name (e.g. "TECHANEWZ_FIREBASE_CREDS"), NOT the credentials value
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const AppConfig = mongoose.model<IAppConfig>('AppConfig', appConfigSchema);
