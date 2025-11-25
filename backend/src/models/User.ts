import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  emailVerified: boolean;
  verificationCode?: string | null;
  verificationCodeExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@stud\.h-da\.de$/,
        '@stud.h-da.de email address is required'
      ]
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    verificationCode: {
      type: String,
      default: null,
      select: false
    },
    verificationCodeExpires: {
      type: Date,
      default: null,
      select: false
    }
  },
  {
    timestamps: true, //add createdAt and updatedAt automatically
    collection: 'users'
  }
);

userSchema.index({ email: 1 }, { unique: true });

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;