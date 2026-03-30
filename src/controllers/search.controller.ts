import { Request, Response } from 'express';
import { searchService } from '@/services/searchService';
import { ApiResponseUtil } from '@/utils/apiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { AuthRequest } from '@/types';

export class SearchController {
  /**
   * @swagger
   * /api/search/users:
   *   get:
   *     summary: Search users
   *     tags: [Search]
   *     parameters:
   *       - in: query
   *         name: q
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Search results
   */
  static searchUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q, page = 1, limit = 10 } = req.query;

    const results = await searchService.searchUsers(q as string, {
      page: Number(page),
      limit: Number(limit),
    });

    ApiResponseUtil.success(res, results);
  });

  static globalSearch = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q, type = 'all' } = req.query;

    const results = await searchService.globalSearch(q as string, type as string);

    ApiResponseUtil.success(res, results);
  });

  static reindex = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Admin only - stub
    await searchService.reindexAll();

    ApiResponseUtil.success(res, null, 'Reindex complete');
  });

  static suggestions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q } = req.query;

    const suggestions = await searchService.getSuggestions(q as string);

    ApiResponseUtil.success(res, suggestions);
  });

  static searchHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Stub
    const history = [];
    ApiResponseUtil.success(res, history);
  });
}
