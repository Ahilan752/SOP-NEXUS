import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  user: Types.ObjectId | null;
  userName: string;
  userEmail: string;
  role: string;
  action: string;
  details: string;
  diff: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  role: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  diff: {
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed }
  },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
