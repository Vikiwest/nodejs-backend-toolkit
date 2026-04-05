import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponseUtil } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';
import { cacheService } from '../services/cacheService';
import { auditService } from '../services/auditService';
import * as fs from 'fs/promises';
import * as path from 'path';

declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.Multer.File;
    files?: Express.Multer.File[];
  }
}

type MulterRequest = Request & AuthRequest;

export class UploadService {
  static uploadSingle = asyncHandler(async (req: MulterRequest, res: Response) => {
    if (!req.file) {
      return ApiResponseUtil.badRequest(res, 'No file uploaded');
    }

    const fileUrl = await UploadService.processFile(req.file, req.user!.id, 'single');

    ApiResponseUtil.success(res, { filename: req.file.originalname, url: fileUrl });
  });

  static uploadMultiple = asyncHandler(async (req: MulterRequest, res: Response) => {
    if (!req.files || req.files.length === 0) {
      return ApiResponseUtil.badRequest(res, 'No files uploaded');
    }

    const results = await Promise.all(
      req.files.map((file) => UploadService.processFile(file, req.user!.id, 'multiple'))
    );

    ApiResponseUtil.success(res, { files: results });
  });

  static uploadAvatar = asyncHandler(async (req: MulterRequest, res: Response) => {
    if (!req.file) {
      return ApiResponseUtil.badRequest(res, 'No avatar uploaded');
    }

    const fileUrl = await UploadService.processFile(req.file, req.user!.id, 'avatar');

    auditService
      ?.log({
        userId: req.user!.id,
        action: 'UPLOAD_AVATAR',
        resource: 'File',
        metadata: { filename: req.file.originalname },
        req: req as any,
      })
      .catch(() => {});

    ApiResponseUtil.success(res, { avatar: fileUrl });
  });

  static uploadDocument = asyncHandler(async (req: MulterRequest, res: Response) => {
    if (!req.file || req.file.mimetype !== 'application/pdf') {
      return ApiResponseUtil.badRequest(res, 'PDF document required');
    }

    const fileUrl = await UploadService.processFile(req.file, req.user!.id, 'document');

    ApiResponseUtil.success(res, { filename: req.file.originalname, url: fileUrl });
  });

  static getFile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { filename } = req.params;
    const userDir = path.join(process.cwd(), 'uploads', req.user!.id);
    const filePath = path.join(userDir, filename);

    try {
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch {
      ApiResponseUtil.notFound(res, 'File not found');
    }
  });

  static deleteFile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', req.user!.id, filename);

    try {
      await fs.unlink(filePath);

      auditService
        ?.log({
          userId: req.user!.id,
          action: 'DELETE_FILE',
          resource: 'File',
          metadata: { filename },
          req: req as any,
        })
        .catch(() => {});

      ApiResponseUtil.success(res, null, 'File deleted');
    } catch {
      ApiResponseUtil.notFound(res, 'File not found');
    }
  });

  static listUserFiles = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const cacheKey = `user:files:${userId}`;

    let files: any[] = [];
    try {
      const cached = await cacheService?.get(cacheKey);
      if (cached) files = cached as any[];
    } catch {}

    if (files.length === 0) {
      files = await UploadService.scanUserFiles(userId);
      try {
        await cacheService?.set(cacheKey, files, 300);
      } catch {}
    }

    ApiResponseUtil.success(res, { files });
  });

  private static async processFile(
    file: Express.Multer.File,
    userId: string,
    type: string
  ): Promise<string> {
    const filename = `${uuidv4()}-${file.originalname}`;
    const userDir = path.join(process.cwd(), 'uploads', userId);
    const filePath = path.join(userDir, filename);

    await fs.mkdir(userDir, { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    auditService
      ?.log({
        userId,
        action: 'UPLOAD_FILE',
        resource: 'File',
        metadata: { filename: file.originalname, type, size: file.size },
      })
      .catch(() => {});

    return `/uploads/${userId}/${filename}`;
  }

  private static async scanUserFiles(userId: string): Promise<any[]> {
    const userDir = path.join(process.cwd(), 'uploads', userId);

    try {
      const entries = await fs.readdir(userDir, { withFileTypes: true });
      const files = await Promise.all(
        entries
          .filter((dirent) => dirent.isFile())
          .map(async (dirent) => {
            const filePath = path.join(userDir, dirent.name);
            const stat = await fs.stat(filePath);
            return {
              filename: dirent.name,
              path: `/uploads/${userId}/${dirent.name}`,
              size: stat.size,
              mtime: stat.mtime.toISOString(),
            };
          })
      );
      return files;
    } catch {
      return [];
    }
  }
}

export const uploadService = UploadService;
