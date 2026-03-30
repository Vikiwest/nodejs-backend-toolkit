import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import auditRoutes from './audit.routes';
import uploadRoutes from './upload.routes';
import dashboardRoutes from './dashboard.routes';
import paymentRoutes from './payment.routes';
import emailRoutes from './email.routes';
import searchRoutes from './search.routes';
import notificationRoutes from './notification.routes';
import monitoringRoutes from './monitoring.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/audit', auditRoutes);
router.use('/uploads', uploadRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/payments', paymentRoutes);
router.use('/email', emailRoutes);
router.use('/search', searchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/monitoring', monitoringRoutes);

export default router;
