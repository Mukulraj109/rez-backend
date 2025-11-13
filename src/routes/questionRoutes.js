const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { protect } = require('../middleware/auth'); // Assuming auth middleware exists

/**
 * Question Routes
 *
 * Endpoints for product Q&A functionality
 */

// Product Questions
router.get(
  '/products/:productId/questions',
  questionController.getProductQuestions
);

router.post(
  '/products/:productId/questions',
  protect, // Requires authentication
  questionController.askQuestion
);

// Question Operations
router.post(
  '/questions/:questionId/answers',
  protect, // Requires authentication
  questionController.answerQuestion
);

router.post(
  '/questions/:questionId/answers/:answerId/helpful',
  protect, // Requires authentication
  questionController.markAnswerHelpful
);

router.delete(
  '/questions/:questionId',
  protect, // Requires authentication
  questionController.deleteQuestion
);

router.post(
  '/questions/:questionId/report',
  protect, // Requires authentication
  questionController.reportQuestion
);

// User Questions
router.get(
  '/users/me/questions',
  protect, // Requires authentication
  questionController.getUserQuestions
);

module.exports = router;
