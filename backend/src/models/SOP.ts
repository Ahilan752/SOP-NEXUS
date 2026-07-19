import { Schema, model, Document, Types } from 'mongoose';

export type SOPPriority = 'Low' | 'Medium' | 'High';

export interface ISOP extends Document {
  title: string;
  department: Types.ObjectId;
  category: string;
  priority: SOPPriority;
  tags: string[];
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SOPSchema = new Schema<ISOP>({
  title: { type: String, required: true, trim: true },
  department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  category: { type: String, required: true, trim: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  tags: [{ type: String, trim: true }],
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Text index for search
SOPSchema.index({ title: 'text', category: 'text', tags: 'text' });

export const SOP = model<ISOP>('SOP', SOPSchema);
