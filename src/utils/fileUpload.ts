import multer from 'multer';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import path from 'path';
import crypto from 'crypto';
import config from '../config/env';

// Local storage configuration
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// S3 storage configuration
let s3Client: S3Client | null = null;
let s3Storage: any = null;

// Check if all required AWS credentials are present
if (config.aws.accessKeyId && config.aws.secretAccessKey && config.aws.s3Bucket) {
  s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey, // Now TypeScript knows this is defined
    },
  });

  s3Storage = multerS3({
    s3: s3Client,
    bucket: config.aws.s3Bucket,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });
}

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = config.upload.allowedTypes;
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
  }
};

// Create multer instance
export const upload = multer({
  storage:
    config.aws.s3Bucket && config.aws.accessKeyId && config.aws.secretAccessKey
      ? s3Storage
      : localStorage,
  limits: {
    fileSize: config.upload.maxSize,
  },
  fileFilter,
});

// Single file upload middleware
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

// Multiple files upload middleware
export const uploadMultiple = (fieldName: string, maxCount: number) =>
  upload.array(fieldName, maxCount);

// Fields upload middleware
export const uploadFields = (fields: Array<{ name: string; maxCount?: number }>) =>
  upload.fields(fields);
