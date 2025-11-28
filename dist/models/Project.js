"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Project Schema
const ProjectSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: 300
    },
    category: {
        type: String,
        required: true,
        enum: ['review', 'social_share', 'ugc_content', 'store_visit', 'survey', 'photo', 'video', 'data_collection', 'mystery_shopping', 'referral'],
        index: true
    },
    subcategory: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['video', 'photo', 'text', 'visit', 'checkin', 'survey', 'rating', 'social', 'referral']
    },
    brand: {
        type: String,
        trim: true
    },
    sponsor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Store'
    },
    requirements: {
        minWords: {
            type: Number,
            min: 1
        },
        minDuration: {
            type: Number,
            min: 1
        },
        maxDuration: {
            type: Number,
            min: 1
        },
        minPhotos: {
            type: Number,
            min: 1,
            max: 10
        },
        location: {
            required: {
                type: Boolean,
                default: false
            },
            specific: String,
            radius: {
                type: Number,
                min: 0.1,
                max: 100
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                index: '2dsphere'
            }
        },
        products: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product'
            }],
        stores: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Store'
            }],
        categories: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Category'
            }],
        demographics: {
            minAge: {
                type: Number,
                min: 13,
                max: 100
            },
            maxAge: {
                type: Number,
                min: 13,
                max: 100
            },
            gender: {
                type: String,
                enum: ['male', 'female', 'any'],
                default: 'any'
            },
            languages: [String]
        },
        skills: [String],
        deviceRequirements: {
            camera: { type: Boolean, default: false },
            microphone: { type: Boolean, default: false },
            location: { type: Boolean, default: false }
        }
    },
    reward: {
        amount: {
            type: Number,
            required: true,
            min: 1
        },
        currency: {
            type: String,
            default: 'INR',
            enum: ['INR', 'USD', 'EUR']
        },
        type: {
            type: String,
            enum: ['fixed', 'variable', 'milestone'],
            default: 'fixed'
        },
        bonusMultiplier: {
            type: Number,
            min: 1,
            max: 5,
            default: 1
        },
        milestones: [{
                target: { type: Number, min: 1 },
                bonus: { type: Number, min: 0 }
            }],
        paymentMethod: {
            type: String,
            enum: ['wallet', 'bank', 'upi'],
            default: 'wallet'
        },
        paymentSchedule: {
            type: String,
            enum: ['immediate', 'daily', 'weekly', 'monthly'],
            default: 'daily'
        }
    },
    limits: {
        maxCompletions: {
            type: Number,
            min: 1
        },
        totalBudget: {
            type: Number,
            min: 0
        },
        dailyBudget: {
            type: Number,
            min: 0
        },
        maxCompletionsPerDay: {
            type: Number,
            min: 1
        },
        maxCompletionsPerUser: {
            type: Number,
            default: 1,
            min: 1,
            max: 100
        },
        expiryDate: Date,
        startDate: Date
    },
    instructions: [{
            type: String,
            required: true,
            trim: true
        }],
    examples: [String],
    tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
    },
    estimatedTime: {
        type: Number,
        required: true,
        min: 1,
        max: 480 // 8 hours max
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'paused', 'completed', 'expired', 'cancelled'],
        default: 'draft',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    submissions: [{
            user: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            submittedAt: {
                type: Date,
                default: Date.now,
                required: true
            },
            content: {
                type: {
                    type: String,
                    enum: ['text', 'image', 'video', 'rating', 'checkin', 'receipt'],
                    required: true
                },
                data: mongoose_1.Schema.Types.Mixed, // String or Array of strings
                metadata: {
                    location: [Number],
                    duration: Number,
                    wordCount: Number,
                    rating: { type: Number, min: 1, max: 5 },
                    additional: mongoose_1.Schema.Types.Mixed
                }
            },
            status: {
                type: String,
                enum: ['pending', 'approved', 'rejected', 'under_review'],
                default: 'pending'
            },
            reviewedBy: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User'
            },
            reviewedAt: Date,
            reviewComments: String,
            qualityScore: {
                type: Number,
                min: 1,
                max: 10
            },
            paidAmount: {
                type: Number,
                min: 0
            },
            paidAt: Date,
            rejectionReason: String
        }],
    analytics: {
        totalViews: { type: Number, default: 0 },
        totalApplications: { type: Number, default: 0 },
        totalSubmissions: { type: Number, default: 0 },
        approvedSubmissions: { type: Number, default: 0 },
        rejectedSubmissions: { type: Number, default: 0 },
        avgCompletionTime: { type: Number, default: 0 },
        avgQualityScore: { type: Number, default: 0 },
        totalPayout: { type: Number, default: 0 },
        conversionRate: { type: Number, default: 0 },
        approvalRate: { type: Number, default: 0 },
        participantDemographics: {
            ageGroups: { type: Map, of: Number, default: {} },
            genderSplit: { type: Map, of: Number, default: {} },
            locationSplit: { type: Map, of: Number, default: {} }
        },
        dailyStats: [{
                date: { type: Date, required: true },
                views: { type: Number, default: 0 },
                applications: { type: Number, default: 0 },
                submissions: { type: Number, default: 0 }
            }]
    },
    isFeatured: {
        type: Boolean,
        default: false,
        index: true
    },
    isSponsored: {
        type: Boolean,
        default: false
    },
    approvalRequired: {
        type: Boolean,
        default: true
    },
    qualityControl: {
        enabled: { type: Boolean, default: true },
        minScore: { type: Number, min: 1, max: 10, default: 6 },
        manualReview: { type: Boolean, default: true },
        autoApprove: { type: Boolean, default: false }
    },
    targetAudience: {
        size: { type: Number, min: 1 },
        demographics: String,
        interests: [String]
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    managedBy: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
ProjectSchema.index({ category: 1, status: 1, createdAt: -1 });
ProjectSchema.index({ status: 1, isFeatured: 1 });
ProjectSchema.index({ 'reward.amount': -1, status: 1 });
ProjectSchema.index({ difficulty: 1, status: 1 });
ProjectSchema.index({ 'limits.expiryDate': 1 });
ProjectSchema.index({ tags: 1, status: 1 });
ProjectSchema.index({ sponsor: 1, status: 1 });
ProjectSchema.index({ createdBy: 1, createdAt: -1 });
// Text search index
ProjectSchema.index({
    title: 'text',
    description: 'text',
    tags: 'text'
}, {
    weights: {
        title: 10,
        tags: 5,
        description: 1
    }
});
// Virtual for completion rate
ProjectSchema.virtual('completionRate').get(function () {
    if (this.analytics.totalApplications === 0)
        return 0;
    return (this.analytics.totalSubmissions / this.analytics.totalApplications) * 100;
});
// Virtual for remaining slots
ProjectSchema.virtual('remainingSlots').get(function () {
    if (!this.limits.maxCompletions)
        return null;
    return Math.max(0, this.limits.maxCompletions - this.analytics.approvedSubmissions);
});
// Virtual for days remaining
ProjectSchema.virtual('daysRemaining').get(function () {
    if (!this.limits.expiryDate)
        return null;
    const diff = this.limits.expiryDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});
// Method to check if user can participate
ProjectSchema.methods.canUserParticipate = async function (userId) {
    // Check if project is active
    if (!this.isActive())
        return false;
    // Check if user already has max submissions
    const userSubmissions = this.submissions.filter((sub) => sub.user.toString() === userId);
    if (userSubmissions.length >= (this.limits.maxCompletionsPerUser || 1)) {
        return false;
    }
    // Check user demographics if required
    if (this.requirements.demographics) {
        const User = this.model('User');
        const user = await User.findById(userId);
        if (!user)
            return false;
        // Age check
        if (this.requirements.demographics.minAge || this.requirements.demographics.maxAge) {
            if (!user.profile.dateOfBirth)
                return false;
            const age = new Date().getFullYear() - user.profile.dateOfBirth.getFullYear();
            if (this.requirements.demographics.minAge && age < this.requirements.demographics.minAge) {
                return false;
            }
            if (this.requirements.demographics.maxAge && age > this.requirements.demographics.maxAge) {
                return false;
            }
        }
        // Gender check
        if (this.requirements.demographics.gender &&
            this.requirements.demographics.gender !== 'any' &&
            user.profile.gender !== this.requirements.demographics.gender) {
            return false;
        }
    }
    // Check remaining budget
    if (this.limits.totalBudget &&
        this.analytics.totalPayout >= this.limits.totalBudget) {
        return false;
    }
    return true;
};
// Method to get user's submission
ProjectSchema.methods.getUserSubmission = function (userId) {
    const submission = this.submissions.find((sub) => sub.user.toString() === userId);
    return submission || null;
};
// Method to submit work
ProjectSchema.methods.submitWork = async function (userId, content) {
    // Validate user can participate
    const canParticipate = await this.canUserParticipate(userId);
    if (!canParticipate) {
        throw new Error('User cannot participate in this project');
    }
    // Create submission
    const submission = {
        user: new mongoose_1.default.Types.ObjectId(userId),
        submittedAt: new Date(),
        content,
        status: this.approvalRequired ? 'pending' : 'approved'
    };
    this.submissions.push(submission);
    this.analytics.totalSubmissions += 1;
    // Auto-approve if configured
    if (!this.approvalRequired || this.qualityControl.autoApprove) {
        submission.status = 'approved';
        submission.qualityScore = 8; // Default good score
        submission.paidAmount = this.reward.amount;
        submission.paidAt = new Date();
        this.analytics.approvedSubmissions += 1;
        this.analytics.totalPayout += this.reward.amount;
    }
    await this.save();
    return submission;
};
// Method to review submission
ProjectSchema.methods.reviewSubmission = async function (submissionId, status, comments, qualityScore) {
    const submission = this.submissions.find((sub) => sub._id?.toString() === submissionId);
    if (!submission) {
        throw new Error('Submission not found');
    }
    submission.status = status;
    submission.reviewedAt = new Date();
    submission.reviewComments = comments;
    submission.qualityScore = qualityScore;
    if (status === 'approved') {
        const payout = this.calculatePayout(submission);
        submission.paidAmount = payout;
        submission.paidAt = new Date();
        this.analytics.approvedSubmissions += 1;
        this.analytics.totalPayout += payout;
    }
    else {
        this.analytics.rejectedSubmissions += 1;
    }
    await this.save();
};
// Method to calculate payout
ProjectSchema.methods.calculatePayout = function (submission) {
    let amount = this.reward.amount;
    // Apply quality bonus
    if (submission.qualityScore && submission.qualityScore >= 8) {
        amount *= (this.reward.bonusMultiplier || 1);
    }
    return Math.round(amount * 100) / 100;
};
// Method to update analytics
ProjectSchema.methods.updateAnalytics = async function () {
    const totalSubmissions = this.submissions.length;
    const approvedSubmissions = this.submissions.filter((s) => s.status === 'approved').length;
    const rejectedSubmissions = this.submissions.filter((s) => s.status === 'rejected').length;
    this.analytics.totalSubmissions = totalSubmissions;
    this.analytics.approvedSubmissions = approvedSubmissions;
    this.analytics.rejectedSubmissions = rejectedSubmissions;
    if (totalSubmissions > 0) {
        this.analytics.approvalRate = (approvedSubmissions / totalSubmissions) * 100;
        const qualityScores = this.submissions
            .filter((s) => s.qualityScore)
            .map((s) => s.qualityScore);
        if (qualityScores.length > 0) {
            this.analytics.avgQualityScore = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
        }
    }
    await this.save();
};
// Method to check if project is active
ProjectSchema.methods.isActive = function () {
    if (this.status !== 'active')
        return false;
    if (this.limits.expiryDate && this.limits.expiryDate < new Date())
        return false;
    if (this.limits.startDate && this.limits.startDate > new Date())
        return false;
    if (this.limits.maxCompletions && this.analytics.approvedSubmissions >= this.limits.maxCompletions)
        return false;
    if (this.limits.totalBudget && this.analytics.totalPayout >= this.limits.totalBudget)
        return false;
    return true;
};
// Method to get remaining budget
ProjectSchema.methods.getRemainingBudget = function () {
    if (!this.limits.totalBudget)
        return Infinity;
    return Math.max(0, this.limits.totalBudget - this.analytics.totalPayout);
};
// Static method to get active projects
ProjectSchema.statics.getActiveProjects = function (filters = {}, limit = 50) {
    const query = {
        status: 'active',
        $and: [
            {
                $or: [
                    { 'limits.expiryDate': { $exists: false } },
                    { 'limits.expiryDate': { $gte: new Date() } }
                ]
            },
            {
                $or: [
                    { 'limits.startDate': { $exists: false } },
                    { 'limits.startDate': { $lte: new Date() } }
                ]
            }
        ]
    };
    if (filters.category) {
        query.category = filters.category;
    }
    if (filters.difficulty) {
        query.difficulty = filters.difficulty;
    }
    if (filters.minReward) {
        query['reward.amount'] = { $gte: filters.minReward };
    }
    return this.find(query)
        .populate('sponsor', 'name logo')
        .sort({ isFeatured: -1, 'reward.amount': -1, createdAt: -1 })
        .limit(limit);
};
exports.Project = mongoose_1.default.model('Project', ProjectSchema);
