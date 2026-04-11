import { Response } from 'express';
import { notificationService } from '../services/notificationService';
import { ApiResponseUtil } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';

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
 *         createdAt:
 *           type: string
 *           format: date-time
 */

export class NotificationController {
  /**
   * @swagger
   * /notifications:
   *   get:
   *     summary: Get user notifications
   *     description: Get paginated user notifications
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: unread
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 20
   *     responses:
   *       200:
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedResponse'
   */
  static getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    let unreadFilter: boolean | undefined;
    if (req.query.unread !== undefined) {
      unreadFilter = req.query.unread === 'true';
    }
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);

    const notifications = await notificationService.getUserNotifications(
      req.user!.id,
      unreadFilter,
      page,
      limit
    );

    ApiResponseUtil.success(res, notifications);
  });

  /**
   * @swagger
   * /notifications/{id}/read:
   *   put:
   *     summary: Mark notification as read
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Marked as read
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 notification:
   *                   $ref: '#/components/schemas/Notification'
   *       404:
   *         description: Notification not found
   */
  static markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(req.user!.id, id);
    if (!notification) {
      return ApiResponseUtil.notFound(res, 'Notification not found');
    }
    ApiResponseUtil.success(res, { notification }, 'Marked as read');
  });

  /**
   * @swagger
   * /notifications/read-all:
   *   put:
   *     summary: Mark all notifications as read
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All marked as read
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 markedAsRead:
   *                   type: integer
   *                   description: Number of notifications marked as read
   */
  static markAllRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const count = await notificationService.markAllRead(req.user!.id);
    ApiResponseUtil.success(res, { markedAsRead: count }, 'All notifications marked as read');
  });

  /**
   * @swagger
   * /notifications/{id}:
   *   delete:
   *     summary: Delete notification
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Deleted
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                   description: The ID of the deleted notification
   *       404:
   *         description: Notification not found
   */
  static deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const deleted = await notificationService.deleteNotification(req.user!.id, id);
    if (!deleted) {
      return ApiResponseUtil.notFound(res, 'Notification not found');
    }
    ApiResponseUtil.success(res, { id }, 'Notification deleted');
  });

  /**
   * @swagger
   * /notifications/preferences:
   *   put:
   *     summary: Update notification preferences
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
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
    const updatedPreferences = await notificationService.updatePreferences(
      req.user!.id,
      preferences
    );
    ApiResponseUtil.success(res, updatedPreferences, 'Preferences updated');
  });
}
