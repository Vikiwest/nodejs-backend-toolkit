import { Schema, model } from 'mongoose';
import { IUser } from '@/types';
import encryptionService from '@/utils/encryption';

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator', 'super_admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    // Add 2FA fields
    twoFactorSecret: {
      type: String,
      select: false, // Don't return by default for security
      default: null,
    },
    isTwoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    this.password = await encryptionService.hashPassword(this.password);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await encryptionService.comparePassword(candidatePassword, this.password);
};

// Soft delete method
userSchema.methods.softDelete = async function (): Promise<void> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

export const UserModel = model<IUser>('User', userSchema);
