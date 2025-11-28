"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySubmissions = exports.getEarningCategories = exports.addProjectComment = exports.toggleProjectLike = exports.getFeaturedProjects = exports.getProjectsByCategory = exports.getProjectById = exports.getProjects = exports.submitProject = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Project_1 = require("../models/Project");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const achievementService_1 = __importDefault(require("../services/achievementService"));
const response_2 = require("../utils/response");
const earningsSocketService_1 = __importDefault(require("../services/earningsSocketService"));
// Submit a project
exports.submitProject = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { projectId, content, contentType = 'text', description, metadata } = req.body;
    try {
        console.log('📋 [PROJECT] Submitting project for user:', userId);
        // Validate required fields
        if (!projectId) {
            return (0, response_1.sendBadRequest)(res, 'Project ID is required');
        }
        // Content is optional for "start" but required for actual submission
        const isStarting = !content;
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
        const existingSubmissionIndex = project.submissions.findIndex(sub => sub.user.toString() === userId.toString());
        const existingSubmission = existingSubmissionIndex >= 0
            ? project.submissions[existingSubmissionIndex]
            : null;
        if (existingSubmission) {
            // If starting and already have a submission, return success (already started)
            if (isStarting) {
                return (0, response_1.sendSuccess)(res, {
                    submission: {
                        id: existingSubmission._id,
                        projectId: project._id,
                        projectTitle: project.title,
                        status: existingSubmission.status,
                        submittedAt: existingSubmission.submittedAt,
                        contentType: existingSubmission.content?.type || 'text'
                    }
                }, 'Project already started');
            }
            // Allow updating if submission is pending, under_review, or rejected
            // Block if approved (cannot edit approved submissions)
            if (existingSubmission.status === 'approved') {
                return (0, response_1.sendBadRequest)(res, 'Your submission has been approved. You cannot edit it.');
            }
            // Update existing submission
            const updatedSubmission = {
                user: new mongoose_1.default.Types.ObjectId(userId),
                submittedAt: existingSubmission.submittedAt, // Keep original submission date
                content: {
                    type: contentType,
                    data: content,
                    metadata: metadata || {}
                },
                // If updating a rejected submission, change status to under_review
                // If updating pending/under_review, keep as under_review (since we're submitting with content)
                status: 'under_review',
                paidAmount: 0, // Reset paid amount since it's being resubmitted
                // Clear review fields since it's being resubmitted
                reviewedBy: undefined,
                reviewedAt: undefined,
                reviewComments: undefined,
                qualityScore: undefined,
                rejectionReason: undefined
            };
            // Replace the existing submission
            project.submissions[existingSubmissionIndex] = updatedSubmission;
            await project.save();
            console.log('✅ [PROJECT] Project submission updated successfully');
            // Emit real-time project status update
            try {
                const userIdStr = userId.toString();
                // Get updated project stats for this user
                const projectsWithSubmissions = await Project_1.Project.find({
                    'submissions.user': userId
                }).lean();
                let inReview = 0;
                let completed = 0;
                projectsWithSubmissions.forEach((proj) => {
                    proj.submissions?.forEach((sub) => {
                        if (sub.user && sub.user.toString() === userIdStr) {
                            if (sub.status === 'pending' || sub.status === 'under_review') {
                                inReview++;
                            }
                            else if (sub.status === 'approved') {
                                completed++;
                            }
                        }
                    });
                });
                const allActiveProjects = await Project_1.Project.find({
                    status: 'active'
                }).lean();
                let completeNow = 0;
                allActiveProjects.forEach((proj) => {
                    const hasUserSubmission = proj.submissions?.some((sub) => sub.user && sub.user.toString() === userIdStr);
                    if (!hasUserSubmission) {
                        completeNow++;
                    }
                });
                earningsSocketService_1.default.emitProjectStatusUpdate(userIdStr, {
                    completeNow,
                    inReview,
                    completed
                });
            }
            catch (socketError) {
                console.error('❌ [PROJECT] Error emitting project status update:', socketError);
            }
            // Get the updated submission with its _id
            const savedSubmission = project.submissions[existingSubmissionIndex];
            return (0, response_1.sendSuccess)(res, {
                submission: {
                    id: savedSubmission._id?.toString() || existingSubmission._id?.toString() || userId.toString(),
                    projectId: project._id,
                    projectTitle: project.title,
                    status: updatedSubmission.status,
                    submittedAt: updatedSubmission.submittedAt,
                    contentType: updatedSubmission.content.type
                }
            }, existingSubmission.status === 'rejected'
                ? 'Submission updated and resubmitted successfully'
                : 'Submission updated successfully');
        }
        // Create submission with proper structure
        const submission = {
            user: new mongoose_1.default.Types.ObjectId(userId),
            submittedAt: new Date(),
            content: {
                type: contentType,
                data: isStarting ? 'Project started - work in progress' : content,
                metadata: metadata || {}
            },
            // If starting (no content), status is 'pending'. If submitting with content, status is 'under_review'
            status: isStarting ? 'pending' : 'under_review',
            paidAmount: 0
        };
        // Add submission to project
        project.submissions.push(submission);
        await project.save();
        console.log('✅ [PROJECT] Project submission created successfully');
        // Emit real-time project status update
        try {
            const userIdStr = userId.toString();
            // Get updated project stats for this user
            const projectsWithSubmissions = await Project_1.Project.find({
                'submissions.user': userId
            }).lean();
            let inReview = 0;
            let completed = 0;
            projectsWithSubmissions.forEach((proj) => {
                proj.submissions?.forEach((sub) => {
                    if (sub.user && sub.user.toString() === userIdStr) {
                        if (sub.status === 'pending' || sub.status === 'under_review') {
                            inReview++;
                        }
                        else if (sub.status === 'approved') {
                            completed++;
                        }
                    }
                });
            });
            const allActiveProjects = await Project_1.Project.find({
                status: 'active'
            }).lean();
            let completeNow = 0;
            allActiveProjects.forEach((proj) => {
                const hasUserSubmission = proj.submissions?.some((sub) => sub.user && sub.user.toString() === userIdStr);
                if (!hasUserSubmission) {
                    completeNow++;
                }
            });
            earningsSocketService_1.default.emitProjectStatusUpdate(userIdStr, {
                completeNow,
                inReview,
                completed
            });
        }
        catch (error) {
            console.error('❌ [PROJECT] Error emitting project status update:', error);
        }
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
        }, isStarting ? 'Project started successfully' : 'Project submitted successfully');
    }
    catch (error) {
        console.error('❌ [PROJECT] Submit project error:', error);
        throw new errorHandler_1.AppError('Failed to submit project', 500);
    }
});
// Get all projects with filtering
exports.getProjects = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category, difficulty, creator, status, search, sortBy = 'newest', page = 1, limit = 20, excludeUserSubmissions } = req.query;
    const userId = req.userId; // May be undefined if not authenticated
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
        let projects = await Project_1.Project.find(query)
            .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
            .populate('sponsor', 'name logo')
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        // Filter out projects where user has a submission with status 'pending' or 'under_review'
        // (if excludeUserSubmissions is true and user is authenticated)
        // Handle query parameter which can be string, boolean, or array
        const excludeUserSubmissionsValue = Array.isArray(excludeUserSubmissions)
            ? excludeUserSubmissions[0]
            : excludeUserSubmissions;
        // Convert to string for comparison (query params are always strings)
        const excludeUserSubmissionsStr = String(excludeUserSubmissionsValue || '');
        const shouldExclude = excludeUserSubmissionsStr === 'true' || excludeUserSubmissionsStr === '1';
        console.log(`🔍 [PROJECTS] Filtering check: excludeUserSubmissions=${excludeUserSubmissionsStr}, userId=${userId}, shouldExclude=${shouldExclude}`);
        if (shouldExclude && userId) {
            const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
            const initialCount = projects.length;
            projects = projects.filter((project) => {
                if (!project.submissions || !Array.isArray(project.submissions)) {
                    return true; // Show projects without submissions
                }
                // Check if user has a submission with status 'pending' or 'under_review'
                const hasPendingOrUnderReviewSubmission = project.submissions.some((sub) => {
                    // Handle both ObjectId and string formats
                    const subUserId = sub.user?.toString ? sub.user.toString() : String(sub.user);
                    const subStatus = sub.status;
                    const userObjectIdStr = userObjectId.toString();
                    const matches = subUserId === userObjectIdStr &&
                        (subStatus === 'pending' || subStatus === 'under_review');
                    if (matches) {
                        console.log(`🚫 [PROJECTS] Filtering out project ${project._id}: user ${userObjectIdStr} has ${subStatus} submission (sub.user: ${subUserId})`);
                    }
                    else if (subUserId === userObjectIdStr) {
                        console.log(`ℹ️ [PROJECTS] Project ${project._id}: user ${userObjectIdStr} has submission with status ${subStatus} (not filtering)`);
                    }
                    return matches;
                });
                // Filter out if user has a pending or under_review submission
                return !hasPendingOrUnderReviewSubmission;
            });
            const filteredCount = initialCount - projects.length;
            console.log(`✅ [PROJECTS] Filtered ${filteredCount} projects. Showing ${projects.length} projects (excluded projects with pending/under_review submissions)`);
        }
        else {
            if (!shouldExclude) {
                console.log(`ℹ️ [PROJECTS] excludeUserSubmissions is false, showing all ${projects.length} projects`);
            }
            else if (!userId) {
                console.log(`ℹ️ [PROJECTS] No userId available, showing all ${projects.length} projects`);
            }
        }
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
        // Fetch project document (not lean) to update analytics
        const projectDoc = await Project_1.Project.findById(projectId)
            .populate('createdBy', 'profile.firstName profile.lastName profile.avatar profile.bio')
            .populate('sponsor', 'name logo slug');
        if (!projectDoc) {
            return (0, response_1.sendNotFound)(res, 'Project not found');
        }
        // Update analytics to ensure they're accurate (recalculate from actual submissions)
        await projectDoc.updateAnalytics();
        // Increment view count
        projectDoc.analytics.totalViews += 1;
        await projectDoc.save();
        // Convert to plain object for response
        const project = projectDoc.toObject();
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
        console.error('❌ [PROJECT] Error fetching project by ID:', error);
        throw new errorHandler_1.AppError(error?.message || 'Failed to fetch project', error?.statusCode || 500);
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
// Get earning project categories with stats
exports.getEarningCategories = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.userId || null;
        // Define all available categories with metadata
        const categoryDefinitions = [
            {
                name: 'Review',
                slug: 'review',
                description: 'Product and service review projects',
                icon: 'star',
                color: '#F59E0B',
                category: 'review'
            },
            {
                name: 'Social Share',
                slug: 'social_share',
                description: 'Social media sharing projects',
                icon: 'share-social',
                color: '#3B82F6',
                category: 'social_share'
            },
            {
                name: 'UGC Content',
                slug: 'ugc_content',
                description: 'User-generated content creation',
                icon: 'videocam',
                color: '#EC4899',
                category: 'ugc_content'
            },
            {
                name: 'Store Visit',
                slug: 'store_visit',
                description: 'Physical store visit projects',
                icon: 'storefront',
                color: '#10B981',
                category: 'store_visit'
            },
            {
                name: 'Survey',
                slug: 'survey',
                description: 'Survey and feedback projects',
                icon: 'clipboard',
                color: '#8B5CF6',
                category: 'survey'
            },
            {
                name: 'Photo',
                slug: 'photo',
                description: 'Photo capture projects',
                icon: 'camera',
                color: '#F59E0B',
                category: 'photo'
            },
            {
                name: 'Video',
                slug: 'video',
                description: 'Video creation projects',
                icon: 'film',
                color: '#EF4444',
                category: 'video'
            },
            {
                name: 'Data Collection',
                slug: 'data_collection',
                description: 'Data collection projects',
                icon: 'document-text',
                color: '#6366F1',
                category: 'data_collection'
            },
            {
                name: 'Mystery Shopping',
                slug: 'mystery_shopping',
                description: 'Mystery shopping projects',
                icon: 'eye',
                color: '#14B8A6',
                category: 'mystery_shopping'
            },
            {
                name: 'Referral',
                slug: 'referral',
                description: 'Referral program projects',
                icon: 'people',
                color: '#8B5CF6',
                category: 'referral'
            }
        ];
        // Get stats for each category
        const categoriesWithStats = await Promise.all(categoryDefinitions.map(async (catDef) => {
            // Count active projects in this category
            const projectCount = await Project_1.Project.countDocuments({
                category: catDef.category,
                status: 'active'
            });
            // Calculate average payment for this category
            const projects = await Project_1.Project.find({
                category: catDef.category,
                status: 'active'
            })
                .select('reward.amount')
                .lean();
            const totalPayment = projects.reduce((sum, p) => {
                return sum + (p.reward?.amount || 0);
            }, 0);
            const averagePayment = projectCount > 0 ? Math.round(totalPayment / projectCount) : 0;
            // Check if user has submissions in this category
            let userProjectCount = 0;
            if (userId) {
                userProjectCount = await Project_1.Project.countDocuments({
                    category: catDef.category,
                    'submissions.user': userId
                });
            }
            return {
                _id: catDef.slug,
                name: catDef.name,
                slug: catDef.slug,
                description: catDef.description,
                icon: catDef.icon,
                color: catDef.color,
                projectCount,
                averagePayment,
                userProjectCount,
                isActive: projectCount > 0
            };
        }));
        // Filter out categories with no projects (optional - you can keep them if needed)
        const activeCategories = categoriesWithStats.filter(cat => cat.isActive);
        (0, response_1.sendSuccess)(res, activeCategories, 'Earning categories retrieved successfully');
    }
    catch (error) {
        console.error('❌ [PROJECT] Error getting earning categories:', error);
        throw new errorHandler_1.AppError('Failed to fetch earning categories', 500);
    }
});
// Get user's project submissions
exports.getMySubmissions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { status, sortBy = 'newest', page = 1, limit = 20 } = req.query;
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
        // If status is 'pending', include both 'pending' and 'under_review' submissions
        if (status) {
            if (status === 'pending') {
                allSubmissions = allSubmissions.filter(sub => sub.status === 'pending' || sub.status === 'under_review');
            }
            else {
                allSubmissions = allSubmissions.filter(sub => sub.status === status);
            }
        }
        // Sort based on sortBy parameter
        switch (sortBy) {
            case 'oldest':
                allSubmissions.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
                break;
            case 'status':
                // Sort by status: pending first, then approved, then rejected
                const statusOrder = { pending: 0, approved: 1, rejected: 2 };
                allSubmissions.sort((a, b) => {
                    const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
                    if (statusDiff !== 0)
                        return statusDiff;
                    // If same status, sort by date (newest first)
                    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
                });
                break;
            case 'newest':
            default:
                // Sort by submission date (newest first)
                allSubmissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                break;
        }
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
