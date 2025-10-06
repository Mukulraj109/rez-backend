"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addProjectComment = exports.toggleProjectLike = exports.getFeaturedProjects = exports.getProjectsByCategory = exports.getProjectById = exports.getProjects = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Project_1 = require("../models/Project");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
// Get all projects with filtering
exports.getProjects = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category, difficulty, creator, status, search, sortBy = 'newest', page = 1, limit = 20 } = req.query;
    try {
        // Default filter - only show active projects
        const query = {};
        if (category)
            query.category = category;
        if (difficulty)
            query.difficulty = difficulty;
        if (creator)
            query.creator = creator;
        // If status is explicitly provided, use it, otherwise default to 'active'
        query.status = status || 'active';
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
        console.log('📊 Project Query:', JSON.stringify(query, null, 2));
        const sortOptions = {};
        switch (sortBy) {
            case 'newest':
                sortOptions.createdAt = -1;
                break;
            case 'popular':
                sortOptions['analytics.views'] = -1;
                break;
            case 'trending':
                sortOptions['analytics.engagement'] = -1;
                break;
            case 'difficulty_easy':
                sortOptions.difficulty = 1;
                break;
            case 'difficulty_hard':
                sortOptions.difficulty = -1;
                break;
            default:
                sortOptions.createdAt = -1;
        }
        console.log('🔍 Sort Options:', sortOptions);
        const skip = (Number(page) - 1) * Number(limit);
        console.log(`📄 Pagination: page=${page}, limit=${limit}, skip=${skip}`);
        console.log('🔎 Fetching projects from database...');
        const projects = await Project_1.Project.find(query)
            .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
            .populate('sponsor', 'name logo')
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        console.log(`✅ Found ${projects.length} projects`);
        const total = await Project_1.Project.countDocuments(query);
        console.log(`📊 Total projects in DB matching query: ${total}`);
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
            projects,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, 'Projects retrieved successfully');
    }
    catch (error) {
        console.error('❌ Error fetching projects:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw new errorHandler_1.AppError('Failed to fetch projects', 500);
    }
});
// Get single project by ID
exports.getProjectById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    try {
        const project = await Project_1.Project.findOne({ _id: projectId, status: 'active' })
            .populate('createdBy', 'profile.firstName profile.lastName profile.avatar profile.bio')
            .populate('products', 'name basePrice salePrice images description store')
            .populate('products.store', 'name slug')
            .lean();
        if (!project) {
            return (0, response_1.sendNotFound)(res, 'Project not found');
        }
        // Increment view count
        await Project_1.Project.findByIdAndUpdate(projectId, {
            $inc: { 'analytics.views': 1 }
        });
        // Get similar projects
        const similarProjects = await Project_1.Project.find({
            category: project.category,
            _id: { $ne: projectId },
            status: 'active'
        })
            .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
            .limit(6)
            .sort({ createdAt: -1 })
            .lean();
        (0, response_1.sendSuccess)(res, {
            project,
            similarProjects
        }, 'Project retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch project', 500);
    }
});
// Get projects by category
exports.getProjectsByCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    try {
        const query = { category, status: 'active' };
        const skip = (Number(page) - 1) * Number(limit);
        const projects = await Project_1.Project.find(query)
            .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Project_1.Project.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
            projects,
            category,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, `Projects in category "${category}" retrieved successfully`);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch projects by category', 500);
    }
});
// Get featured projects
exports.getFeaturedProjects = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10 } = req.query;
    try {
        const projects = await Project_1.Project.find({
            status: 'active',
            'metadata.featured': true
        })
            .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
            .populate('products', 'name basePrice images')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();
        (0, response_1.sendSuccess)(res, projects, 'Featured projects retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch featured projects', 500);
    }
});
// Like/Unlike project
exports.toggleProjectLike = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    const userId = req.userId;
    try {
        const project = await Project_1.Project.findById(projectId);
        if (!project) {
            return (0, response_1.sendNotFound)(res, 'Project not found');
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const likedIndex = project.likedBy.findIndex(id => id.equals(userObjectId));
        let isLiked = false;
        if (likedIndex > -1) {
            project.likedBy.splice(likedIndex, 1);
            project.analytics.likes = Math.max(0, project.analytics.likes - 1);
        }
        else {
            project.likedBy.push(userObjectId);
            project.analytics.likes += 1;
            isLiked = true;
        }
        project.analytics.engagement = project.analytics.likes + project.analytics.comments;
        await project.save();
        (0, response_1.sendSuccess)(res, {
            projectId: project._id,
            isLiked,
            totalLikes: project.analytics.likes
        }, isLiked ? 'Project liked successfully' : 'Project unliked successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to toggle project like', 500);
    }
});
// Add comment to project
exports.addProjectComment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    const { comment } = req.body;
    const userId = req.userId;
    try {
        const project = await Project_1.Project.findById(projectId);
        if (!project) {
            return (0, response_1.sendNotFound)(res, 'Project not found');
        }
        project.comments.push({
            user: new mongoose_1.default.Types.ObjectId(userId),
            content: comment,
            timestamp: new Date()
        });
        project.analytics.comments += 1;
        project.analytics.engagement = project.analytics.likes + project.analytics.comments;
        await project.save();
        const populatedProject = await Project_1.Project.findById(projectId)
            .populate('comments.user', 'profile.firstName profile.lastName profile.avatar')
            .select('comments')
            .lean();
        const addedComment = populatedProject.comments[populatedProject.comments.length - 1];
        (0, response_1.sendSuccess)(res, {
            comment: addedComment,
            totalComments: project.analytics.comments
        }, 'Comment added successfully', 201);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to add comment', 500);
    }
});
