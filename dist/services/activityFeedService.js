"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivityFeed = getActivityFeed;
exports.getUserActivities = getUserActivities;
exports.createSocialActivity = createSocialActivity;
exports.toggleLike = toggleLike;
exports.getLikesCount = getLikesCount;
exports.getActivityComments = getActivityComments;
exports.addComment = addComment;
exports.toggleFollow = toggleFollow;
exports.isFollowing = isFollowing;
exports.getFollowers = getFollowers;
exports.getFollowing = getFollowing;
exports.getFollowCounts = getFollowCounts;
exports.getSuggestedUsers = getSuggestedUsers;
exports.shareActivity = shareActivity;
exports.getActivityStats = getActivityStats;
const Activity_1 = require("../models/Activity");
const Follow_1 = __importDefault(require("../models/Follow"));
const ActivityInteraction_1 = __importDefault(require("../models/ActivityInteraction"));
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Get activity feed for user (activities from people they follow)
 */
async function getActivityFeed(userId, page = 1, limit = 20) {
    try {
        // Get list of users this user follows
        const following = await Follow_1.default.find({ follower: userId }).select('following');
        const followingIds = following.map(f => f.following);
        // Include user's own activities
        followingIds.push(new mongoose_1.default.Types.ObjectId(userId));
        const skip = (page - 1) * limit;
        // Fetch activities
        const activities = await Activity_1.Activity.find({
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
        const userInteractions = await ActivityInteraction_1.default.find({
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
    }
    catch (error) {
        console.error('Error fetching activity feed:', error);
        throw error;
    }
}
/**
 * Get user's own activities (for profile page)
 */
async function getUserActivities(userId, page = 1, limit = 20) {
    try {
        const skip = (page - 1) * limit;
        const activities = await Activity_1.Activity.find({ user: userId })
            .populate('relatedEntity.id')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        return activities;
    }
    catch (error) {
        console.error('Error fetching user activities:', error);
        throw error;
    }
}
/**
 * Create activity for social feed
 */
async function createSocialActivity(userId, type, data) {
    try {
        const activity = await Activity_1.Activity.create({
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
        const populatedActivity = await Activity_1.Activity.findById(activity._id)
            .populate('user', 'name profilePicture email')
            .lean();
        return populatedActivity;
    }
    catch (error) {
        console.error('Error creating social activity:', error);
        throw error;
    }
}
/**
 * Like/Unlike activity
 */
async function toggleLike(activityId, userId) {
    try {
        const existingLike = await ActivityInteraction_1.default.findOne({
            activity: activityId,
            user: userId,
            type: 'like'
        });
        let likesCount = 0;
        if (existingLike) {
            // Unlike
            await existingLike.deleteOne();
            // Get updated count
            likesCount = await ActivityInteraction_1.default.countDocuments({
                activity: activityId,
                type: 'like'
            });
            return { liked: false, likesCount };
        }
        else {
            // Like
            await ActivityInteraction_1.default.create({
                activity: activityId,
                user: userId,
                type: 'like'
            });
            // Get updated count
            likesCount = await ActivityInteraction_1.default.countDocuments({
                activity: activityId,
                type: 'like'
            });
            return { liked: true, likesCount };
        }
    }
    catch (error) {
        console.error('Error toggling like:', error);
        throw error;
    }
}
/**
 * Get likes count for activity
 */
async function getLikesCount(activityId) {
    try {
        return await ActivityInteraction_1.default.countDocuments({
            activity: activityId,
            type: 'like'
        });
    }
    catch (error) {
        console.error('Error getting likes count:', error);
        throw error;
    }
}
/**
 * Get comments for activity
 */
async function getActivityComments(activityId, page = 1, limit = 20) {
    try {
        const skip = (page - 1) * limit;
        const comments = await ActivityInteraction_1.default.find({
            activity: activityId,
            type: 'comment'
        })
            .populate('user', 'name profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        return comments;
    }
    catch (error) {
        console.error('Error fetching comments:', error);
        throw error;
    }
}
/**
 * Add comment to activity
 */
async function addComment(activityId, userId, comment) {
    try {
        if (!comment || comment.trim().length === 0) {
            throw new Error('Comment cannot be empty');
        }
        const interaction = await ActivityInteraction_1.default.create({
            activity: activityId,
            user: userId,
            type: 'comment',
            comment: comment.trim()
        });
        const populatedComment = await ActivityInteraction_1.default.findById(interaction._id)
            .populate('user', 'name profilePicture')
            .lean();
        return populatedComment;
    }
    catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
}
/**
 * Follow/Unfollow user
 */
async function toggleFollow(followerId, followingId) {
    try {
        if (followerId === followingId) {
            throw new Error('Cannot follow yourself');
        }
        const existingFollow = await Follow_1.default.findOne({
            follower: followerId,
            following: followingId
        });
        let followersCount = 0;
        if (existingFollow) {
            // Unfollow
            await existingFollow.deleteOne();
            // Get updated follower count
            followersCount = await Follow_1.default.countDocuments({ following: followingId });
            return { following: false, followersCount };
        }
        else {
            // Follow
            await Follow_1.default.create({
                follower: followerId,
                following: followingId
            });
            // Get updated follower count
            followersCount = await Follow_1.default.countDocuments({ following: followingId });
            return { following: true, followersCount };
        }
    }
    catch (error) {
        console.error('Error toggling follow:', error);
        throw error;
    }
}
/**
 * Check if user is following another user
 */
async function isFollowing(followerId, followingId) {
    try {
        const follow = await Follow_1.default.findOne({
            follower: followerId,
            following: followingId
        });
        return !!follow;
    }
    catch (error) {
        console.error('Error checking follow status:', error);
        throw error;
    }
}
/**
 * Get user's followers
 */
async function getFollowers(userId, page = 1, limit = 50) {
    try {
        const skip = (page - 1) * limit;
        const followers = await Follow_1.default.find({ following: userId })
            .populate('follower', 'name profilePicture email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        return followers.map(f => f.follower);
    }
    catch (error) {
        console.error('Error fetching followers:', error);
        throw error;
    }
}
/**
 * Get user's following list
 */
async function getFollowing(userId, page = 1, limit = 50) {
    try {
        const skip = (page - 1) * limit;
        const following = await Follow_1.default.find({ follower: userId })
            .populate('following', 'name profilePicture email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        return following.map(f => f.following);
    }
    catch (error) {
        console.error('Error fetching following:', error);
        throw error;
    }
}
/**
 * Get follower/following counts for user
 */
async function getFollowCounts(userId) {
    try {
        const [followersCount, followingCount] = await Promise.all([
            Follow_1.default.countDocuments({ following: userId }),
            Follow_1.default.countDocuments({ follower: userId })
        ]);
        return { followersCount, followingCount };
    }
    catch (error) {
        console.error('Error fetching follow counts:', error);
        throw error;
    }
}
/**
 * Get suggested users to follow (users with most followers that current user doesn't follow)
 */
async function getSuggestedUsers(userId, limit = 10) {
    try {
        // Get users current user already follows
        const following = await Follow_1.default.find({ follower: userId }).select('following');
        const followingIds = following.map(f => f.following.toString());
        followingIds.push(userId); // Exclude self
        // Get users with most followers
        const suggestedUsers = await Follow_1.default.aggregate([
            {
                $match: {
                    following: { $nin: followingIds.map(id => new mongoose_1.default.Types.ObjectId(id)) }
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
    }
    catch (error) {
        console.error('Error fetching suggested users:', error);
        throw error;
    }
}
/**
 * Share activity
 */
async function shareActivity(activityId, userId) {
    try {
        await ActivityInteraction_1.default.create({
            activity: activityId,
            user: userId,
            type: 'share'
        });
    }
    catch (error) {
        console.error('Error sharing activity:', error);
        throw error;
    }
}
/**
 * Get activity statistics
 */
async function getActivityStats(activityId) {
    try {
        const [likes, comments, shares] = await Promise.all([
            ActivityInteraction_1.default.countDocuments({ activity: activityId, type: 'like' }),
            ActivityInteraction_1.default.countDocuments({ activity: activityId, type: 'comment' }),
            ActivityInteraction_1.default.countDocuments({ activity: activityId, type: 'share' })
        ]);
        return { likes, comments, shares };
    }
    catch (error) {
        console.error('Error fetching activity stats:', error);
        throw error;
    }
}
