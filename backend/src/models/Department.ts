import { Schema, model, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  description: string;
  createdAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Department = model<IDepartment>('Department', DepartmentSchema);
