import { Request } from 'express';
import { Types } from 'mongoose';

export class Helpers {
  static generateRandomString(length: number = 8): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  static generateOTP(length: number = 6): string {
    return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
  }

  static formatDate(date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  static getPaginationOptions(query: any): { skip: number; limit: number; sort: any } {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const skip = (page - 1) * limit;

    const sort: any = {};
    if (query.sortBy) {
      sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    return { skip, limit, sort };
  }

  static isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }

  static sanitizeUser(user: any): any {
    const sanitized = { ...user.toObject ? user.toObject() : user };
    delete sanitized.password;
    delete sanitized.__v;
    return sanitized;
  }

  static getClientIp(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
  }

  static slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static retry<T>(fn: () => Promise<T>, retries: number = 3, delayMs: number = 1000): Promise<T> {
    return fn().catch((error) => {
      if (retries <= 0) throw error;
      return Helpers.delay(delayMs).then(() => Helpers.retry(fn, retries - 1, delayMs));
    });
  }
}