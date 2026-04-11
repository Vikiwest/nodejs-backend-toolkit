import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { uploadService } from '../services/uploadService';

const router = Router();

// Multer config - shared across endpoints
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else cb(null, false);
  },
});

// Auth middleware for all
router.use(authMiddleware());

/**
 * @swagger
 * /uploads/single:
 *   post:
 *     summary: Upload single file
 *     description: Upload a single file (image/PDF). Max 10MB.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *     responses:
 *       201:
 *         description: Success with file URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     size:
 *                       type: number
 *       400:
 *         description: No file or invalid type
 *       401:
 *         description: Unauthorized
 */
router.post('/single', upload.single('file'), uploadService.uploadSingle);

/**
 * @swagger
 * /uploads/multiple:
 *   post:
 *     summary: Upload multiple files
 *     description: Upload up to 5 files at once. Max 10MB each.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Files to upload
 *     responses:
 *       201:
 *         description: Success with file URLs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                       filename:
 *                         type: string
 *                       size:
 *                         type: number
 *       400:
 *         description: No files or invalid type
 */
router.post('/multiple', upload.array('files', 5), uploadService.uploadMultiple);

/**
 * @swagger
 * /uploads/avatar:
 *   post:
 *     summary: Upload user avatar
 *     description: Upload and set user avatar image. Max 10MB.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image
 *     responses:
 *       201:
 *         description: Avatar URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     size:
 *                       type: number
 *       400:
 *         description: Invalid image
 */
router.post('/avatar', upload.single('avatar'), uploadService.uploadAvatar);

/**
 * @swagger
 * /uploads/document:
 *   post:
 *     summary: Upload document
 *     description: Upload PDF document. Max 10MB.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: PDF document
 *     responses:
 *       201:
 *         description: Document URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     size:
 *                       type: number
 *       400:
 *         description: Not PDF
 */
router.post('/document', upload.single('document'), uploadService.uploadDocument);

/**
 * @swagger
 * /uploads/{filename}:
 *   get:
 *     summary: Get file by filename
 *     description: Get information about uploaded file (ownership check).
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Filename
 *     responses:
 *       200:
 *         description: File details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     size:
 *                       type: number
 *                     uploadedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: File not found
 */
router.get('/:filename', uploadService.getFile);

/**
 * @swagger
 * /uploads/{filename}:
 *   delete:
 *     summary: Delete file
 *     description: Delete a file uploaded by the user.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Filename to delete
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Not found
 */
router.delete('/:filename', uploadService.deleteFile);

/**
 * @swagger
 * /uploads/list:
 *   get:
 *     summary: List user's files
 *     description: List all files uploaded by the current user.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user files with sizes/paths
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                       url:
 *                         type: string
 *                       size:
 *                         type: number
 *                       uploadedAt:
 *                         type: string
 *                         format: date-time
 */
router.get('/list', uploadService.listUserFiles);

export default router;
