"use strict";
// ScratchCard Controller
// Controller for managing scratch card functionality
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEligibility = exports.claimPrize = exports.scratchCard = exports.getUserScratchCards = exports.createScratchCard = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const asyncHandler_1 = require("../middleware/asyncHandler");
const response_1 = require("../utils/response");
const ScratchCard_1 = __importDefault(require("../models/ScratchCard"));
const Wallet_1 = require("../models/Wallet");
const Voucher_1 = require("../models/Voucher");
const User_1 = require("../models/User");
/**
 * @desc    Create a new scratch card for user
 * @route   POST /api/scratch-cards
 * @access  Private
 */
exports.createScratchCard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const scratchCard = await ScratchCard_1.default.createScratchCard(userId);
        (0, response_1.sendSuccess)(res, {
            id: scratchCard._id,
            prize: scratchCard.prize,
            isScratched: scratchCard.isScratched,
            isClaimed: scratchCard.isClaimed,
            expiresAt: scratchCard.expiresAt,
            createdAt: scratchCard.createdAt
        }, 'Scratch card created successfully');
    }
    catch (error) {
        console.error('❌ [SCRATCH CARD] Create failed:', error);
        (0, response_1.sendError)(res, error.message, 400);
    }
});
/**
 * @desc    Get user's scratch cards
 * @route   GET /api/scratch-cards
 * @access  Private
 */
exports.getUserScratchCards = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const scratchCards = await ScratchCard_1.default.getUserScratchCards(userId);
        const formattedCards = scratchCards.map(card => ({
            id: card._id,
            prize: card.prize,
            isScratched: card.isScratched,
            isClaimed: card.isClaimed,
            claimedAt: card.claimedAt,
            expiresAt: card.expiresAt,
            createdAt: card.createdAt
        }));
        (0, response_1.sendSuccess)(res, formattedCards, 'Scratch cards retrieved successfully');
    }
    catch (error) {
        console.error('❌ [SCRATCH CARD] Get failed:', error);
        (0, response_1.sendError)(res, error.message, 500);
    }
});
/**
 * @desc    Scratch a card to reveal prize
 * @route   POST /api/scratch-cards/:id/scratch
 * @access  Private
 */
exports.scratchCard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const scratchCard = await ScratchCard_1.default.findOne({
            _id: id,
            userId,
            isScratched: false,
            expiresAt: { $gt: new Date() }
        });
        if (!scratchCard) {
            return (0, response_1.sendNotFound)(res, 'Scratch card not found or expired');
        }
        // Mark as scratched
        scratchCard.isScratched = true;
        await scratchCard.save();
        (0, response_1.sendSuccess)(res, {
            id: scratchCard._id,
            prize: scratchCard.prize,
            isScratched: scratchCard.isScratched,
            isClaimed: scratchCard.isClaimed,
            expiresAt: scratchCard.expiresAt
        }, 'Card scratched successfully');
    }
    catch (error) {
        console.error('❌ [SCRATCH CARD] Scratch failed:', error);
        (0, response_1.sendError)(res, error.message, 500);
    }
});
/**
 * @desc    Claim prize from scratch card
 * @route   POST /api/scratch-cards/:id/claim
 * @access  Private
 */
