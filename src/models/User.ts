import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  authMethod: string;
  role: string;
  userName?: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  phone_number?: string;
  is_active: boolean;
  isVerified: boolean;
  isDeleted: boolean;
  // Google OAuth specific fields
  googleId?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      minlength: 8,
    },
    authMethod: {
      type: String,
      required: true,
      enum: ["email/password", "google"],
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ORG_ADMIN', 'ORG_USER'],
      default: 'ORG_USER',
    },
    userName: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    first_name: {
      type: String,
      trim: true,
    },
    last_name: {
      type: String,
      trim: true,
    },
    profile_picture_url: {
      type: String,
    },
    phone_number: {
      type: String,
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    photoURL: {
      type: String,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema); 