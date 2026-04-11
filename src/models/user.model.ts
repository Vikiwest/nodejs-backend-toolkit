import { Schema, model } from 'mongoose';
import { IUser } from '../types';
import encryptionService from '../utils/encryption';

const userSchema = new Schema<IUser>(
  {
    // Core fields first
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

    // Profile fields
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number (10-15 digits)'],
      default: null,
    },
    avatar: {
      type: String,
      trim: true,
      default: null,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    // Status fields
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
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isTwoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    // Security fields
    twoFactorSecret: {
      type: String,
      select: false,
      default: null,
    },

    // Metadata fields
    lastLogin: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
    // Control what gets sent to JSON
    toJSON: {
      virtuals: false, // Disable virtuals to avoid duplicate id
      // In the toJSON transform function, use this instead:
      transform: function (doc, ret) {
        // Remove sensitive fields
        delete ret.password;
        delete ret.twoFactorSecret;
        delete ret.isDeleted;
        delete ret.__v;

        // Ensure id is present (as a string version of _id)
        ret.id = ret._id.toString();

        // Reorder fields
        const orderedData: any = {};

        // Define priority order (id appears first, then _id)
        const fieldOrder = [
          'id',
          '_id', // IDs first
          'name',
          'email', // Basic info
          'phone',
          'isPhoneVerified',
          'avatar',
          'bio', // Profile
          'role', // Role
          'isActive',
          'isEmailVerified',
          'isTwoFactorEnabled', // Status
          'lastLogin', // Activity
          'createdAt',
          'updatedAt', // Timestamps
        ];

        fieldOrder.forEach((field) => {
          if (ret[field] !== undefined) {
            orderedData[field] = ret[field];
          }
        });

        // Add any remaining fields
        Object.keys(ret).forEach((field) => {
          if (!fieldOrder.includes(field)) {
            orderedData[field] = ret[field];
          }
        });

        return orderedData;
      },
    },
    toObject: {
      virtuals: false,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.twoFactorSecret;
        delete ret.isDeleted;
        delete ret.__v;
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
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
userSchema.index({ phone: 1 }, { sparse: true });

export const UserModel = model<IUser>('User', userSchema);
