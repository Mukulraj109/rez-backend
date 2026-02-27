import { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { sendSuccess, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Get unread notification count
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  const baseQuery = {
    user: userId,
    isRead: false,
    deletedAt: { $exists: false }
  };

  const [total, byTypeAgg, byPriorityAgg] = await Promise.all([
    Notification.countDocuments(baseQuery),
    Notification.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    Notification.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ])
  ]);

  const byType: Record<string, number> = {};
  for (const item of byTypeAgg) {
    byType[item._id] = item.count;
  }

  const byPriority: Record<string, number> = {};
  for (const item of byPriorityAgg) {
    byPriority[item._id] = item.count;
  }

  sendSuccess(res, { total, byType, byPriority });
});

// Get user notifications
export const getUserNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { type, isRead, page = 1, limit = 20 } = req.query;

  try {
    const query: any = {
      user: userId,
      deletedAt: { $exists: false }
    };
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
      deletedAt: { $exists: false }
    });

    sendSuccess(res, {
      notifications,
      unreadCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }, 'Notifications retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch notifications', 500);
  }
});

// Mark notifications as read
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { notificationIds } = req.body;

  try {
    const query = notificationIds && notificationIds.length > 0
      ? { _id: { $in: notificationIds }, user: userId, deletedAt: { $exists: false } }
      : { user: userId, isRead: false, deletedAt: { $exists: false } };

    await Notification.updateMany(query, {
      isRead: true,
      readAt: new Date()
    });

    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
      deletedAt: { $exists: false }
    });

    sendSuccess(res, { unreadCount }, 'Notifications marked as read');
  } catch (error) {
    throw new AppError('Failed to mark notifications as read', 500);
  }
});

// Delete notification
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const userId = req.userId!;

  try {
    const notification = await Notification.findOneAndDelete({ 
      _id: notificationId, 
      user: userId 
    });

    if (!notification) {
      return sendNotFound(res, 'Notification not found');
    }

    sendSuccess(res, null, 'Notification deleted successfully');
  } catch (error) {
    throw new AppError('Failed to delete notification', 500);
  }
});