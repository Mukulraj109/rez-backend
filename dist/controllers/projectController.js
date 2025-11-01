"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySubmissions = exports.addProjectComment = exports.toggleProjectLike = exports.getFeaturedProjects = exports.getProjectsByCategory = exports.getProjectById = exports.getProjects = exports.submitProject = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Project_1 = require("../models/Project");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const achievementService_1 = __importDefault(require("../services/achievementService"));
const response_2 = require("../utils/response");
// Submit a project
exports.submitProject = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { projectId, content, contentType = 'text', description, metadata } = req.body;
    try {
        console.log('📋 [PROJECT] Submitting project for user:', userId);
        // Validate required fields
        if (!projectId || !content) {
            return (0, response_1.sendBadRequest)(res, 'Project ID and content are required');
        }
        // Check if project exists
        const project = await Project_1.Project.findById(projectId);
        if (!project) {
            return (0, response_1.sendNotFound)(res, 'Project not found');
        }
        // Check if project is still accepting submissions
        if (project.status !== 'active') {
            return (0, response_1.sendBadRequest)(res, 'Project is no longer accepting submissions');
        }
        // Check if user has already submitted to this project
        const existingSubmission = project.submissions.find(sub => sub.user.toString() === userId.toString());
        if (existingSubmission) {
            return (0, response_1.sendBadRequest)(res, 'You have already submitted to this project');
        }
        // Create submission with proper structure
        const submission = {
            user: new mongoose_1.default.Types.ObjectId(userId),
            submittedAt: new Date(),
            content: {
                type: contentType,
                data: content,
                metadata: metadata || {}
            },
            status: 'pending',
            paidAmount: 0
        };
        // Add submission to project
        project.submissions.push(submission);
        await project.save();
        console.log('✅ [PROJECT] Project submission created successfully');
        // Trigger achievement update for project submission
        try {
            await achievementService_1.default.triggerAchievementUpdate(userId, 'project_submitted');
        }
        catch (error) {
            console.error('❌ [PROJECT] Error triggering achievement update:', error);
        }
        // Get the created submission with its generated _id
        const createdSubmission = project.submissions[project.submissions.length - 1];
        (0, response_2.sendCreated)(res, {
            submission: {
                id: createdSubmission._id,
                projectId: project._id,
                projectTitle: project.title,
                status: createdSubmission.status,
                submittedAt: createdSubmission.submittedAt,
                contentType: createdSubmission.content.type
            }
        }, 'Project submitted successfully');
    }
    catch (error) {
        console.error('❌ [PROJECT] Submit project error:', error);
        throw new errorHandler_1.AppError('Failed to submit project', 500);
    }
});
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
// Get user's project submissions
exports.getMySubmissions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { status, page = 1, limit = 20 } = req.query;
    try {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        // Find all projects that have submissions from this user
        const projectsWithSubmissions = await Project_1.Project.find({
            'submissions.user': userObjectId
        })
            .populate('sponsor', 'name logo')
            .lean();
        // Extract user's submissions from all projects
        let allSubmissions = [];
        for (const project of projectsWithSubmissions) {
            const userSubs = project.submissions.filter((sub) => sub.user.toString() === userObjectId.toString());
            // Enrich submissions with project info
            userSubs.forEach((sub) => {
                allSubmissions.push({
                    _id: sub._id || `${project._id}_${sub.submittedAt}`,
                    project: {
                        _id: project._id,
                        title: project.title,
                        description: project.description,
                        category: project.category,
                        reward: project.reward
                    },
                    user: sub.user,
                    submittedAt: sub.submittedAt,
                    content: sub.content,
                    status: sub.status,
                    qualityScore: sub.qualityScore,
                    paidAmount: sub.paidAmount,
                    paidAt: sub.paidAt,
                    feedback: sub.feedback
                });
            });
        }
        // Filter by status if provided
        if (status) {
            allSubmissions = allSubmissions.filter(sub => sub.status === status);
        }
        // Sort by submission date (newest first)
        allSubmissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        // Pagination
        const total = allSubmissions.length;
        const skip = (Number(page) - 1) * Number(limit);
        const paginatedSubmissions = allSubmissions.slice(skip, skip + Number(limit));
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
            submissions: paginatedSubmissions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, 'User submissions retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching user submissions:', error);
        throw new errorHandler_1.AppError('Failed to fetch user submissions', 500);
    }
});
