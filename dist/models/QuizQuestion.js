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
exports.QuizQuestion = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const QuizQuestionSchema = new mongoose_1.Schema({
    question: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 500
    },
    options: {
        type: [String],
        required: true,
        validate: {
            validator: function (options) {
                return options.length >= 2 && options.length <= 6;
            },
            message: 'Quiz must have between 2 and 6 options'
        }
    },
    correctAnswer: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: function (answer) {
                return answer < this.options.length;
            },
            message: 'Correct answer index must be within options array bounds'
        }
    },
    category: {
        type: String,
        enum: ['general', 'shopping', 'fashion', 'food', 'technology', 'entertainment', 'sports', 'lifestyle'],
        required: true,
        index: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        required: true,
        index: true
    },
    points: {
        type: Number,
        required: true,
        min: 1,
        max: 100,
        default: function () {
            // Auto-assign points based on difficulty if not provided
            const pointsMap = {
                easy: 10,
                medium: 20,
                hard: 30
            };
            return pointsMap[this.difficulty] || 10;
        }
    },
    explanation: {
        type: String,
        trim: true,
        maxlength: 500
    },
    imageUrl: {
        type: String,
        trim: true
    },
    tags: {
        type: [String],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    correctAnswerCount: {
        type: Number,
        default: 0,
        min: 0
    },
    incorrectAnswerCount: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});
// Compound indexes for efficient querying
QuizQuestionSchema.index({ category: 1, difficulty: 1, isActive: 1 });
QuizQuestionSchema.index({ difficulty: 1, isActive: 1, usageCount: 1 });
QuizQuestionSchema.index({ tags: 1, isActive: 1 });
// Virtual for accuracy rate
QuizQuestionSchema.virtual('accuracyRate').get(function () {
    const totalAnswers = this.correctAnswerCount + this.incorrectAnswerCount;
    if (totalAnswers === 0)
        return 0;
    return (this.correctAnswerCount / totalAnswers) * 100;
});
/**
 * Get random questions for quiz
 * @param count Number of questions to retrieve
 * @param category Optional category filter
 * @param difficulty Optional difficulty filter
 */
QuizQuestionSchema.statics.getRandomQuestions = async function (count = 10, category, difficulty) {
    const query = { isActive: true };
    if (category) {
        query.category = category;
    }
    if (difficulty) {
        query.difficulty = difficulty;
    }
    // Use MongoDB aggregation for random selection with better distribution
    const questions = await this.aggregate([
        { $match: query },
        { $sample: { size: count } }
    ]);
    return questions;
};
/**
 * Get questions by difficulty level
 */
QuizQuestionSchema.statics.getQuestionsByDifficulty = async function (difficulty, limit = 10) {
    return this.find({ difficulty, isActive: true })
        .limit(limit)
        .sort({ usageCount: 1 }) // Prefer less-used questions
        .exec();
};
/**
 * Get questions by category
 */
QuizQuestionSchema.statics.getQuestionsByCategory = async function (category, limit = 10) {
    return this.find({ category, isActive: true })
        .limit(limit)
        .sort({ usageCount: 1 }) // Prefer less-used questions
        .exec();
};
/**
 * Update question statistics after being answered
 */
QuizQuestionSchema.statics.updateQuestionStats = async function (questionId, isCorrect) {
    const updateField = isCorrect ? 'correctAnswerCount' : 'incorrectAnswerCount';
    await this.findByIdAndUpdate(questionId, {
        $inc: {
            usageCount: 1,
            [updateField]: 1
        }
    });
};
/**
 * Get accuracy rate for a specific question
 */
QuizQuestionSchema.statics.getQuestionAccuracyRate = async function (questionId) {
    const question = await this.findById(questionId).select('correctAnswerCount incorrectAnswerCount');
    if (!question) {
        throw new Error('Question not found');
    }
    const totalAnswers = question.correctAnswerCount + question.incorrectAnswerCount;
    if (totalAnswers === 0)
        return 0;
    return (question.correctAnswerCount / totalAnswers) * 100;
};
/**
 * Pre-save middleware to validate correctAnswer
 */
QuizQuestionSchema.pre('save', function (next) {
    if (this.correctAnswer >= this.options.length) {
        next(new Error('Correct answer index must be within options array bounds'));
    }
    else {
        next();
    }
});
exports.QuizQuestion = mongoose_1.default.model('QuizQuestion', QuizQuestionSchema);
exports.default = exports.QuizQuestion;
