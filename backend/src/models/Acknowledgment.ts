import { Schema, model, Document, Types } from 'mongoose';

export interface IAcknowledgment extends Document {
  user: Types.ObjectId;
  sop: Types.ObjectId;
  version: Types.ObjectId;
  timestamp: Date; // Keep for legacy
  openedAt?: Date;
  acknowledgedAt?: Date;
  quizScore?: number;
}

const AcknowledgmentSchema = new Schema<IAcknowledgment>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sop: { type: Schema.Types.ObjectId, ref: 'SOP', required: true },
  version: { type: Schema.Types.ObjectId, ref: 'SOPVersion', required: true },
  timestamp: { type: Date, default: Date.now },
  openedAt: { type: Date },
  acknowledgedAt: { type: Date },
  quizScore: { type: Number, default: 0 }
});

// Ensure an employee can acknowledge a specific version only once
AcknowledgmentSchema.index({ user: 1, version: 1 }, { unique: true });

export const Acknowledgment = model<IAcknowledgment>('Acknowledgment', AcknowledgmentSchema);
