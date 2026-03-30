import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '@/middleware/auth';
import { uploadService } from '@/services/uploadService';

const router = Router();

// Multer config - shared across endpoints
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else cb(new Error('Invalid file type: Images or PDF only'), false);
  },
});

// Auth middleware for all
router.use(authMiddleware());

/**
 * @summary Upload single file
 * @description Upload a single file (image/PDF). Max 10MB.
 * @tags Upload
 * @security bearerAuth
 * @consumes multipart/form-data
 * @param file formData file.required true "File to upload"
 * @response 201 - Success with file URL
 * @response 400 - No file or invalid type
 * @response 401 - Unauthorized
 */
router.post('/single', upload.single('file'), uploadService.uploadSingle);

/**
 * @summary Upload multiple files
 * @description Upload up to 5 files at once. Max 10MB each.
 * @tags Upload
 * @security bearerAuth
 * @consumes multipart/form-data
 * @param files formData file[] "Files to upload"
 * @response 201 - Success with file URLs
 * @response 400 - No files or invalid type
 */
router.post('/multiple', upload.array('files', 5), uploadService.uploadMultiple);

/**
 * @summary Upload user avatar
 * @description Upload and set user avatar image. Max 10MB.
 * @tags Upload
 * @security bearerAuth
 * @consumes multipart/form-data
 * @param avatar formData file.required true "Avatar image"
 * @response 201 - Avatar URL
 * @response 400 - Invalid image
 */
router.post('/avatar', upload.single('avatar'), uploadService.uploadAvatar);

/**
 * @summary Upload document
 * @description Upload PDF document. Max 10MB.
 * @tags Upload
 * @security bearerAuth
 * @consumes multipart/form-data
 * @param document formData file.required true "PDF document"
 * @response 201 - Document URL
 * @response 400 - Not PDF
 */
router.post('/document', upload.single('document'), uploadService.uploadDocument);

/**
 * @summary Get file info
 * @description Get information about uploaded file (ownership check).
 * @tags Upload
 * @security bearerAuth
 * @param filename path string.required true "Filename"
 * @response 200 - File details
 * @response 404 - File not found
 */
router.get('/:filename', uploadService.getFile);

/**
 * @summary Delete user file
 * @description Delete a file uploaded by the user.
 * @tags Upload
 * @security bearerAuth
 * @param filename path string.required true "Filename to delete"
 * @response 200 - Deleted
 * @response 404 - Not found
 */
router.delete('/:filename', uploadService.deleteFile);

/**
 * @summary List user files
 * @description List all files uploaded by the current user.
 * @tags Upload
 * @security bearerAuth
 * @response 200 - List of user files with sizes/paths
 */
router.get('/list', uploadService.listUserFiles);

export default router;

