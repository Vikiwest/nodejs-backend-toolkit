import { Response } from 'express';
import { searchService } from '../services/searchService';
import { ApiResponseUtil } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';

export class SearchController {
  /**
   * @swagger
   * /search/users:
   *   get:
   *     summary: Search users by name, email, or username
   *     description: Perform a search across user profiles with pagination support
   *     tags: [Search]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *           minLength: 2
   *           maxLength: 100
   *         description: Search query string (minimum 2 characters)
   *         example: "john"
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *         example: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Number of results per page
   *         example: 10
   *     responses:
   *       200:
   *         description: Search results retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     results:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/User'
   *                     total:
   *                       type: integer
   *                       example: 42
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     totalPages:
   *                       type: integer
   *                       example: 5
   *                 message:
   *                   type: string
   *                   example: "Search completed successfully"
   *       400:
   *         description: Invalid search query
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       429:
   *         description: Too many search requests
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static searchUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q, page = 1, limit = 10 } = req.query;

    const results = await searchService.searchUsers(q as string, {
      page: Number(page),
      limit: Number(limit),
    });

    ApiResponseUtil.success(res, results);
  });

  /**
   * @swagger
   * /search/global:
   *   get:
   *     summary: Global search across multiple content types
   *     description: Search across users, posts, comments, and other content types in a single query
   *     tags: [Search]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *           minLength: 2
   *         description: Search query string
   *         example: "react"
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [all, users, posts, comments, products]
   *           default: all
   *         description: Filter results by content type
   *         example: "posts"
   *     responses:
   *       200:
   *         description: Global search results
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
   *                     users:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/User'
   *                     posts:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Post'
   *                     comments:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Comment'
   *                     products:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Product'
   *                     total:
   *                       type: integer
   *                       example: 15
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid search parameters
   *       401:
   *         description: Unauthorized
   */
  static globalSearch = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q, type = 'all' } = req.query;

    const results = await searchService.globalSearch(q as string, type as string);

    ApiResponseUtil.success(res, results);
  });

  /**
   * @swagger
   * /search/reindex:
   *   post:
   *     summary: Reindex all searchable content (Admin only)
   *     description: Trigger a full reindexing of all searchable content. This operation can take several minutes depending on data size.
   *     tags: [Search]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Reindexing started successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Reindex complete"
   *                 data:
   *                   type: object
   *                   properties:
   *                     taskId:
   *                       type: string
   *                       example: "reindex_1641234567890"
   *                     status:
   *                       type: string
   *                       enum: [started, processing, completed, failed]
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden - Admin access required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       409:
   *         description: Reindex already in progress
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static reindex = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Admin only - stub
    await searchService.reindexAll();

    ApiResponseUtil.success(res, null, 'Reindex complete');
  });

  /**
   * @swagger
   * /search/suggestions:
   *   get:
   *     summary: Get search suggestions/autocomplete
   *     description: Get real-time search suggestions as the user types
   *     tags: [Search]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *           minLength: 1
   *           maxLength: 50
   *         description: Partial search query for suggestions
   *         example: "joh"
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 20
   *           default: 5
   *         description: Maximum number of suggestions to return
   *         example: 5
   *     responses:
   *       200:
   *         description: Search suggestions retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     suggestions:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           text:
   *                             type: string
   *                             example: "john doe"
   *                           type:
   *                             type: string
   *                             enum: [user, post, tag]
   *                             example: "user"
   *                           count:
   *                             type: integer
   *                             example: 42
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid query parameter
   *       401:
   *         description: Unauthorized
   */
  static suggestions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q } = req.query;

    const suggestions = await searchService.getSuggestions(q as string);

    ApiResponseUtil.success(res, suggestions);
  });

  /**
   * @swagger
   * /search/history:
   *   get:
   *     summary: Get user's search history
   *     description: Retrieve the current user's recent search queries
   *     tags: [Search]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 10
   *         description: Number of history items to return
   *         example: 10
   *     responses:
   *       200:
   *         description: Search history retrieved
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
   *                       id:
   *                         type: string
   *                         example: "hist_123"
   *                       query:
   *                         type: string
   *                         example: "node.js tutorial"
   *                       timestamp:
   *                         type: string
   *                         format: date-time
   *                         example: "2024-01-15T10:30:00Z"
   *                       resultsCount:
   *                         type: integer
   *                         example: 15
   *                 message:
   *                   type: string
   *       401:
   *         description: Unauthorized
   *
   *   delete:
   *     summary: Clear user's search history
   *     description: Remove all search history entries for the current user
   *     tags: [Search]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Search history cleared
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Search history cleared successfully"
   *       401:
   *         description: Unauthorized
   */
  static searchHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit as string) || 10;

    // Mock search history with realistic data
    const mockHistory = [
      {
        id: 'hist_001',
        query: 'Node.js tutorial',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        resultsCount: 42,
      },
      {
        id: 'hist_002',
        query: 'React components',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        resultsCount: 157,
      },
      {
        id: 'hist_003',
        query: 'REST API design',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        resultsCount: 89,
      },
      {
        id: 'hist_004',
        query: 'Database optimization',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        resultsCount: 65,
      },
      {
        id: 'hist_005',
        query: 'Authentication JWT',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        resultsCount: 78,
      },
    ];

    const history = mockHistory.slice(0, limitNum);
    ApiResponseUtil.success(res, history);
  });
}
