"use strict";
// FAQ Model
// Manages frequently asked questions for customer support
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
exports.FAQ = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const FAQSchema = new mongoose_1.Schema({
    category: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    subcategory: {
        type: String,
        trim: true,
        index: true,
    },
    question: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300,
        index: 'text', // Enable text search
    },
    answer: {
        type: String,
        required: true,
        maxlength: 5000,
        index: 'text', // Enable text search
    },
    shortAnswer: {
        type: String,
        maxlength: 200,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    viewCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    helpfulCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    notHelpfulCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    tags: [{
            type: String,
            lowercase: true,
            trim: true,
            index: true,
        }],
    relatedQuestions: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'FAQ',
        }],
    order: {
        type: Number,
        default: 0,
    },
    imageUrl: {
        type: String,
    },
    videoUrl: {
        type: String,
    },
    relatedArticles: [{
            type: String, // URLs
        }],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    lastUpdatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});
// Compound indexes
FAQSchema.index({ category: 1, isActive: 1, order: 1 });
FAQSchema.index({ isActive: 1, viewCount: -1 });
FAQSchema.index({ tags: 1, isActive: 1 });
// Text index for search
FAQSchema.index({ question: 'text', answer: 'text', tags: 'text' });
// Virtual for helpfulness ratio
FAQSchema.virtual('helpfulnessRatio').get(function () {
    const total = this.helpfulCount + this.notHelpfulCount;
    if (total === 0)
        return 0;
    return (this.helpfulCount / total) * 100;
});
// Virtual for total feedback
FAQSchema.virtual('totalFeedback').get(function () {
    return this.helpfulCount + this.notHelpfulCount;
});
// Instance method to increment view count
FAQSchema.methods.incrementView = async function () {
    this.viewCount += 1;
    await this.save();
};
// Instance method to mark as helpful
FAQSchema.methods.markAsHelpful = async function () {
    this.helpfulCount += 1;
    await this.save();
    console.log(`✅ [FAQ] FAQ ${this._id} marked as helpful`);
};
// Instance method to mark as not helpful
FAQSchema.methods.markAsNotHelpful = async function () {
    this.notHelpfulCount += 1;
    await this.save();
    console.log(`❌ [FAQ] FAQ ${this._id} marked as not helpful`);
};
// Static method to get FAQs by category
FAQSchema.statics.getByCategory = async function (category, subcategory) {
    const query = {
        category,
        isActive: true,
    };
    if (subcategory) {
        query.subcategory = subcategory;
    }
    return this.find(query)
        .sort({ order: 1, viewCount: -1 })
        .populate('relatedQuestions', 'question category')
        .lean();
};
// Static method to search FAQs
FAQSchema.statics.searchFAQs = async function (searchQuery, limit = 10) {
    return this.find({
        $text: { $search: searchQuery },
        isActive: true,
    }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean();
};
// Static method to get popular FAQs
FAQSchema.statics.getPopularFAQs = async function (limit = 10) {
    return this.find({ isActive: true })
        .sort({ viewCount: -1 })
        .limit(limit)
        .lean();
};
// Static method to get most helpful FAQs
FAQSchema.statics.getMostHelpfulFAQs = async function (limit = 10) {
    return this.find({ isActive: true })
        .sort({ helpfulCount: -1 })
        .limit(limit)
        .lean();
};
// Static method to get FAQ categories
FAQSchema.statics.getCategories = async function () {
    const categories = await this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                subcategories: { $addToSet: '$subcategory' },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    return categories.map(cat => ({
        category: cat._id,
        count: cat.count,
        subcategories: cat.subcategories.filter((sub) => sub != null),
    }));
};
// Static method to get FAQs by tags
FAQSchema.statics.getByTags = async function (tags, limit = 20) {
    return this.find({
        tags: { $in: tags },
        isActive: true,
    })
        .sort({ viewCount: -1 })
        .limit(limit)
        .lean();
};
exports.FAQ = mongoose_1.default.model('FAQ', FAQSchema);
