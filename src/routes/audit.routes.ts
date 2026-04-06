import { Router } from 'express';
import Joi from 'joi';
import { AuditController } from '../controllers/audit.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Validation schemas
const auditQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('timestamp'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    action: Joi.string(),
    resource: Joi.string(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
  }),
};

// All audit routes require admin authentication
router.use(authMiddleware());
router.use(requireRole('admin', 'super_admin'));

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get audit logs
 *     description: Paginated audit logs with advanced filtering
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: timestamp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Audit logs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/', validate(auditQuerySchema), AuditController.getAuditLogs);

/**
 * @swagger
 * /audit/{id}:
 *   get:
 *     summary: Get specific audit log
 *     description: Get single audit log by ID
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit log ID
 *     responses:
 *       200:
 *         description: Audit log details
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
 *                     _id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     action:
 *                       type: string
 *                     resource:
 *                       type: string
 *                     resourceId:
 *                       type: string
 *                     changes:
 *                       type: object
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Audit log not found
 */
router.get('/:id', AuditController.getAuditLogById);

/**
 * @swagger
 * /audit/stats:
 *   get:
 *     summary: Get audit statistics
 *     description: Action/resource counts and trends
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: '30d'
 *     responses:
 *       200:
 *         description: Audit stats
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
 *                     totalLogs:
 *                       type: number
 *                     actions:
 *                       type: object
 *                     resources:
 *                       type: object
 *                     dailyStats:
 *                       type: array
 */
router.get('/stats', AuditController.getAuditStats);

/**
 * @swagger
 * /audit/export:
 *   get:
 *     summary: Export audit logs
 *     description: Download filtered audit logs as CSV
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
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
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: timestamp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: CSV download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: array
 */
router.get('/export', AuditController.exportAuditLogs);

/**
 * @swagger
 * /audit/user/{userId}:
 *   get:
 *     summary: Get logs for specific user
 *     description: Get all audit logs for specific user
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: User ID
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
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: timestamp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: User audit trail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get(
  '/user/:userId',
  validate({
    params: Joi.object({
      userId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required(),
    }),
    query: auditQuerySchema.query,
  }),
  AuditController.getUserAuditLogs
);

/**
 * @swagger
 * /audit/resource/{type}/{id}:
 *   get:
 *     summary: Get logs for specific resource
 *     description: Get audit logs for specific resource
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource type
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource ID
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
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: timestamp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Resource audit trail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get(
  '/resource/:type/:id',
  validate({
    params: Joi.object({
      type: Joi.string().required(),
      id: Joi.string().required(),
    }),
    query: auditQuerySchema.query,
  }),
  AuditController.getResourceAuditLogs
);

/**
 * @swagger
 * /audit/cleanup:
 *   delete:
 *     summary: Clean old audit logs
 *     description: Delete audit logs older than specified days (admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 90
 *         description: Days to keep logs
 *     responses:
 *       200:
 *         description: Cleanup completed
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
 *                     deletedCount:
 *                       type: number
 */
router.delete('/cleanup', requireRole('super_admin'), AuditController.cleanupAuditLogs);

export default router;
