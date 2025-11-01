"use strict";
// ScratchCard Routes
// Routes for scratch card functionality
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scratchCardController_1 = require("../controllers/scratchCardController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   GET /api/scratch-cards/eligibility
 * @desc    Check if user is eligible for scratch card
 * @access  Private
 */
router.get('/eligibility', scratchCardController_1.checkEligibility);
/**
 * @route   GET /api/scratch-cards
 * @desc    Get user's scratch cards
 * @access  Private
 */
router.get('/', scratchCardController_1.getUserScratchCards);
/**
 * @route   POST /api/scratch-cards
 * @desc    Create a new scratch card for user
 * @access  Private
 */
router.post('/', scratchCardController_1.createScratchCard);
/**
 * @route   POST /api/scratch-cards/:id/scratch
 * @desc    Scratch a card to reveal prize
 * @access  Private
 */
router.post('/:id/scratch', scratchCardController_1.scratchCard);
/**
 * @route   POST /api/scratch-cards/:id/claim
 * @desc    Claim prize from scratch card
 * @access  Private
 */
router.post('/:id/claim', scratchCardController_1.claimPrize);
exports.default = router;
