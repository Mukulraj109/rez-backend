import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { 
  sendSuccess, 
  sendNotFound, 
  sendBadRequest 
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Get all projects with filtering
export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const { 
    category, 
    difficulty, 
    creator, 
    status, 
    search, 
    sortBy = 'newest', 
    page = 1, 
    limit = 20 
  } = req.query;

  try {
    // Default filter - only show active projects
    const query: any = {};

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (creator) query.creator = creator;
    // If status is explicitly provided, use it, otherwise default to 'active'
    query.status = status || 'active';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    console.log('📊 Project Query:', JSON.stringify(query, null, 2));

    const sortOptions: any = {};
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
    const projects = await Project.find(query)
      .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
      .populate('sponsor', 'name logo')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    console.log(`✅ Found ${projects.length} projects`);

    const total = await Project.countDocuments(query);
    console.log(`📊 Total projects in DB matching query: ${total}`);

    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
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

  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new AppError('Failed to fetch projects', 500);
  }
});

// Get single project by ID
export const getProjectById = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findOne({ _id: projectId, status: 'active' })
      .populate('createdBy', 'profile.firstName profile.lastName profile.avatar profile.bio')
      .populate('products', 'name basePrice salePrice images description store')
      .populate('products.store', 'name slug')
      .lean();

    if (!project) {
      return sendNotFound(res, 'Project not found');
    }

    // Increment view count
    await Project.findByIdAndUpdate(projectId, {
      $inc: { 'analytics.views': 1 }
    });

    // Get similar projects
    const similarProjects = await Project.find({
      category: (project as any).category,
      _id: { $ne: projectId },
      status: 'active'
    })
    .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
    .limit(6)
    .sort({ createdAt: -1 })
    .lean();

    sendSuccess(res, {
      project,
      similarProjects
    }, 'Project retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch project', 500);
  }
});

// Get projects by category
export const getProjectsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const { page = 1, limit = 20 } = req.query;

  try {
    const query = { category, status: 'active' };
    const skip = (Number(page) - 1) * Number(limit);

    const projects = await Project.find(query)
      .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Project.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
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

  } catch (error) {
    throw new AppError('Failed to fetch projects by category', 500);
  }
});

// Get featured projects
export const getFeaturedProjects = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    const projects = await Project.find({ 
      status: 'active', 
      'metadata.featured': true 
    })
    .populate('createdBy', 'profile.firstName profile.lastName profile.avatar')
    .populate('products', 'name basePrice images')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

    sendSuccess(res, projects, 'Featured projects retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch featured projects', 500);
  }
});

// Like/Unlike project
export const toggleProjectLike = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const userId = req.userId!;

  try {
    const project = await Project.findById(projectId);
    
    if (!project) {
      return sendNotFound(res, 'Project not found');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const likedIndex = project.likedBy.findIndex(id => id.equals(userObjectId));
    let isLiked = false;

    if (likedIndex > -1) {
      project.likedBy.splice(likedIndex, 1);
      project.analytics.likes = Math.max(0, project.analytics.likes - 1);
    } else {
      project.likedBy.push(userObjectId);
      project.analytics.likes += 1;
      isLiked = true;
    }

    project.analytics.engagement = project.analytics.likes + project.analytics.comments;

    await project.save();

    sendSuccess(res, {
      projectId: project._id,
      isLiked,
      totalLikes: project.analytics.likes
    }, isLiked ? 'Project liked successfully' : 'Project unliked successfully');

  } catch (error) {
    throw new AppError('Failed to toggle project like', 500);
  }
});

// Add comment to project
export const addProjectComment = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { comment } = req.body;
  const userId = req.userId!;

  try {
    const project = await Project.findById(projectId);
    
    if (!project) {
      return sendNotFound(res, 'Project not found');
    }

    project.comments.push({
      user: new mongoose.Types.ObjectId(userId),
      content: comment,
      timestamp: new Date()
    });

    project.analytics.comments += 1;
    project.analytics.engagement = project.analytics.likes + project.analytics.comments;

    await project.save();

    const populatedProject = await Project.findById(projectId)
      .populate('comments.user', 'profile.firstName profile.lastName profile.avatar')
      .select('comments')
      .lean();

    const addedComment = (populatedProject as any).comments[(populatedProject as any).comments.length - 1];

    sendSuccess(res, {
      comment: addedComment,
      totalComments: project.analytics.comments
    }, 'Comment added successfully', 201);

  } catch (error) {
    throw new AppError('Failed to add comment', 500);
  }
});

// Get user's project submissions
export const getMySubmissions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { status, page = 1, limit = 20 } = req.query;

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find all projects that have submissions from this user
    const projectsWithSubmissions = await Project.find({
      'submissions.user': userObjectId
    })
    .populate('sponsor', 'name logo')
    .lean();

    // Extract user's submissions from all projects
    let allSubmissions: any[] = [];

    for (const project of projectsWithSubmissions) {
      const userSubs = (project as any).submissions.filter((sub: any) =>
        sub.user.toString() === userObjectId.toString()
      );

      // Enrich submissions with project info
      userSubs.forEach((sub: any) => {
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
    allSubmissions.sort((a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    // Pagination
    const total = allSubmissions.length;
    const skip = (Number(page) - 1) * Number(limit);
    const paginatedSubmissions = allSubmissions.slice(skip, skip + Number(limit));
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
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

  } catch (error) {
    console.error('Error fetching user submissions:', error);
    throw new AppError('Failed to fetch user submissions', 500);
  }
});