exports.claimPrize = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const scratchCard = await ScratchCard_1.default.findOne({
            _id: id,
            userId,
            isScratched: true,
            isClaimed: false,
            expiresAt: { $gt: new Date() }
        });
        if (!scratchCard) {
            return (0, response_1.sendNotFound)(res, 'Scratch card not found or already claimed');
        }
        const prize = scratchCard.prize;
        let claimResult = {};
        // Process prize based on type
        switch (prize.type) {
            case 'discount':
                // For discount, we'll create a coupon
                claimResult = {
                    type: 'discount',
                    value: prize.value,
                    message: `You've earned ${prize.value}% discount on your next purchase!`
                };
                break;
            case 'cashback':
                // Add cashback to wallet
                const wallet = await Wallet_1.Wallet.findOne({ user: userId });
                if (wallet) {
                    wallet.balance.total += prize.value;
                    wallet.balance.available += prize.value;
                    wallet.statistics.totalCashback += prize.value;
                    await wallet.save();
                }
                claimResult = {
                    type: 'cashback',
                    value: prize.value,
                    message: `₹${prize.value} cashback has been added to your wallet!`
                };
                break;
            case 'coin':
                // Add coins to wallet
                const userWallet = await Wallet_1.Wallet.findOne({ user: userId });
                if (userWallet) {
                    // Add to wasil coin type
                    const wasilCoin = userWallet.coins.find(coin => coin.type === 'wasil');
                    if (wasilCoin) {
                        wasilCoin.amount += prize.value;
                    }
                    else {
                        userWallet.coins.push({
                            type: 'wasil',
                            amount: prize.value,
                            isActive: true,
                            earnedDate: new Date()
                        });
                    }
                    userWallet.balance.total += prize.value;
                    userWallet.balance.available += prize.value;
                    userWallet.statistics.totalEarned += prize.value;
                    await userWallet.save();
                }
                claimResult = {
                    type: 'coin',
                    value: prize.value,
                    message: `${prize.value} REZ coins have been added to your wallet!`
                };
                break;
            case 'voucher':
                // Create a voucher for the user
                const voucher = new Voucher_1.UserVoucher({
                    user: userId,
                    brand: new mongoose_1.default.Types.ObjectId(), // You might need to create a default brand
                    voucherCode: `SCRATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    denomination: prize.value,
                    purchasePrice: 0, // Free voucher from scratch card
                    purchaseDate: new Date(),
                    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    validityDays: 30,
                    status: 'active',
                    deliveryMethod: 'app',
                    deliveryStatus: 'delivered',
                    deliveredAt: new Date(),
                    paymentMethod: 'wallet'
                });
                await voucher.save();
                claimResult = {
                    type: 'voucher',
                    value: prize.value,
                    message: `₹${prize.value} voucher has been added to your account!`
                };
                break;
            default:
                return (0, response_1.sendBadRequest)(res, 'Invalid prize type');
        }
        // Mark prize as claimed
        scratchCard.isClaimed = true;
        scratchCard.claimedAt = new Date();
        await scratchCard.save();
        (0, response_1.sendSuccess)(res, {
            prize: prize,
            claimResult: claimResult,
            claimedAt: scratchCard.claimedAt
        }, 'Prize claimed successfully');
    }
    catch (error) {
        console.error('❌ [SCRATCH CARD] Claim failed:', error);
        (0, response_1.sendError)(res, error.message, 500);
    }
});
/**
 * @desc    Check if user is eligible for scratch card
 * @route   GET /api/scratch-cards/eligibility
 * @access  Private
 */
exports.checkEligibility = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const isEligible = await ScratchCard_1.default.isEligibleForScratchCard(userId);
        // Get profile completion percentage
        const user = await User_1.User.findById(userId);
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        const profile = user.profile || {};
        const totalFields = 9; // Updated to include website field
        let completedFields = 0;
        if (profile.firstName)
            completedFields++;
        if (user.email)
            completedFields++;
        if (user.phoneNumber)
            completedFields++;
        if (profile.avatar)
            completedFields++;
        if (profile.dateOfBirth)
            completedFields++;
        if (profile.gender)
            completedFields++;
        if (profile.location?.address)
            completedFields++;
        if (profile.bio)
            completedFields++;
        if (profile.website)
            completedFields++;
        const completionPercentage = Math.round((completedFields / totalFields) * 100);
        (0, response_1.sendSuccess)(res, {
            isEligible,
            completionPercentage,
            requiredPercentage: 80,
            message: isEligible
                ? 'You are eligible for a scratch card!'
                : `Complete ${80 - completionPercentage}% more of your profile to unlock scratch cards!`
        }, 'Eligibility checked successfully');
    }
    catch (error) {
        console.error('❌ [SCRATCH CARD] Eligibility check failed:', error);
        (0, response_1.sendError)(res, error.message, 500);
    }
});
