const mongoose = require('mongoose');

/**
 * ProductQuestion Model
 *
 * Handles product questions and answers
 * Features:
 * - Question text with user information
 * - Multiple answers per question
 * - Helpful votes on answers
 * - Verification status (verified purchase, store rep)
 * - Moderation status
 */

const productQuestionSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },

    // Question Details
    question: {
      text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      userName: {
        type: String,
        required: true,
      },
      userAvatar: String,
      isVerifiedPurchase: {
        type: Boolean,
        default: false,
      },
      askedAt: {
        type: Date,
        default: Date.now,
      },
    },

    // Answers Array
    answers: [
      {
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: 1000,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        userName: {
          type: String,
          required: true,
        },
        userAvatar: String,

        // Answer Type
        answerType: {
          type: String,
          enum: ['user', 'store', 'admin'],
          default: 'user',
        },

        // Verification Badges
        isVerifiedPurchase: {
          type: Boolean,
          default: false,
        },
        isStoreRepresentative: {
          type: Boolean,
          default: false,
        },

        // Helpful Votes
        helpful: {
          count: {
            type: Number,
            default: 0,
          },
          users: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
            },
          ],
        },

        answeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'approved', // Auto-approve for now, can add moderation later
    },

    // Moderation
    moderation: {
      isReviewed: {
        type: Boolean,
        default: false,
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedAt: Date,
      reason: String,
    },

    // Engagement Metrics
    views: {
      type: Number,
      default: 0,
    },

    answerCount: {
      type: Number,
      default: 0,
    },

    // Flags/Reports
    flags: {
      count: {
        type: Number,
        default: 0,
      },
      reasons: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
productQuestionSchema.index({ productId: 1, createdAt: -1 });
productQuestionSchema.index({ 'question.userId': 1 });
productQuestionSchema.index({ status: 1 });
productQuestionSchema.index({ answerCount: -1 }); // For sorting by answer count

// Virtual for hasAnswers
productQuestionSchema.virtual('hasAnswers').get(function () {
  return this.answers && this.answers.length > 0;
});

// Method to add answer
productQuestionSchema.methods.addAnswer = function (answerData) {
  this.answers.push(answerData);
  this.answerCount = this.answers.length;
  return this.save();
};

// Method to mark answer as helpful
productQuestionSchema.methods.markAnswerHelpful = function (answerId, userId) {
  const answer = this.answers.id(answerId);

  if (!answer) {
    throw new Error('Answer not found');
  }

  // Check if user already marked as helpful
  const alreadyMarked = answer.helpful.users.some(
    (id) => id.toString() === userId.toString()
  );

  if (alreadyMarked) {
    // Remove helpful vote
    answer.helpful.users = answer.helpful.users.filter(
      (id) => id.toString() !== userId.toString()
    );
    answer.helpful.count = Math.max(0, answer.helpful.count - 1);
  } else {
    // Add helpful vote
    answer.helpful.users.push(userId);
    answer.helpful.count += 1;
  }

  return this.save();
};

// Static method to get questions for a product
productQuestionSchema.statics.getProductQuestions = function (
  productId,
  options = {}
) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'recent', // 'recent', 'popular', 'unanswered'
    status = 'approved',
  } = options;

  const skip = (page - 1) * limit;

  // Build query
  const query = {
    productId,
    status,
  };

  // Build sort
  let sort = {};
  switch (sortBy) {
    case 'popular':
      sort = { answerCount: -1, createdAt: -1 };
      break;
    case 'unanswered':
      sort = { answerCount: 1, createdAt: -1 };
      break;
    case 'recent':
    default:
      sort = { createdAt: -1 };
      break;
  }

  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .select('-flags -moderation')
    .lean();
};

// Static method to get user's questions
productQuestionSchema.statics.getUserQuestions = function (userId, options = {}) {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  return this.find({ 'question.userId': userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-flags -moderation')
    .lean();
};

// Pre-save middleware to update answerCount
productQuestionSchema.pre('save', function (next) {
  if (this.isModified('answers')) {
    this.answerCount = this.answers.length;
  }
  next();
});

const ProductQuestion = mongoose.model('ProductQuestion', productQuestionSchema);

module.exports = ProductQuestion;
