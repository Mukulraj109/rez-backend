import { Activity } from '../models/Activity';
import Follow from '../models/Follow';
import ActivityInteraction from '../models/ActivityInteraction';
import { User } from '../models/User';
import mongoose from 'mongoose';

/**
 * Get activity feed for user (activities from people they follow)
 */
export async function getActivityFeed(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<any[]> {
  try {
    // Get list of users this user follows
    const following = await Follow.find({ follower: userId }).select('following');
    const followingIds = following.map(f => f.following);

    // Include user's own activities
    followingIds.push(new mongoose.Types.ObjectId(userId));

    const skip = (page - 1) * limit;

    // Fetch activities
    const activities = await Activity.find({
      user: { $in: followingIds }
    })
      .populate('user', 'name profilePicture email')
      .populate('relatedEntity.id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get interaction status for current user
    const activityIds = activities.map(a => a._id);
    const userInteractions = await ActivityInteraction.find({
      activity: { $in: activityIds },
      user: userId
    });

    const interactionMap = new Map();
    userInteractions.forEach(interaction => {
      const key = `${interaction.activity}_${interaction.type}`;
      interactionMap.set(key, true);
    });

    // Add interaction flags and transform for social feed
    return activities.map(activity => ({
      ...activity,
      hasLiked: interactionMap.has(`${activity._id}_like`),
      hasCommented: interactionMap.has(`${activity._id}_comment`),
      // Format for social feed display
      feedContent: {
        title: activity.title,
        description: activity.description,
        amount: activity.amount,
        icon: activity.icon,
        color: activity.color,
        type: activity.type
      }
    }));
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    throw error;
  }
}

/**
 * Get user's own activities (for profile page)
 */
export async function getUserActivities(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<any[]> {
  try {
    const skip = (page - 1) * limit;

    const activities = await Activity.find({ user: userId })
      .populate('relatedEntity.id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return activities;
  } catch (error) {
    console.error('Error fetching user activities:', error);
    throw error;
  }
}

/**
 * Create activity for social feed
 */
export async function createSocialActivity(
  userId: string,
  type: string,
  data: {
    title: string;
    description?: string;
    amount?: number;
    icon?: string;
    color?: string;
    relatedEntity?: { id: string; type: string };
    metadata?: Record<string, any>;
  }
): Promise<any> {
  try {
    const activity = await Activity.create({
      user: userId,
      type,
      title: data.title,
      description: data.description,
      amount: data.amount,
      icon: data.icon || 'information-circle',
      color: data.color || '#6B7280',
      relatedEntity: data.relatedEntity,
      metadata: data.metadata
    });

    const populatedActivity = await Activity.findById(activity._id)
      .populate('user', 'name profilePicture email')
      .lean();

    return populatedActivity;
  } catch (error) {
    console.error('Error creating social activity:', error);
    throw error;
  }
}

/**
 * Like/Unlike activity
 */
export async function toggleLike(activityId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
  try {
    const existingLike = await ActivityInteraction.findOne({
      activity: activityId,
      user: userId,
      type: 'like'
    });

    let likesCount = 0;

    if (existingLike) {
      // Unlike
      await existingLike.deleteOne();

      // Get updated count
      likesCount = await ActivityInteraction.countDocuments({
        activity: activityId,
        type: 'like'
      });

      return { liked: false, likesCount };
    } else {
      // Like
      await ActivityInteraction.create({
        activity: activityId,
        user: userId,
        type: 'like'
      });

      // Get updated count
      likesCount = await ActivityInteraction.countDocuments({
        activity: activityId,
        type: 'like'
      });

      return { liked: true, likesCount };
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
}

/**
 * Get likes count for activity
 */
export async function getLikesCount(activityId: string): Promise<number> {
  try {
    return await ActivityInteraction.countDocuments({
      activity: activityId,
      type: 'like'
    });
  } catch (error) {
    console.error('Error getting likes count:', error);
    throw error;
  }
}

/**
 * Get comments for activity
 */
export async function getActivityComments(
  activityId: string,
  page: number = 1,
  limit: number = 20
): Promise<any[]> {
  try {
    const skip = (page - 1) * limit;

    const comments = await ActivityInteraction.find({
      activity: activityId,
      type: 'comment'
    })
      .populate('user', 'name profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return comments;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
}

/**
 * Add comment to activity
 */
export async function addComment(
  activityId: string,
  userId: string,
  comment: string
): Promise<any> {
  try {
    if (!comment || comment.trim().length === 0) {
      throw new Error('Comment cannot be empty');
    }

    const interaction = await ActivityInteraction.create({
      activity: activityId,
      user: userId,
      type: 'comment',
      comment: comment.trim()
    });

    const populatedComment = await ActivityInteraction.findById(interaction._id)
      .populate('user', 'name profilePicture')
      .lean();

    return populatedComment;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

/**
 * Follow/Unfollow user
 */
export async function toggleFollow(
  followerId: string,
  followingId: string
): Promise<{ following: boolean; followersCount: number }> {
  try {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: followingId
    });

    let followersCount = 0;

    if (existingFollow) {
      // Unfollow
      await existingFollow.deleteOne();

      // Get updated follower count
      followersCount = await Follow.countDocuments({ following: followingId });

      return { following: false, followersCount };
    } else {
      // Follow
      await Follow.create({
        follower: followerId,
        following: followingId
      });

      // Get updated follower count
      followersCount = await Follow.countDocuments({ following: followingId });

      return { following: true, followersCount };
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    throw error;
  }
}

/**
 * Check if user is following another user
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  try {
    const follow = await Follow.findOne({
      follower: followerId,
      following: followingId
    });

    return !!follow;
  } catch (error) {
    console.error('Error checking follow status:', error);
    throw error;
  }
}

/**
 * Get user's followers
 */
export async function getFollowers(
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<any[]> {
  try {
    const skip = (page - 1) * limit;

    const followers = await Follow.find({ following: userId })
      .populate('follower', 'name profilePicture email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return followers.map(f => f.follower);
  } catch (error) {
    console.error('Error fetching followers:', error);
    throw error;
  }
}

/**
 * Get user's following list
 */
export async function getFollowing(
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<any[]> {
  try {
    const skip = (page - 1) * limit;

    const following = await Follow.find({ follower: userId })
      .populate('following', 'name profilePicture email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return following.map(f => f.following);
  } catch (error) {
    console.error('Error fetching following:', error);
    throw error;
  }
}

/**
 * Get follower/following counts for user
 */
export async function getFollowCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
  try {
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId })
    ]);

    return { followersCount, followingCount };
  } catch (error) {
    console.error('Error fetching follow counts:', error);
    throw error;
  }
}

/**
 * Get suggested users to follow (users with most followers that current user doesn't follow)
 */
export async function getSuggestedUsers(userId: string, limit: number = 10): Promise<any[]> {
  try {
    // Get users current user already follows
    const following = await Follow.find({ follower: userId }).select('following');
    const followingIds = following.map(f => f.following.toString());
    followingIds.push(userId); // Exclude self

    // Get users with most followers
    const suggestedUsers = await Follow.aggregate([
      {
        $match: {
          following: { $nin: followingIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: '$following',
          followersCount: { $sum: 1 }
        }
      },
      {
        $sort: { followersCount: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: '$user._id',
          name: '$user.name',
          profilePicture: '$user.profilePicture',
          email: '$user.email',
          followersCount: 1
        }
      }
    ]);

    return suggestedUsers;
  } catch (error) {
    console.error('Error fetching suggested users:', error);
    throw error;
  }
}

/**
 * Share activity
 */
export async function shareActivity(activityId: string, userId: string): Promise<void> {
  try {
    await ActivityInteraction.create({
      activity: activityId,
      user: userId,
      type: 'share'
    });
  } catch (error) {
    console.error('Error sharing activity:', error);
    throw error;
  }
}

/**
 * Get activity statistics
 */
export async function getActivityStats(activityId: string): Promise<{
  likes: number;
  comments: number;
  shares: number;
}> {
  try {
    const [likes, comments, shares] = await Promise.all([
      ActivityInteraction.countDocuments({ activity: activityId, type: 'like' }),
      ActivityInteraction.countDocuments({ activity: activityId, type: 'comment' }),
      ActivityInteraction.countDocuments({ activity: activityId, type: 'share' })
    ]);

    return { likes, comments, shares };
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    throw error;
  }
}
