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
exports.TriviaQuestion = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TriviaQuestionSchema = new mongoose_1.Schema({
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
            message: 'Trivia must have between 2 and 6 options'
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
        enum: ['history', 'science', 'geography', 'pop_culture', 'movies', 'music', 'art', 'literature', 'nature', 'random'],
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
        min: 5,
        max: 50,
        default: function () {
            // Auto-assign points based on difficulty
            const pointsMap = {
                easy: 15,
                medium: 25,
                hard: 35
            };
            return pointsMap[this.difficulty] || 15;
        }
    },
    funFact: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    imageUrl: {
        type: String,
        trim: true
    },
    sourceUrl: {
        type: String,
        trim: true
    },
    tags: {
        type: [String],
        default: []
    },
    dateOfDay: {
        type: Date
        // Index defined separately below to handle null values properly
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
TriviaQuestionSchema.index({ category: 1, difficulty: 1, isActive: 1 });
// Unique index only for assigned daily trivia (dateOfDay not null)
// Note: sparse index allows multiple null values while maintaining uniqueness for non-null values
TriviaQuestionSchema.index({ dateOfDay: 1 }, { unique: true, sparse: true });
TriviaQuestionSchema.index({ isActive: 1, usageCount: 1 });
// Virtual for accuracy rate
TriviaQuestionSchema.virtual('accuracyRate').get(function () {
    const totalAnswers = this.correctAnswerCount + this.incorrectAnswerCount;
    if (totalAnswers === 0)
        return 0;
    return (this.correctAnswerCount / totalAnswers) * 100;
});
/**
 * Get daily trivia for a specific date
 */
TriviaQuestionSchema.statics.getDailyTrivia = async function (date) {
    const queryDate = date || new Date();
    // Normalize to start of day
    queryDate.setHours(0, 0, 0, 0);
    let dailyTrivia = await this.findOne({
        dateOfDay: queryDate,
        isActive: true
    });
    // If no trivia assigned for this day, assign one
    if (!dailyTrivia) {
        dailyTrivia = await this.assignDailyTrivia(queryDate);
    }
    return dailyTrivia;
};
/**
 * Get random trivia questions
 */
TriviaQuestionSchema.statics.getRandomTrivia = async function (count = 5, category) {
    const query = { isActive: true, dateOfDay: null }; // Exclude daily trivia
    if (category) {
        query.category = category;
    }
    const trivia = await this.aggregate([
        { $match: query },
        { $sample: { size: count } }
    ]);
    return trivia;
};
/**
 * Get trivia by category
 */
TriviaQuestionSchema.statics.getTriviaByCategory = async function (category, limit = 10) {
    return this.find({ category, isActive: true, dateOfDay: null })
        .limit(limit)
        .sort({ usageCount: 1 }) // Prefer less-used questions
        .exec();
};
/**
 * Update trivia statistics
 */
TriviaQuestionSchema.statics.updateTriviaStats = async function (triviaId, isCorrect) {
    const updateField = isCorrect ? 'correctAnswerCount' : 'incorrectAnswerCount';
    await this.findByIdAndUpdate(triviaId, {
        $inc: {
            usageCount: 1,
            [updateField]: 1
        }
    });
};
/**
 * Assign a trivia question to a specific date
 */
TriviaQuestionSchema.statics.assignDailyTrivia = async function (date) {
    // Normalize date to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    // Find a question that hasn't been used as daily trivia yet
    const unusedTrivia = await this.findOne({
        dateOfDay: null,
        isActive: true
    }).sort({ usageCount: 1 }); // Pick least used
    if (!unusedTrivia) {
        throw new Error('No available trivia questions for daily assignment');
    }
    // Assign the date
    unusedTrivia.dateOfDay = normalizedDate;
    await unusedTrivia.save();
    return unusedTrivia;
};
/**
 * Pre-save middleware for validation
 */
TriviaQuestionSchema.pre('save', function (next) {
    if (this.correctAnswer >= this.options.length) {
        next(new Error('Correct answer index must be within options array bounds'));
    }
    else {
        next();
    }
});
exports.TriviaQuestion = mongoose_1.default.model('TriviaQuestion', TriviaQuestionSchema);
exports.default = exports.TriviaQuestion;
