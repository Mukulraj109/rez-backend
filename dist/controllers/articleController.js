"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementArticleShare = exports.toggleArticleBookmark = exports.toggleArticleLike = exports.searchArticles = exports.getFeaturedArticles = exports.getTrendingArticles = exports.getArticlesByCategory = exports.deleteArticle = exports.updateArticle = exports.getArticleById = exports.getArticles = exports.createArticle = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Article_1 = require("../models/Article");
const User_1 = require("../models/User");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
// Helper function to format view count for frontend
const formatViewCount = (views) => {
    if (views >= 100000) {
        return `${(views / 100000).toFixed(1)}L`;
    }
    else if (views >= 1000) {
        return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
};
// Create a new article
exports.createArticle = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { title, excerpt, content, coverImage, category, tags, products, stores, isPublished = false, scheduledAt } = req.body;
    try {
        console.log('📝 [ARTICLE] Creating article for user:', userId);
        // Validate required fields
        if (!title || !excerpt || !content || !coverImage) {
            return (0, response_1.sendBadRequest)(res, 'Title, excerpt, content, and cover image are required');
        }
        // Get user to determine authorType
        const user = await User_1.User.findById(userId);
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        // Determine author type based on user role
        const authorType = user.role === 'merchant' ? 'merchant' : 'user';
        // Create new article
        const article = new Article_1.Article({
            title,
            excerpt,
            content,
            coverImage,
            author: userId,
            authorType,
            category,
            tags: tags || [],
            products: products || [],
            stores: stores || [],
            isPublished,
            isApproved: false, // Requires manual approval
            isFeatured: false,
            moderationStatus: 'pending', // Changed from 'approved' to 'pending' for moderation workflow
            scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
            engagement: {
                likes: [],
                bookmarks: [],
                shares: 0,
                comments: 0
            },
            analytics: {
                totalViews: 0,
                uniqueViews: 0,
                avgReadTime: 0,
                completionRate: 0,
                engagementRate: 0,
                shareRate: 0,
                likeRate: 0,
                viewsByDate: new Map(),
                deviceBreakdown: {
                    mobile: 0,
                    tablet: 0,
                    desktop: 0
                }
            }
        });
        await article.save();
        console.log('✅ [ARTICLE] Article created successfully:', article._id);
        // Populate author info for response
        await article.populate('author', 'profile.firstName profile.lastName profile.avatar');
        (0, response_1.sendCreated)(res, {
            article: {
                id: article._id,
                title: article.title,
                excerpt: article.excerpt,
                content: article.content,
                coverImage: article.coverImage,
                author: article.author,
                authorType: article.authorType,
                category: article.category,
                tags: article.tags,
                readTime: article.readTime,
                isPublished: article.isPublished,
                viewCount: article.viewCount,
                analytics: article.analytics,
                createdAt: article.createdAt
            }
        }, 'Article created successfully');
    }
    catch (error) {
        console.error('❌ [ARTICLE] Create article error:', error);
        throw new errorHandler_1.AppError('Failed to create article', 500);
    }
});
// Get all articles with filtering
exports.getArticles = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category, author, isPublished, isFeatured, sortBy = 'newest', page = 1, limit = 20 } = req.query;
    try {
        const query = {};
        // Only show published and approved articles by default
        if (isPublished !== undefined) {
            query.isPublished = isPublished === 'true';
        }
        else {
            query.isPublished = true;
        }
        query.isApproved = true;
        query.moderationStatus = 'approved';
        // Apply filters
        if (category)
            query.category = category;
        if (author)
            query.author = author;
        if (isFeatured !== undefined)
            query.isFeatured = isFeatured === 'true';
        // Sorting
        const sortOptions = {};
        switch (sortBy) {
            case 'newest':
                sortOptions.publishedAt = -1;
                break;
            case 'popular':
                sortOptions['analytics.totalViews'] = -1;
                break;
            case 'trending':
                sortOptions['analytics.engagementRate'] = -1;
                break;
            default:
                sortOptions.publishedAt = -1;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const articles = await Article_1.Article.find(query)
            .populate('author', 'profile.firstName profile.lastName profile.avatar')
            .populate('products', 'name images pricing')
            .populate('stores', 'name slug logo')
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Article_1.Article.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        // Transform articles to include id and viewCount fields for frontend compatibility
        const transformedArticles = articles.map((article) => ({
            ...article,
            id: article._id.toString(),
            viewCount: formatViewCount(article.analytics?.totalViews || 0),
            author: article.author ? {
                id: article.author._id?.toString(),
                name: `${article.author.profile?.firstName || ''} ${article.author.profile?.lastName || ''}`.trim() || 'Unknown',
                avatar: article.author.profile?.avatar || '',
                role: article.authorType || 'user'
            } : undefined
        }));
        (0, response_1.sendSuccess)(res, {
            articles: transformedArticles,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, 'Articles retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch articles', 500);
    }
});
// Get single article by ID
exports.getArticleById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { articleId } = req.params;
    const userId = req.userId;
    try {
        const article = await Article_1.Article.findById(articleId)
            .populate('author', 'profile.firstName profile.lastName profile.avatar profile.bio role')
            .populate('products', 'name images pricing description store')
            .populate('stores', 'name slug logo')
            .lean();
        if (!article) {
            return (0, response_1.sendNotFound)(res, 'Article not found');
        }
        // Check if user can view this article
        if (!article.isPublished && article.author._id.toString() !== userId) {
            return (0, response_1.sendNotFound)(res, 'Article not found');
        }
        // Increment view count
        await Article_1.Article.findByIdAndUpdate(articleId, {
            $inc: { 'analytics.totalViews': 1 }
        });
        // Get author's other articles
        const otherArticles = await Article_1.Article.find({
            author: article.author._id,
            _id: { $ne: articleId },
            isPublished: true,
            isApproved: true
        })
            .populate('author', 'profile.firstName profile.lastName profile.avatar')
            .limit(5)
            .sort({ publishedAt: -1 })
            .lean();
        // Check if user liked/bookmarked this article
        let isLiked = false;
        let isBookmarked = false;
        if (userId) {
            const fullArticle = await Article_1.Article.findById(articleId);
            if (fullArticle) {
                isLiked = fullArticle.engagement.likes.some((id) => id.toString() === userId);
                isBookmarked = fullArticle.engagement.bookmarks.some((id) => id.toString() === userId);
            }
        }
        // Transform article to include id and viewCount fields for frontend compatibility
        const transformedArticle = {
            ...article,
            id: article._id.toString(),
            viewCount: formatViewCount(article.analytics?.totalViews || 0),
            author: article.author ? {
                id: article.author._id?.toString(),
                name: `${article.author.profile?.firstName || ''} ${article.author.profile?.lastName || ''}`.trim() || 'Unknown',
                avatar: article.author.profile?.avatar || '',
                role: article.authorType || 'user'
            } : undefined
        };
        // Transform other articles
        const transformedOtherArticles = otherArticles.map((a) => ({
            ...a,
            id: a._id.toString(),
            viewCount: formatViewCount(a.analytics?.totalViews || 0),
            author: a.author ? {
                id: a.author._id?.toString(),
                name: `${a.author.profile?.firstName || ''} ${a.author.profile?.lastName || ''}`.trim() || 'Unknown',
                avatar: a.author.profile?.avatar || '',
                role: a.authorType || 'user'
            } : undefined
        }));
        (0, response_1.sendSuccess)(res, {
            article: transformedArticle,
            otherArticles: transformedOtherArticles,
            isLiked,
            isBookmarked
        }, 'Article retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch article', 500);
    }
});
// Update article
exports.updateArticle = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { articleId } = req.params;
    const userId = req.userId;
    const updates = req.body;
    try {
        const article = await Article_1.Article.findById(articleId);
        if (!article) {
            return (0, response_1.sendNotFound)(res, 'Article not found');
        }
        // Check ownership
        if (article.author.toString() !== userId) {
            throw new errorHandler_1.AppError('You are not authorized to update this article', 403);
        }
        // Update fields
        Object.keys(updates).forEach((key) => {
            if (updates[key] !== undefined) {
                article[key] = updates[key];
            }
        });
        await article.save();
        await article.populate('author', 'profile.firstName profile.lastName profile.avatar');
        (0, response_1.sendSuccess)(res, {
            article
        }, 'Article updated successfully');
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError)
            throw error;
        throw new errorHandler_1.AppError('Failed to update article', 500);
    }
});
// Delete article
exports.deleteArticle = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { articleId } = req.params;
    const userId = req.userId;
    try {
        const article = await Article_1.Article.findById(articleId);
        if (!article) {
            return (0, response_1.sendNotFound)(res, 'Article not found');
        }
        // Check ownership
        if (article.author.toString() !== userId) {
            throw new errorHandler_1.AppError('You are not authorized to delete this article', 403);
        }
        await Article_1.Article.findByIdAndDelete(articleId);
        (0, response_1.sendSuccess)(res, {
            message: 'Article deleted successfully'
        }, 'Article deleted successfully');
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError)
            throw error;
        throw new errorHandler_1.AppError('Failed to delete article', 500);
    }
});
// Get articles by category
exports.getArticlesByCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category } = req.params;
    const { page = 1, limit = 20, sortBy = 'newest' } = req.query;
    try {
        const query = {
            category,
            isPublished: true,
            isApproved: true
        };
        const sortOptions = {};
        switch (sortBy) {
            case 'newest':
                sortOptions.publishedAt = -1;
                break;
            case 'popular':
                sortOptions['analytics.totalViews'] = -1;
                break;
            case 'trending':
                sortOptions['analytics.engagementRate'] = -1;
                break;
            default:
                sortOptions.publishedAt = -1;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const articles = await Article_1.Article.find(query)
            .populate('author', 'profile.firstName profile.lastName profile.avatar')
            .populate('products', 'name images pricing')
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Article_1.Article.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        // Transform articles to include id and viewCount fields for frontend compatibility
        const transformedArticles = articles.map((article) => ({
            ...article,
            id: article._id.toString(),
            viewCount: formatViewCount(article.analytics?.totalViews || 0),
            author: article.author ? {
                id: article.author._id?.toString(),
                name: `${article.author.profile?.firstName || ''} ${article.author.profile?.lastName || ''}`.trim() || 'Unknown',
                avatar: article.author.profile?.avatar || '',
                role: article.authorType || 'user'
            } : undefined
        }));
        (0, response_1.sendSuccess)(res, {
            articles: transformedArticles,
            category,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, `Articles in category "${category}" retrieved successfully`);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch articles by category', 500);
    }
});
// Get trending articles
exports.getTrendingArticles = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10, timeframe = '7d' } = req.query;
    try {
        // Calculate date based on timeframe
        const now = new Date();
        let startDate = new Date();
        switch (timeframe) {
            case '1d':
                startDate.setDate(now.getDate() - 1);
                break;
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }
        const articles = await Article_1.Article.find({
            isPublished: true,
            isApproved: true,
            publishedAt: { $gte: startDate }
        })
            .populate('author', 'profile.firstName profile.lastName profile.avatar')
            .populate('products', 'name images pricing')
            .sort({ 'analytics.totalViews': -1, 'analytics.engagementRate': -1 })
            .limit(Number(limit))
            .lean();
        // Transform articles to include id and viewCount fields for frontend compatibility
        const transformedArticles = articles.map((article) => ({
            ...article,
            id: article._id.toString(),
            viewCount: formatViewCount(article.analytics?.totalViews || 0),
            author: article.author ? {
                id: article.author._id?.toString(),
                name: `${article.author.profile?.firstName || ''} ${article.author.profile?.lastName || ''}`.trim() || 'Unknown',
                avatar: article.author.profile?.avatar || '',
                role: article.authorType || 'user'
            } : undefined
        }));
        (0, response_1.sendSuccess)(res, {
            articles: transformedArticles,
            timeframe
        }, 'Trending articles retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch trending articles', 500);
    }
});
// Get featured articles
exports.getFeaturedArticles = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10 } = req.query;
    try {
        const articles = await Article_1.Article.find({
            isFeatured: true,
            isPublished: true,
            isApproved: true
        })
            .populate('author', 'profile.firstName profile.lastName profile.avatar')
            .populate('products', 'name images pricing')
            .sort({ publishedAt: -1 })
            .limit(Number(limit))
            .lean();
        // Transform articles to include id and viewCount fields for frontend compatibility
        const transformedArticles = articles.map((article) => ({
            ...article,
            id: article._id.toString(),
            viewCount: formatViewCount(article.analytics?.totalViews || 0),
            author: article.author ? {
                id: article.author._id?.toString(),
                name: `${article.author.profile?.firstName || ''} ${article.author.profile?.lastName || ''}`.trim() || 'Unknown',
                avatar: article.author.profile?.avatar || '',
                role: article.authorType || 'user'
            } : undefined
        }));
        (0, response_1.sendSuccess)(res, {
            articles: transformedArticles
        }, 'Featured articles retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch featured articles', 500);
    }
});
// Search articles
exports.searchArticles = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { q, category, author, page = 1, limit = 20 } = req.query;
    try {
        const query = {
            isPublished: true,
            isApproved: true
        };
        // Text search
        if (q) {
            query.$or = [
                { title: { $regex: q, $options: 'i' } },
                { excerpt: { $regex: q, $options: 'i' } },
                { content: { $regex: q, $options: 'i' } },
                { tags: { $in: [new RegExp(q, 'i')] } }
            ];
        }
        // Apply filters
        if (category)
            query.category = category;
        if (author)
            query.author = author;
        const skip = (Number(page) - 1) * Number(limit);
        const articles = await Article_1.Article.find(query)
            .populate('author', 'profile.firstName profile.lastName profile.avatar')
            .populate('products', 'name images pricing')
            .sort({ 'analytics.totalViews': -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Article_1.Article.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        // Transform articles to include id and viewCount fields for frontend compatibility
        const transformedArticles = articles.map((article) => ({
            ...article,
            id: article._id.toString(),
            viewCount: formatViewCount(article.analytics?.totalViews || 0),
            author: article.author ? {
                id: article.author._id?.toString(),
                name: `${article.author.profile?.firstName || ''} ${article.author.profile?.lastName || ''}`.trim() || 'Unknown',
                avatar: article.author.profile?.avatar || '',
                role: article.authorType || 'user'
            } : undefined
        }));
        (0, response_1.sendSuccess)(res, {
            articles: transformedArticles,
            searchQuery: q,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, 'Search results retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to search articles', 500);
    }
});
// Toggle article like
exports.toggleArticleLike = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { articleId } = req.params;
    const userId = req.userId;
    try {
        const article = await Article_1.Article.findById(articleId);
        if (!article) {
            return (0, response_1.sendNotFound)(res, 'Article not found');
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const isLiked = article.engagement.likes.some((id) => id.equals(userObjectId));
        if (isLiked) {
            // Unlike
            article.engagement.likes = article.engagement.likes.filter((id) => !id.equals(userObjectId));
        }
        else {
            // Like
            article.engagement.likes.push(userObjectId);
        }
        // Update analytics
        await article.updateAnalytics();
        (0, response_1.sendSuccess)(res, {
            isLiked: !isLiked,
            likeCount: article.engagement.likes.length
        }, `Article ${isLiked ? 'unliked' : 'liked'} successfully`);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to toggle article like', 500);
    }
});
// Toggle article bookmark
exports.toggleArticleBookmark = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { articleId } = req.params;
    const userId = req.userId;
    try {
        const article = await Article_1.Article.findById(articleId);
        if (!article) {
            return (0, response_1.sendNotFound)(res, 'Article not found');
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const isBookmarked = article.engagement.bookmarks.some((id) => id.equals(userObjectId));
        if (isBookmarked) {
            // Remove bookmark
            article.engagement.bookmarks = article.engagement.bookmarks.filter((id) => !id.equals(userObjectId));
        }
        else {
            // Add bookmark
            article.engagement.bookmarks.push(userObjectId);
        }
        await article.save();
        (0, response_1.sendSuccess)(res, {
            isBookmarked: !isBookmarked,
            bookmarkCount: article.engagement.bookmarks.length
        }, `Article ${isBookmarked ? 'unbookmarked' : 'bookmarked'} successfully`);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to toggle article bookmark', 500);
    }
});
// Increment article share
exports.incrementArticleShare = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { articleId } = req.params;
    try {
        const article = await Article_1.Article.findById(articleId);
        if (!article) {
            return (0, response_1.sendNotFound)(res, 'Article not found');
        }
        article.engagement.shares += 1;
        await article.updateAnalytics();
        (0, response_1.sendSuccess)(res, {
            shareCount: article.engagement.shares
        }, 'Article share recorded successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to record article share', 500);
    }
});
