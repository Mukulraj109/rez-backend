const ProductQuestion = require('../models/ProductQuestion');
const Product = require('../models/Product');

/**
 * Question Controller
 *
 * Handles product question and answer operations
 */

/**
 * Get questions for a product
 * GET /api/products/:productId/questions
 */
exports.getProductQuestions = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'recent', // 'recent', 'popular', 'unanswered'
    } = req.query;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Get questions
    const questions = await ProductQuestion.getProductQuestions(productId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
    });

    // Get total count
    const totalCount = await ProductQuestion.countDocuments({
      productId,
      status: 'approved',
    });

    // Calculate unanswered count
    const unansweredCount = await ProductQuestion.countDocuments({
      productId,
      status: 'approved',
      answerCount: 0,
    });

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        stats: {
          total: totalCount,
          unanswered: unansweredCount,
          answered: totalCount - unansweredCount,
        },
      },
    });
  } catch (error) {
    console.error('Error getting product questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get questions',
      error: error.message,
    });
  }
};

/**
 * Ask a question
 * POST /api/products/:productId/questions
 */
exports.askQuestion = async (req, res) => {
  try {
    const { productId } = req.params;
    const { question } = req.body;
    const userId = req.user._id; // From auth middleware

    // Validate input
    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question text is required',
      });
    }

    if (question.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Question must be 500 characters or less',
      });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if user has purchased this product (optional)
    const isVerifiedPurchase = false; // TODO: Implement purchase verification
    // const order = await Order.findOne({
    //   userId,
    //   'items.productId': productId,
    //   status: 'delivered',
    // });
    // const isVerifiedPurchase = !!order;

    // Create question
    const newQuestion = new ProductQuestion({
      productId,
      question: {
        text: question.trim(),
        userId,
        userName: req.user.name || 'Anonymous',
        userAvatar: req.user.profileImage,
        isVerifiedPurchase,
      },
      answers: [],
      status: 'approved', // Auto-approve for now
    });

    await newQuestion.save();

    res.status(201).json({
      success: true,
      message: 'Question posted successfully',
      data: newQuestion,
    });
  } catch (error) {
    console.error('Error asking question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post question',
      error: error.message,
    });
  }
};

/**
 * Answer a question
 * POST /api/questions/:questionId/answers
 */
exports.answerQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { answer } = req.body;
    const userId = req.user._id; // From auth middleware

    // Validate input
    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Answer text is required',
      });
    }

    if (answer.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Answer must be 1000 characters or less',
      });
    }

    // Find question
    const question = await ProductQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    // Check if user has purchased this product (optional)
    const isVerifiedPurchase = false; // TODO: Implement purchase verification

    // Check if user is store representative (TODO: Implement store verification)
    const isStoreRepresentative = false;

    // Determine answer type
    let answerType = 'user';
    if (req.user.role === 'admin') {
      answerType = 'admin';
    } else if (isStoreRepresentative) {
      answerType = 'store';
    }

    // Add answer
    const answerData = {
      text: answer.trim(),
      userId,
      userName: req.user.name || 'Anonymous',
      userAvatar: req.user.profileImage,
      answerType,
      isVerifiedPurchase,
      isStoreRepresentative,
      helpful: {
        count: 0,
        users: [],
      },
    };

    await question.addAnswer(answerData);

    res.json({
      success: true,
      message: 'Answer posted successfully',
      data: question,
    });
  } catch (error) {
    console.error('Error answering question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post answer',
      error: error.message,
    });
  }
};

/**
 * Mark answer as helpful
 * POST /api/questions/:questionId/answers/:answerId/helpful
 */
exports.markAnswerHelpful = async (req, res) => {
  try {
    const { questionId, answerId } = req.params;
    const userId = req.user._id; // From auth middleware

    // Find question
    const question = await ProductQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    // Mark answer as helpful (toggles vote)
    await question.markAnswerHelpful(answerId, userId);

    // Get updated answer
    const updatedAnswer = question.answers.id(answerId);

    res.json({
      success: true,
      message: 'Vote recorded',
      data: {
        answerId,
        helpfulCount: updatedAnswer.helpful.count,
        isHelpful: updatedAnswer.helpful.users.some(
          (id) => id.toString() === userId.toString()
        ),
      },
    });
  } catch (error) {
    console.error('Error marking answer as helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record vote',
      error: error.message,
    });
  }
};

/**
 * Get user's questions
 * GET /api/users/me/questions
 */
exports.getUserQuestions = async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware
    const { page = 1, limit = 10 } = req.query;

    const questions = await ProductQuestion.getUserQuestions(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    const totalCount = await ProductQuestion.countDocuments({
      'question.userId': userId,
    });

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error getting user questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get questions',
      error: error.message,
    });
  }
};

/**
 * Delete a question
 * DELETE /api/questions/:questionId
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user._id; // From auth middleware

    // Find question
    const question = await ProductQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    // Check if user is the question author or admin
    if (
      question.question.userId.toString() !== userId.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this question',
      });
    }

    await ProductQuestion.findByIdAndDelete(questionId);

    res.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message,
    });
  }
};

/**
 * Report/Flag a question or answer
 * POST /api/questions/:questionId/report
 */
exports.reportQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { reason, answerId } = req.body;

    // Find question
    const question = await ProductQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    // Update flags
    question.flags.count += 1;
    question.flags.reasons.push(reason || 'Inappropriate content');

    // If flags exceed threshold, mark as flagged
    if (question.flags.count >= 5) {
      question.status = 'flagged';
    }

    await question.save();

    res.json({
      success: true,
      message: 'Report submitted successfully',
    });
  } catch (error) {
    console.error('Error reporting question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit report',
      error: error.message,
    });
  }
};

module.exports = exports;
