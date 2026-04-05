import { Response } from 'express';
import { notificationService } from '@/services/notificationService';
import { ApiResponseUtil } from '@/utils/apiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { AuthRequest } from '@/types';

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [email, push, sms]
 *         title:
 *           type: string
 *         body:
 *           type: string
 *         read:
 *           type: boolean
 */

export class NotificationController {
  /**
   * @swagger
   * /api/notifications:
   *   get:
   *     summary: Get user notifications
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: unread
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Notification'
   */
  static getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await notificationService.getUserNotifications(req.user!.id, unreadOnly);
    ApiResponseUtil.success(res, notifications);
  });

  /**
   * @swagger
   * /api/notifications/unread:
   *   get:
   *     summary: Get unread notifications count
   *     tags: [Notifications]
   *     responses:
   *       200:
   *         description: Unread count
   */
  static getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const notifications = await notificationService.getUserNotifications(req.user!.id, true);
    ApiResponseUtil.success(res, { unread: notifications.length });
  });

  /**
   * @swagger
   * /api/notifications/{id}/read:
   *   put:
   *     summary: Mark notification as read
   *     tags: [Notifications]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Marked as read
   */
  static markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await notificationService.markAsRead(req.user!.id, id);
    ApiResponseUtil.success(res, null, 'Marked as read');
  });

  /**
   * @swagger
   * /api/notifications/read-all:
   *   put:
   *     summary: Mark all notifications as read
   *     tags: [Notifications]
   *     responses:
   *       200:
   *         description: All marked as read
   */
  static markAllRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Stub - mark all for user
    ApiResponseUtil.success(res, null, 'All notifications marked as read');
  });

  /**
   * @swagger
   * /api/notifications/{id}:
   *   delete:
   *     summary: Delete notification
   *     tags: [Notifications]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Deleted
   */
  static deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Stub delete
    ApiResponseUtil.success(res, null, 'Notification deleted');
  });

  /**
   * @swagger
   * /api/notifications/preferences:
   *   post:
   *     summary: Update notification preferences
   *     tags: [Notifications]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: boolean
   *               push:
   *                 type: boolean
   *               sms:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Preferences updated
   */
  static updatePreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const preferences = req.body;
    // Stub - save to user profile
    ApiResponseUtil.success(res, preferences, 'Preferences updated');
  });
}
