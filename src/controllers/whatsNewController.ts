// WhatsNew Controller
// Handles API requests for What's New stories feature

import { Request, Response } from 'express';
import whatsNewService from '../services/whatsNewService';
import { sendSuccess, sendError, sendNotFound, sendCreated } from '../utils/response';

/**
 * Get active stories for the current user
 * GET /api/whats-new
 */
export const getActiveStories = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    const includeViewed = req.query.includeViewed !== 'false';

    const stories = await whatsNewService.getStoriesForUser({
      userId,
      includeViewed,
    });

    sendSuccess(res, stories, 'Stories fetched successfully');
  } catch (error: any) {
    console.error('Error fetching stories:', error);
    sendError(res, error.message || 'Failed to fetch stories', 500);
  }
};

/**
 * Get a single story by ID
 * GET /api/whats-new/:id
 */
export const getStoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?._id || (req as any).user?.id;

    const story = await whatsNewService.getStoryById(id, userId);

    if (!story) {
      sendNotFound(res, 'Story not found');
      return;
    }

    sendSuccess(res, story, 'Story fetched successfully');
  } catch (error: any) {
    console.error('Error fetching story:', error);
    sendError(res, error.message || 'Failed to fetch story', 500);
  }
};

/**
 * Track story view
 * POST /api/whats-new/:id/view
 */
export const trackView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?._id || (req as any).user?.id;

    await whatsNewService.trackView(id, userId);

    sendSuccess(res, null, 'View tracked successfully');
  } catch (error: any) {
    console.error('Error tracking view:', error);
    sendError(res, error.message || 'Failed to track view', 500);
  }
};

/**
 * Track CTA click
 * POST /api/whats-new/:id/click
 */
export const trackClick = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?._id || (req as any).user?.id;

    await whatsNewService.trackClick(id, userId);

    sendSuccess(res, null, 'Click tracked successfully');
  } catch (error: any) {
    console.error('Error tracking click:', error);
    sendError(res, error.message || 'Failed to track click', 500);
  }
};

/**
 * Track story completion
 * POST /api/whats-new/:id/complete
 */
export const trackCompletion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?._id || (req as any).user?.id;

    await whatsNewService.trackCompletion(id, userId);

    sendSuccess(res, null, 'Completion tracked successfully');
  } catch (error: any) {
    console.error('Error tracking completion:', error);
    sendError(res, error.message || 'Failed to track completion', 500);
  }
};

/**
 * Get unseen stories count for current user
 * GET /api/whats-new/unseen-count
 */
export const getUnseenCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;

    if (!userId) {
      // For non-authenticated users, count all active stories as unseen
      const stories = await whatsNewService.getStoriesForUser({});
      sendSuccess(res, { count: stories.length, hasUnseen: stories.length > 0 }, 'Unseen count fetched');
      return;
    }

    const count = await whatsNewService.getUnseenCount(userId);

    sendSuccess(res, { count, hasUnseen: count > 0 }, 'Unseen count fetched');
  } catch (error: any) {
    console.error('Error fetching unseen count:', error);
    sendError(res, error.message || 'Failed to fetch unseen count', 500);
  }
};

// ============ ADMIN CONTROLLERS ============

/**
 * Create a new story (Admin)
 * POST /api/admin/whats-new
 */
export const createStory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    const storyData = {
      ...req.body,
      createdBy: userId,
    };

    const story = await whatsNewService.createStory(storyData);

    sendCreated(res, story, 'Story created successfully');
  } catch (error: any) {
    console.error('Error creating story:', error);
    sendError(res, error.message || 'Failed to create story', 500);
  }
};

/**
 * Update a story (Admin)
 * PUT /api/admin/whats-new/:id
 */
export const updateStory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const story = await whatsNewService.updateStory(id, req.body);

    if (!story) {
      sendNotFound(res, 'Story not found');
      return;
    }

    sendSuccess(res, story, 'Story updated successfully');
  } catch (error: any) {
    console.error('Error updating story:', error);
    sendError(res, error.message || 'Failed to update story', 500);
  }
};

/**
 * Delete a story (Admin) - Soft delete
 * DELETE /api/admin/whats-new/:id
 */
export const deleteStory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const hardDelete = req.query.hard === 'true';

    if (hardDelete) {
      const success = await whatsNewService.hardDeleteStory(id);
      if (!success) {
        sendNotFound(res, 'Story not found');
        return;
      }
      sendSuccess(res, null, 'Story permanently deleted');
    } else {
      const story = await whatsNewService.deleteStory(id);
      if (!story) {
        sendNotFound(res, 'Story not found');
        return;
      }
      sendSuccess(res, story, 'Story deactivated successfully');
    }
  } catch (error: any) {
    console.error('Error deleting story:', error);
    sendError(res, error.message || 'Failed to delete story', 500);
  }
};

/**
 * Get all stories with analytics (Admin)
 * GET /api/admin/whats-new
 */
export const getAllStories = async (req: Request, res: Response): Promise<void> => {
  try {
    const stories = await whatsNewService.getAllStoriesWithAnalytics();

    sendSuccess(res, stories, 'Stories fetched successfully');
  } catch (error: any) {
    console.error('Error fetching all stories:', error);
    sendError(res, error.message || 'Failed to fetch stories', 500);
  }
};

/**
 * Get analytics summary (Admin)
 * GET /api/admin/whats-new/analytics
 */
export const getAnalyticsSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const summary = await whatsNewService.getAnalyticsSummary();

    sendSuccess(res, summary, 'Analytics summary fetched successfully');
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    sendError(res, error.message || 'Failed to fetch analytics', 500);
  }
};
