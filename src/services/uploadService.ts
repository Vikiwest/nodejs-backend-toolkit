import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { ApiResponseUtil } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';
import { cacheService } from '../services/cacheService';
import { auditService } from '../services/auditService';
import config from '../config/env';
import * as fs from 'fs/promises';
import * as path from 'path';

declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.Multer.File;
    files?: Express.Multer.File[];
  }
}

type MulterRequest = Request & AuthRequest;

if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

export class UploadService {
  static uploadSingle = asyncHandler(async (req: MulterRequest, res: Response) => {
    if (!req.file) {
      return ApiResponseUtil.badRequest(res, 'No file uploaded');
    }

    const fileUrl = await UploadService.processFile(req.file, req.user!.id, 'single');

    ApiResponseUtil.created(res, { filename: req.file.originalname, url: fileUrl });
  });

  static uploadMultiple = asyncHandler(async (req: MulterRequest, res: Response) => {
    if (!req.files || req.files.length === 0) {
      return ApiResponseUtil.badRequest(res, 'No files uploaded');
    }

    const results = await Promise.all(
      req.files.map((file) => UploadService.processFile(file, req.user!.id, 'multiple'))
    );

    ApiResponseUtil.created(res, { files: results });
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

    ApiResponseUtil.created(res, { avatar: fileUrl });
  });

  static uploadDocument = asyncHandler(async (req: MulterRequest, res: Response) => {
    if (!req.file || req.file.mimetype !== 'application/pdf') {
      return ApiResponseUtil.badRequest(res, 'PDF document required');
    }

    const fileUrl = await UploadService.processFile(req.file, req.user!.id, 'document');

    ApiResponseUtil.created(res, { filename: req.file.originalname, url: fileUrl });
  });

  static getFile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { filename } = req.params;

    if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
      const folderPath = `${config.cloudinary.folder}/${req.user!.id}`;
      const baseName = path.parse(filename).name;

      try {
        const searchResult = await cloudinary.search
          .expression(`folder:${folderPath} AND public_id:*${baseName}*`)
          .sort_by('uploaded_at', 'desc')
          .max_results(20)
          .execute();

        if (!searchResult.resources || searchResult.resources.length === 0) {
          return ApiResponseUtil.notFound(res, 'File not found');
        }

        const resource = searchResult.resources[0];
        ApiResponseUtil.success(res, {
          url: resource.secure_url || resource.url,
          filename: resource.original_filename
            ? `${resource.original_filename}.${resource.format}`
            : filename,
          size: resource.bytes,
          uploadedAt: resource.created_at,
        });
      } catch {
        ApiResponseUtil.notFound(res, 'File not found');
      }

      return;
    }

    const userDir = path.join(process.cwd(), 'uploads', req.user!.id);

    try {
      const files = await fs.readdir(userDir);
      // Find file by matching the original filename (stored as {uuid}-{originalname})
      const matchedFile = files.find((f) => f.includes(filename) || f.endsWith(filename));

      if (!matchedFile) {
        return ApiResponseUtil.notFound(res, 'File not found');
      }

      const filePath = path.join(userDir, matchedFile);
      await fs.access(filePath);

      const stat = await fs.stat(filePath);
      ApiResponseUtil.success(res, {
        url: `/uploads/${req.user!.id}/${matchedFile}`,
        filename: filename,
        size: stat.size,
        uploadedAt: stat.mtime.toISOString(),
      });
    } catch {
      ApiResponseUtil.notFound(res, 'File not found');
    }
  });

  static deleteFile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { filename } = req.params;

    if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
      const folderPath = `${config.cloudinary.folder}/${req.user!.id}`;
      const baseName = path.parse(filename).name;

      try {
        const searchResult = await cloudinary.search
          .expression(`folder:${folderPath} AND public_id:*${baseName}*`)
          .sort_by('uploaded_at', 'desc')
          .max_results(20)
          .execute();

        if (!searchResult.resources || searchResult.resources.length === 0) {
          return ApiResponseUtil.notFound(res, 'File not found');
        }

        const resource = searchResult.resources[0];
        await cloudinary.uploader.destroy(resource.public_id, { resource_type: 'auto' });

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

      return;
    }

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
      if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
        files = await UploadService.scanCloudinaryFiles(userId);
      } else {
        files = await UploadService.scanUserFiles(userId);
      }

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
    if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
      const fileUrl = await UploadService.uploadToCloudinary(file, userId);

      auditService
        ?.log({
          userId,
          action: 'UPLOAD_FILE',
          resource: 'File',
          metadata: { filename: file.originalname, type, size: file.size, provider: 'cloudinary' },
        })
        .catch(() => {});

      return fileUrl;
    }

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

  private static async uploadToCloudinary(
    file: Express.Multer.File,
    userId: string
  ): Promise<string> {
    const folder = `${config.cloudinary.folder}/${userId}`;
    const publicId = `${uuidv4()}-${path.parse(file.originalname).name}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload failed'));
          }
          resolve(result.secure_url || result.url);
        }
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  private static async scanCloudinaryFiles(userId: string): Promise<any[]> {
    const folderPath = `${config.cloudinary.folder}/${userId}`;

    try {
      const searchResult = await cloudinary.search
        .expression(`folder:${folderPath}`)
        .sort_by('uploaded_at', 'desc')
        .max_results(100)
        .execute();

      return (searchResult.resources || []).map((resource: any) => ({
        filename: resource.original_filename
          ? `${resource.original_filename}.${resource.format}`
          : path.basename(resource.public_id),
        path: resource.secure_url || resource.url,
        url: resource.secure_url || resource.url,
        size: resource.bytes,
        mtime: resource.created_at,
      }));
    } catch {
      return [];
    }
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
