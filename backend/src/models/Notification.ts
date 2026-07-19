import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'APPROVAL' | 'REJECTION';

export interface INotification extends Document {
  recipient: Types.ObjectId | null; // null means broadcast to all
  department: Types.ObjectId | null; // optional, filter by department
  message: string;
  type: NotificationType;
  link: string; // where the user gets redirected when clicking it
  readBy: Types.ObjectId[]; // users who have read it
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  department: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
  message: { type: String, required: true },
  type: { type: String, enum: ['INFO', 'WARNING', 'SUCCESS', 'APPROVAL', 'REJECTION'], default: 'INFO' },
  link: { type: String, default: '' },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

export const Notification = model<INotification>('Notification', NotificationSchema);
