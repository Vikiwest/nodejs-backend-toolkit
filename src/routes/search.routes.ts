import { Router } from 'express';
import { SearchController } from '@/controllers/search.controller';
import { authMiddleware, requireRole } from '@/middleware/auth';

const router = Router();

/**
 * @summary Search users
 * @description Search users by name/email
 * @tags Search
 * @security bearerAuth
 * @query q page limit
 * @response 200 - Matching users
 */
router.get('/users', authMiddleware(), SearchController.searchUsers);

/**
 * @summary Global search
 * @description Search across users, payments, activity
 * @tags Search
 * @security bearerAuth
 * @query q type page
 * @response 200 - Search results
 */
router.get('/all', authMiddleware(), SearchController.globalSearch);

/**
 * @summary Search suggestions
 * @description Get autocomplete suggestions
 * @tags Search
 * @security bearerAuth
 * @query q limit=5
 * @response 200 - Suggestions list
 */
router.get('/suggest', authMiddleware(), SearchController.suggestions);

/**
 * @summary Search history
 * @description Get user's recent searches
 * @tags Search
 * @security bearerAuth
 * @query limit
 * @response 200 - Search history
 */
router.get('/history', authMiddleware(), SearchController.searchHistory);

/**
 * @summary Reindex search
 * @description Admin rebuild search index
 * @tags Search
 * @security bearerAuth
 * @response 200 - Reindex started
 */
router.post('/reindex', authMiddleware(), requireRole('admin'), SearchController.reindex);

export default router;
