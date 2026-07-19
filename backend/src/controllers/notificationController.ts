import { Response } from 'express';
import { Notification } from '../models/Notification';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;

  try {
    // Find all notifications matching:
    // - Recipient is this user
    // - Department is this user's department
    // - Recipient is null and Department is null (Broadcast)
    const filters: any[] = [{ recipient: user._id }];
    
    if (user.department) {
      filters.push({ department: user.department });
    }
    
    filters.push({ recipient: null, department: null });

    const notifications = await Notification.find({ $or: filters })
      .sort({ createdAt: -1 })
      .limit(50);

    // Map to include unread status
    const formatted = notifications.map(notif => ({
      _id: notif._id,
      message: notif.message,
      type: notif.type,
      link: notif.link,
      createdAt: notif.createdAt,
      isRead: notif.readBy.includes(user._id)
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const notification = await Notification.findById(id);
    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    if (!notification.readBy.includes(user._id)) {
      notification.readBy.push(user._id);
      await notification.save();
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;

  try {
    const filters: any[] = [{ recipient: user._id }];
    
    if (user.department) {
      filters.push({ department: user.department });
    }
    
    filters.push({ recipient: null, department: null });

    const notifications = await Notification.find({
      $or: filters,
      readBy: { $ne: user._id }
    });

    await Promise.all(
      notifications.map(async (notif) => {
        notif.readBy.push(user._id);
        await notif.save();
      })
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
};
