import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IRefreshToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  family: string;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    family: {
      type: String,
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

// Hash token before saving
refreshTokenSchema.pre('save', async function (next) {
  if (!this.isModified('token')) return next();
  
  this.token = crypto
    .createHash('sha256')
    .update(this.token)
    .digest('hex');
  
  next();
});

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema); 