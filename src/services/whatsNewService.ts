// WhatsNew Service
// Business logic for What's New stories feature

import WhatsNewStory, { IWhatsNewStory } from '../models/WhatsNewStory';
import WhatsNewStoryView from '../models/WhatsNewStoryView';
import { Types, Document } from 'mongoose';

export interface GetStoriesOptions {
  userId?: string;
  includeViewed?: boolean;
}

export interface StoryWithViewStatus extends Omit<IWhatsNewStory, keyof Document> {
  _id: Types.ObjectId;
  hasViewed?: boolean;
  hasCompleted?: boolean;
}

class WhatsNewService {
  /**
   * Get active stories for a user
   */
  async getStoriesForUser(options: GetStoriesOptions = {}): Promise<StoryWithViewStatus[]> {
    const { userId, includeViewed = true } = options;

    // Get all active stories
    const stories = await WhatsNewStory.findActiveStories();

    if (!userId) {
      return stories.map(story => ({
        ...story.toObject(),
        hasViewed: false,
        hasCompleted: false,
      }));
    }

    // Get user's view history
    const userObjectId = new Types.ObjectId(userId);
    const views = await WhatsNewStoryView.find({
      userId: userObjectId,
      storyId: { $in: stories.map(s => s._id) },
    });

    const viewMap = new Map(
      views.map(v => [v.storyId.toString(), { viewed: true, completed: v.completed }])
    );

    // Map stories with view status
    const storiesWithStatus = stories.map(story => ({
      ...story.toObject(),
      hasViewed: viewMap.has(story._id.toString()),
      hasCompleted: viewMap.get(story._id.toString())?.completed || false,
    }));

    // Filter out viewed stories if requested
    if (!includeViewed) {
      return storiesWithStatus.filter(s => !s.hasViewed);
    }

    return storiesWithStatus;
  }

  /**
   * Get a single story by ID
   */
  async getStoryById(storyId: string, userId?: string): Promise<StoryWithViewStatus | null> {
    const story = await WhatsNewStory.findById(storyId);
    if (!story) return null;

    let hasViewed = false;
    let hasCompleted = false;

    if (userId) {
      const view = await WhatsNewStoryView.findOne({
        userId: new Types.ObjectId(userId),
        storyId: story._id,
      });
      hasViewed = !!view;
      hasCompleted = view?.completed || false;
    }

    return {
      ...story.toObject(),
      hasViewed,
      hasCompleted,
    };
  }

  /**
   * Track story view
   */
  async trackView(storyId: string, userId?: string): Promise<void> {
    // Increment global view count
    await WhatsNewStory.findByIdAndUpdate(storyId, {
      $inc: { 'analytics.views': 1 },
    });

    // Track user-specific view if logged in
    if (userId) {
      await WhatsNewStoryView.markAsViewed(
        new Types.ObjectId(userId),
        new Types.ObjectId(storyId)
      );
    }
  }

  /**
   * Track CTA click
   */
  async trackClick(storyId: string, userId?: string): Promise<void> {
    // Increment global click count
    await WhatsNewStory.findByIdAndUpdate(storyId, {
      $inc: { 'analytics.clicks': 1 },
    });

    // Track user-specific click if logged in
    if (userId) {
      await WhatsNewStoryView.markCtaClicked(
        new Types.ObjectId(userId),
        new Types.ObjectId(storyId)
      );
    }
  }

  /**
   * Track story completion (viewed all slides)
   */
  async trackCompletion(storyId: string, userId?: string): Promise<void> {
    // Increment global completion count
    await WhatsNewStory.findByIdAndUpdate(storyId, {
      $inc: { 'analytics.completions': 1 },
    });

    // Track user-specific completion if logged in
    if (userId) {
      await WhatsNewStoryView.markAsCompleted(
        new Types.ObjectId(userId),
        new Types.ObjectId(storyId)
      );
    }
  }

  /**
   * Get count of unseen stories for a user
   */
  async getUnseenCount(userId: string): Promise<number> {
    const activeStories = await WhatsNewStory.findActiveStories();
    if (!activeStories.length) return 0;

    return WhatsNewStoryView.getUnseenStoriesCount(
      new Types.ObjectId(userId),
      activeStories.map(s => s._id)
    );
  }

  /**
   * Check if user has any unseen stories
   */
  async hasUnseenStories(userId: string): Promise<boolean> {
    const count = await this.getUnseenCount(userId);
    return count > 0;
  }

  /**
   * Update slide progress for a story
   */
  async updateSlideProgress(storyId: string, userId: string, slideIndex: number): Promise<void> {
    await WhatsNewStoryView.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        storyId: new Types.ObjectId(storyId),
      },
      {
        $max: { slideProgress: slideIndex },
      }
    );
  }

  // ============ ADMIN METHODS ============

  /**
   * Create a new story (Admin)
   */
  async createStory(data: Partial<IWhatsNewStory>): Promise<IWhatsNewStory> {
    const story = new WhatsNewStory(data);
    return story.save();
  }

  /**
   * Update a story (Admin)
   */
  async updateStory(storyId: string, data: Partial<IWhatsNewStory>): Promise<IWhatsNewStory | null> {
    return WhatsNewStory.findByIdAndUpdate(storyId, data, { new: true });
  }

  /**
   * Delete a story (Admin) - Soft delete by setting isActive to false
   */
  async deleteStory(storyId: string): Promise<IWhatsNewStory | null> {
    return WhatsNewStory.findByIdAndUpdate(
      storyId,
      { 'validity.isActive': false },
      { new: true }
    );
  }

  /**
   * Hard delete a story (Admin)
   */
  async hardDeleteStory(storyId: string): Promise<boolean> {
    const result = await WhatsNewStory.findByIdAndDelete(storyId);
    if (result) {
      // Also delete all view records for this story
      await WhatsNewStoryView.deleteMany({ storyId: new Types.ObjectId(storyId) });
    }
    return !!result;
  }

  /**
   * Get all stories with analytics (Admin)
   */
  async getAllStoriesWithAnalytics(): Promise<IWhatsNewStory[]> {
    return WhatsNewStory.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');
  }

  /**
   * Get story analytics summary (Admin)
   */
  async getAnalyticsSummary(): Promise<{
    totalStories: number;
    activeStories: number;
    totalViews: number;
    totalClicks: number;
    totalCompletions: number;
    averageCompletionRate: number;
  }> {
    const allStories = await WhatsNewStory.find();
    const activeStories = await WhatsNewStory.findActiveStories();

    const totals = allStories.reduce(
      (acc, story) => ({
        views: acc.views + story.analytics.views,
        clicks: acc.clicks + story.analytics.clicks,
        completions: acc.completions + story.analytics.completions,
      }),
      { views: 0, clicks: 0, completions: 0 }
    );

    return {
      totalStories: allStories.length,
      activeStories: activeStories.length,
      totalViews: totals.views,
      totalClicks: totals.clicks,
      totalCompletions: totals.completions,
      averageCompletionRate: totals.views > 0 ? (totals.completions / totals.views) * 100 : 0,
    };
  }
}

export default new WhatsNewService();
