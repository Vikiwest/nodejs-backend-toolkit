import { Router } from 'express';
import { SearchController } from '@/controllers/search.controller';
import { authMiddleware, requireRole } from '@/middleware/auth';

const router = Router();

// Search endpoints - ALL from task
router.get('/users', authMiddleware(), SearchController.searchUsers);
router.get('/all', authMiddleware(), SearchController.globalSearch);
router.get('/suggest', authMiddleware(), SearchController.suggestions);
router.get('/history', authMiddleware(), SearchController.searchHistory);
router.post('/reindex', authMiddleware(), requireRole('admin'), SearchController.reindex);

export default router;
