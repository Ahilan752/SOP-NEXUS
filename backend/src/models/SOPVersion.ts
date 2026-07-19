import { Schema, model, Document, Types } from 'mongoose';

export type SOPStatus = 'Draft' | 'Pending Approval' | 'Published' | 'Rejected';

export interface IAttachment {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedBy: Types.ObjectId;
  uploadedDate: Date;
}

export interface IComment {
  user: Types.ObjectId;
  userName: string;
  role: string;
  text: string;
  timestamp: Date;
}

export interface IApprovalTransition {
  fromStatus: string;
  toStatus: string;
  updatedBy: Types.ObjectId;
  reason?: string;
  timestamp: Date;
}

export interface ISOPVersion extends Document {
  sopId: Types.ObjectId;
  versionNumber: string;
  status: SOPStatus;
  content: string;
  changelog: string;
  attachments: IAttachment[];
  comments: IComment[];
  approvalHistory: IApprovalTransition[];
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedDate: { type: Date, default: Date.now }
});

const CommentSchema = new Schema<IComment>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  role: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const ApprovalTransitionSchema = new Schema<IApprovalTransition>({
  fromStatus: { type: String, required: true },
  toStatus: { type: String, required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const SOPVersionSchema = new Schema<ISOPVersion>({
  sopId: { type: Schema.Types.ObjectId, ref: 'SOP', required: true },
  versionNumber: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Pending Approval', 'Published', 'Rejected'], default: 'Draft' },
  content: { type: String, default: '' },
  changelog: { type: String, default: 'Initial draft' },
  attachments: [AttachmentSchema],
  comments: [CommentSchema],
  approvalHistory: [ApprovalTransitionSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure uniqueness of version number per SOP
SOPVersionSchema.index({ sopId: 1, versionNumber: 1 }, { unique: true });

export const SOPVersion = model<ISOPVersion>('SOPVersion', SOPVersionSchema);
