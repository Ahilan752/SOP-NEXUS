import { Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';
import { AuthenticatedRequest } from './auth';
import { logger } from '../utils/logger';

interface LogActionOptions {
  req: AuthenticatedRequest;
  action: string;
  details: string;
  diff?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  userId?: any;
  userName?: string;
  userEmail?: string;
  role?: string;
}

export const logAction = async (options: LogActionOptions): Promise<void> => {
  const { req, action, details, diff, userId, userName, userEmail, role } = options;

  try {
    const dbUser = userId || req.user?._id || null;
    const dbUserName = userName || req.user?.name || 'System / Guest';
    const dbUserEmail = userEmail || req.user?.email || 'guest@sop.com';
    const dbRole = role || req.user?.role || 'Guest';

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';

    const logEntry = new AuditLog({
      user: dbUser,
      userName: dbUserName,
      userEmail: dbUserEmail,
      role: dbRole,
      action,
      details,
      diff,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });

    await logEntry.save();
    logger.info(`[Audit Log] ${action}: ${details}`);
  } catch (error) {
    logger.error('Failed to write audit log:', error);
  }
};

export const getAuditLogs = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
};
