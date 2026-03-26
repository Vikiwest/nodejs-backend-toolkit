import { Router } from 'express';
import Joi from 'joi';
import { AuditController } from '@/controllers/audit.controller';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { validate } from '@/middleware/validation';

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

// Audit log endpoints
router.get('/', validate(auditQuerySchema), AuditController.getAuditLogs);
router.get('/stats', AuditController.getAuditStats);
router.get('/export', AuditController.exportAuditLogs);
router.get('/user/:userId', validate({
  params: Joi.object({
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  }),
  query: auditQuerySchema.query,
}), AuditController.getUserAuditLogs);

export default router;