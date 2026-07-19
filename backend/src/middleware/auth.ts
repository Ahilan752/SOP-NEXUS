import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Role } from '../models/Role';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'sop-platform-jwt-secret-key-super-secure';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authorization token missing or malformed' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await User.findById(decoded.userId).populate('department');
    if (!user) {
      res.status(401).json({ message: 'User not found or session expired' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    logger.warn('JWT verification failed:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const hasPermission = async (user: IUser, permission: string): Promise<boolean> => {
  if (!user.role) return false;
  const roleObj = await Role.findOne({ name: user.role });
  return roleObj ? roleObj.permissions.includes(permission) : false;
};

export const requirePermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      const allowed = await hasPermission(req.user, permission);
      if (!allowed) {
        res.status(403).json({
          message: `Forbidden: requires permission: ${permission}`
        });
        return;
      }
      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({ message: 'Internal server error checking permissions' });
    }
  };
};
