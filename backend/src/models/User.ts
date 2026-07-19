import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = string;

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department: Types.ObjectId | null; // Admins won't have a department, managers/employees will.
  savedSops: Types.ObjectId[];
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
  savedSops: [{ type: Schema.Types.ObjectId, ref: 'SOP', default: [] }],
  createdAt: { type: Date, default: Date.now }
});

export const User = model<IUser>('User', UserSchema);
