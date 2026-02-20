import { Request, Response } from 'express';
import learningService from '../services/learningService';
import { sendSuccess, sendError } from '../utils/response';

/**
 * GET /api/learning
 * Get all published learning content (with user progress if authenticated)
 */
export const getContent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const content = await learningService.getPublishedContent(userId);
    sendSuccess(res, { content });
  } catch (error: any) {
    sendError(res, error.message);
  }
};

/**
 * GET /api/learning/:slug
 * Get a single content item by slug
 */
export const getContentBySlug = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const content = await learningService.getContentBySlug(req.params.slug, userId);

    if (!content) {
      return sendError(res, 'Content not found', 404);
    }

    sendSuccess(res, { content });
  } catch (error: any) {
    sendError(res, error.message);
  }
};

/**
 * POST /api/learning/:id/complete
 * Mark content as completed and claim reward
 */
export const completeContent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const contentId = req.params.id;
    const { timeSpentSeconds } = req.body;

    if (!timeSpentSeconds || timeSpentSeconds < 0) {
      return sendError(res, 'timeSpentSeconds is required and must be positive', 400);
    }

    const result = await learningService.markCompleted(userId, contentId, timeSpentSeconds);
    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, error.message, error.message.includes('not found') ? 404 : 400);
  }
};
