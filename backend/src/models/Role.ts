import { Schema, model, Document } from 'mongoose';

export interface IRole extends Document {
  name: string;
  permissions: string[];
}

const RoleSchema = new Schema<IRole>({
  name: { type: String, required: true, unique: true, trim: true },
  permissions: [{ type: String, required: true }]
});

export const Role = model<IRole>('Role', RoleSchema);
