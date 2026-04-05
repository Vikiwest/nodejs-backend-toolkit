import { EventEmitter } from 'events';
import { emailService } from './emailService';
import { websocketService } from './websocketService';
import { LoggerService } from '../utils/logger';

interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'push' | 'sms';
  title: string;
  body: string;
  data?: any;
}

export class NotificationService extends EventEmitter {
  private notifications: Map<string, Notification[]> = new Map();

  async send(notification: Omit<Notification, 'id'>): Promise<void> {
    const id = this.generateId();
    const fullNotification: Notification = { ...notification, id };

    // Store notification
    if (!this.notifications.has(notification.userId)) {
      this.notifications.set(notification.userId, []);
    }
    this.notifications.get(notification.userId)!.push(fullNotification);

    // Send based on type
    switch (notification.type) {
      case 'email':
        await emailService.sendEmail({
          to: notification.userId,
          subject: notification.title,
          text: notification.body,
        });
        break;
      case 'push':
        websocketService.sendToUser(notification.userId, 'notification', fullNotification);
        break;
      case 'sms':
        // Implement SMS sending
        LoggerService.info(`SMS would be sent to ${notification.userId}`);
        break;
    }

    this.emit('notification-sent', fullNotification);
  }

  async getUserNotifications(
    userId: string,
    _unreadOnly: boolean = false
  ): Promise<Notification[]> {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications;
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      const notification = userNotifications.find((n) => n.id === notificationId);
      if (notification) {
        this.emit('notification-read', notification);
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const notificationService = new NotificationService();
