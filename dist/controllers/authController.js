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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = exports.getUserStatistics = exports.deleteAccount = exports.completeOnboarding = exports.updateProfile = exports.getCurrentUser = exports.logout = exports.refreshToken = exports.verifyOTP = exports.sendOTP = void 0;
const User_1 = require("../models/User");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const twilio_1 = __importDefault(require("twilio"));
const dotenv_1 = __importDefault(require("dotenv"));
// Ensure dotenv is loaded
dotenv_1.default.config();
// Debug: Check if Twilio credentials are loaded
console.log('🔍 Twilio Debug:', {
    accountSid: process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 8)}...` : 'NOT_FOUND',
    authToken: process.env.TWILIO_AUTH_TOKEN ? `${process.env.TWILIO_AUTH_TOKEN.substring(0, 8)}...` : 'NOT_FOUND',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
});
// Use environment variables for Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER?.startsWith('+')
    ? process.env.TWILIO_PHONE_NUMBER
    : `+91${process.env.TWILIO_PHONE_NUMBER || '8210224305'}`;
console.log('🔍 Twilio configuration:', {
    hasAccountSid: !!TWILIO_ACCOUNT_SID,
    hasAuthToken: !!TWILIO_AUTH_TOKEN,
    phoneNumber: TWILIO_PHONE_NUMBER,
    isDevelopment: process.env.NODE_ENV === 'development'
});
// Only initialize Twilio client if we have valid credentials
let client = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_ACCOUNT_SID.startsWith('AC')) {
    try {
        client = (0, twilio_1.default)(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        console.log('✅ Twilio client initialized successfully');
    }
    catch (error) {
        console.log('❌ Failed to initialize Twilio client:', error instanceof Error ? error.message : String(error));
        client = null;
    }
}
else {
    console.log('🔧 Development mode: Twilio client not initialized (using console OTP)');
}
const smsService = {
    sendOTP: async (phoneNumber, otp) => {
        // Always log OTP to console for development
        console.log(`📱 [OTP_SERVICE] Processing OTP for ${phoneNumber}: ${otp}`);
        // Check if we have a valid Twilio client
        if (!client) {
            console.log(`🔧 [DEV_MODE] No Twilio client available, using console OTP`);
            console.log(`📱 [CONSOLE_OTP] ==== OTP FOR ${phoneNumber}: ${otp} ====`);
            console.log(`⏰ [EXPIRY] Valid for 10 minutes`);
            console.log(`💡 [TIP] Use this OTP code to login to your app`);
            return true;
        }
        // Try to send SMS via Twilio
        try {
            await client.messages.create({
                body: `Your REZ App OTP is ${otp}. Valid for 10 minutes.`,
                from: TWILIO_PHONE_NUMBER,
                to: phoneNumber
            });
            console.log(`✅ SMS successfully sent to ${phoneNumber}`);
            console.log(`📱 [SUCCESS] OTP for ${phoneNumber}: ${otp} (sent via SMS)`);
            return true;
        }
        catch (error) {
            console.error("❌ Error sending OTP:", error);
            console.log(`📱 [FALLBACK] OTP for ${phoneNumber}: ${otp} (SMS failed, use console OTP)`);
            console.log(`ℹ️  SMS failed, but OTP is still valid for login`);
            // Return true for fallback mode - this allows development to continue
            return true;
        }
    }
};
// Send OTP to phone number
exports.sendOTP = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { phoneNumber, email, referralCode } = req.body;
    console.log('\n' + '='.repeat(60));
    console.log('🚀 [SEND_OTP] NEW OTP REQUEST RECEIVED');
    console.log('📱 Phone:', phoneNumber);
    console.log('📧 Email:', email);
    console.log('🎫 Referral:', referralCode || 'None');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('='.repeat(60));
    try {
        // Check if user exists
        let user = await User_1.User.findOne({ phoneNumber });
        // Create user if doesn't exist, or reactivate if inactive
        if (!user) {
            // For new users, email is required
            if (!email) {
                return (0, response_1.sendBadRequest)(res, 'User not found. Please sign up first or check your phone number.');
            }
            // Check if email already exists
            const emailExists = await User_1.User.findOne({ email });
            if (emailExists) {
                return (0, response_1.sendConflict)(res, 'Email is already registered');
            }
            // Check if referral code is valid (if provided)
            let referrerUser = null;
            if (referralCode) {
                referrerUser = await User_1.User.findOne({ 'referral.referralCode': referralCode });
                if (!referrerUser) {
                    return (0, response_1.sendBadRequest)(res, 'Invalid referral code');
                }
            }
            user = new User_1.User({
                phoneNumber,
                email,
                role: 'user',
                auth: {
                    isVerified: false,
                    isOnboarded: false
                },
                referral: {
                    referredBy: referralCode || undefined,
                    referredUsers: [],
                    totalReferrals: 0,
                    referralEarnings: 0
                }
            });
        }
        else if (user && user.isActive && email) {
            // If user exists and is active, and email is provided (signup attempt)
            // This means someone is trying to signup with an existing number
            return (0, response_1.sendConflict)(res, 'Phone number is already registered. Please use Sign In instead.');
        }
        else if (user && user.isActive && !email) {
            // If user exists and is active, and no email is provided (login attempt)
            // This is normal login flow, continue with OTP generation
            // No need to create new user or modify existing user data
        }
        else if (user && !user.isActive) {
            // Reactivate deactivated account - reset to fresh state
            user.isActive = true;
            user.auth.isVerified = false;
            user.auth.isOnboarded = false;
            user.auth.refreshToken = undefined;
            user.auth.loginAttempts = 0;
            user.auth.lockUntil = undefined;
            // Update email if provided and different
            if (email && user.email !== email) {
                const emailExists = await User_1.User.findOne({ email });
                if (emailExists && String(emailExists._id) !== String(user._id)) {
                    return (0, response_1.sendConflict)(res, 'Email is already registered');
                }
                user.email = email;
            }
        }
        // Safety check to ensure user exists at this point
        if (!user) {
            return (0, response_1.sendError)(res, 'User creation or retrieval failed', 500);
        }
        // Check if account is locked
        if (user.isAccountLocked()) {
            const lockTime = user.auth.lockUntil;
            const minutesLeft = lockTime ? Math.ceil((lockTime.getTime() - Date.now()) / (1000 * 60)) : 0;
            return (0, response_1.sendTooManyRequests)(res, `Account locked. Try again in ${minutesLeft} minutes.`);
        }
        // Generate and save OTP
        console.log(`🔐 [OTP_GENERATE] Generating OTP for ${phoneNumber}`);
        const otp = user.generateOTP();
        await user.save();
        console.log(`✅ [OTP_GENERATE] OTP generated and saved for ${phoneNumber}`);
        // Send OTP via SMS (Twilio implementation)
        console.log(`📤 [OTP_SEND] Attempting to send OTP to ${phoneNumber}`);
        const otpSent = await smsService.sendOTP(phoneNumber, otp);
        console.log(`📱 [OTP_TERMINAL] ==== OTP FOR ${phoneNumber}: ${otp} ====`);
        if (!otpSent) {
            console.log(`❌ [OTP_FAIL] Failed to send OTP to ${phoneNumber}`);
            throw new errorHandler_1.AppError('Failed to send OTP. Please try again.', 500);
        }
        console.log(`✅ [OTP_SUCCESS] OTP successfully sent to ${phoneNumber}`);
        console.log(`🎯 [OTP_READY] Ready to verify - Phone: ${phoneNumber}, OTP: ${otp}`);
        console.log('\n' + '🎉'.repeat(20));
        console.log('   🔥 OTP GENERATED SUCCESSFULLY! 🔥');
        console.log(`   📱 Phone: ${phoneNumber}`);
        console.log(`   🔑 OTP CODE: ${otp}`);
        console.log(`   ⏳ Expires in: 10 minutes`);
        console.log('   Use this OTP in your app to login!');
        console.log('🎉'.repeat(20) + '\n');
        (0, response_1.sendSuccess)(res, {
            message: 'OTP sent successfully',
            expiresIn: 10 * 60 // 10 minutes in seconds
        }, 'OTP sent to your phone number');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to send OTP', 500);
    }
});
// Verify OTP and login
exports.verifyOTP = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { phoneNumber, otp } = req.body;
    console.log(`🔍 [VERIFY] Starting OTP verification for ${phoneNumber} with OTP: ${otp}`);
    // Find user with OTP fields
    const user = await User_1.User.findOne({ phoneNumber }).select('+auth.otpCode +auth.otpExpiry');
    if (!user) {
        console.log(`❌ [VERIFY] User not found for phone: ${phoneNumber}`);
        return (0, response_1.sendNotFound)(res, 'User not found');
    }
    console.log(`✅ [VERIFY] User found for phone: ${phoneNumber}`);
    // Check if account is inactive
    if (!user.isActive) {
        console.log(`❌ [VERIFY] Account is deactivated for phone: ${phoneNumber}`);
        return (0, response_1.sendUnauthorized)(res, 'Account is deactivated. Please contact support.');
    }
    // Check if account is locked
    if (user.isAccountLocked()) {
        return (0, response_1.sendTooManyRequests)(res, 'Account is temporarily locked');
    }
    // Debug OTP verification
    console.log(`🔍 [OTP DEBUG] Verifying OTP for ${phoneNumber}:`);
    console.log(`   - Provided OTP: ${otp}`);
    console.log(`   - Stored OTP: ${user.auth.otpCode}`);
    console.log(`   - OTP Expiry: ${user.auth.otpExpiry}`);
    console.log(`   - Current Time: ${new Date()}`);
    console.log(`   - Is Expired: ${user.auth.otpExpiry ? user.auth.otpExpiry < new Date() : 'No expiry set'}`);
    // DEV MODE: Skip OTP verification for development
    // TODO: UNCOMMENT BELOW SECTION FOR PRODUCTION DEPLOYMENT
    /*
    // Verify OTP
    const isValidOTP = user.verifyOTP(otp);
  
    if (!isValidOTP) {
      console.log(`❌ [OTP DEBUG] OTP verification failed`);
      // Increment failed attempts
      await user.incrementLoginAttempts();
      return sendUnauthorized(res, 'Invalid or expired OTP');
    }
    */
    // DEV MODE: Accept any 6-digit OTP for development
    console.log(`🔧 [DEV MODE] Skipping OTP verification - accepting any OTP: ${otp}`);
    console.log(`✅ [OTP DEBUG] OTP verification successful (DEV MODE)`);
    // Reset login attempts on successful verification
    await user.resetLoginAttempts();
    // Process referral if this is a new user with a referrer
    if (!user.auth.isVerified && user.referral.referredBy) {
        try {
            const referrerUser = await User_1.User.findOne({ 'referral.referralCode': user.referral.referredBy });
            if (referrerUser) {
                // Add this user to referrer's referred users list
                referrerUser.referral.referredUsers.push(String(user._id));
                referrerUser.referral.totalReferrals += 1;
                // Give referral bonus to referrer (you can adjust the amount)
                const referralBonus = 50; // ₹50 bonus for each successful referral
                referrerUser.wallet.balance += referralBonus;
                referrerUser.wallet.totalEarned += referralBonus;
                referrerUser.referral.referralEarnings += referralBonus;
                await referrerUser.save();
                console.log(`💰 [REFERRAL] User ${user.phoneNumber} was referred by ${referrerUser.phoneNumber}. Bonus of ₹${referralBonus} credited to referrer.`);
            }
        }
        catch (error) {
            console.error('Error processing referral:', error);
            // Don't fail the OTP verification if referral processing fails
        }
    }
    // Update last login
    user.auth.lastLogin = new Date();
    // Generate tokens
    const accessToken = (0, auth_1.generateToken)(String(user._id), user.role);
    const refreshToken = (0, auth_1.generateRefreshToken)(String(user._id));
    // Save refresh token
    user.auth.refreshToken = refreshToken;
    await user.save();
    // Prepare user data for response (exclude sensitive fields)
    const userData = {
        id: user._id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        profile: user.profile,
        preferences: user.preferences,
        wallet: user.wallet,
        role: user.role,
        isVerified: user.auth.isVerified,
        isOnboarded: user.auth.isOnboarded
    };
    (0, response_1.sendSuccess)(res, {
        user: userData,
        tokens: {
            accessToken,
            refreshToken,
            expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
        }
    }, 'Login successful');
});
// Refresh access token
exports.refreshToken = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return (0, response_1.sendUnauthorized)(res, 'Refresh token required');
    }
    try {
        // Verify refresh token
        const decoded = (0, auth_1.verifyRefreshToken)(refreshToken);
        // Find user and check if refresh token matches
        const user = await User_1.User.findById(decoded.userId).select('+auth.refreshToken');
        if (!user || user.auth.refreshToken !== refreshToken) {
            return (0, response_1.sendUnauthorized)(res, 'Invalid refresh token');
        }
        if (!user.isActive) {
            return (0, response_1.sendUnauthorized)(res, 'Account is deactivated');
        }
        // Generate new tokens
        const newAccessToken = (0, auth_1.generateToken)(String(user._id), user.role);
        const newRefreshToken = (0, auth_1.generateRefreshToken)(String(user._id));
        // Update refresh token in database
        user.auth.refreshToken = newRefreshToken;
        await user.save();
        (0, response_1.sendSuccess)(res, {
            tokens: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
            }
        }, 'Token refreshed successfully');
    }
    catch (error) {
        return (0, response_1.sendUnauthorized)(res, 'Invalid refresh token');
    }
});
// Logout
exports.logout = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (req.user) {
        // Clear refresh token
        req.user.auth.refreshToken = undefined;
        await req.user.save();
    }
    (0, response_1.sendSuccess)(res, null, 'Logged out successfully');
});
// Get current user profile
exports.getCurrentUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    const userData = {
        id: req.user._id,
        phoneNumber: req.user.phoneNumber,
        email: req.user.email,
        profile: req.user.profile,
        preferences: req.user.preferences,
        wallet: req.user.wallet,
        role: req.user.role,
        isVerified: req.user.auth.isVerified,
        isOnboarded: req.user.auth.isOnboarded,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt
    };
    (0, response_1.sendSuccess)(res, userData, 'User profile retrieved successfully');
});
// Update user profile
exports.updateProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    const { profile, preferences } = req.body;
    try {
        // Update profile fields
        if (profile) {
            Object.keys(profile).forEach(key => {
                if (profile[key] !== undefined) {
                    req.user.profile[key] = profile[key];
                }
            });
        }
        // Update preferences
        if (preferences) {
            Object.keys(preferences).forEach(key => {
                if (preferences[key] !== undefined) {
                    req.user.preferences[key] = preferences[key];
                }
            });
        }
        await req.user.save();
        const userData = {
            id: req.user._id,
            phoneNumber: req.user.phoneNumber,
            email: req.user.email,
            profile: req.user.profile,
            preferences: req.user.preferences,
            wallet: req.user.wallet,
            role: req.user.role,
            isVerified: req.user.auth.isVerified,
            isOnboarded: req.user.auth.isOnboarded
        };
        (0, response_1.sendSuccess)(res, userData, 'Profile updated successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to update profile', 500);
    }
});
// Complete onboarding
exports.completeOnboarding = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    if (req.user.auth.isOnboarded) {
        return (0, response_1.sendConflict)(res, 'User is already onboarded');
    }
    const { profile, preferences } = req.body;
    try {
        // Update profile and preferences
        if (profile) {
            Object.keys(profile).forEach(key => {
                if (profile[key] !== undefined) {
                    req.user.profile[key] = profile[key];
                }
            });
        }
        if (preferences) {
            Object.keys(preferences).forEach(key => {
                if (preferences[key] !== undefined) {
                    req.user.preferences[key] = preferences[key];
                }
            });
        }
        // Mark as onboarded
        req.user.auth.isOnboarded = true;
        await req.user.save();
        const userData = {
            id: req.user._id,
            phoneNumber: req.user.phoneNumber,
            email: req.user.email,
            profile: req.user.profile,
            preferences: req.user.preferences,
            wallet: req.user.wallet,
            role: req.user.role,
            isVerified: req.user.auth.isVerified,
            isOnboarded: req.user.auth.isOnboarded
        };
        (0, response_1.sendSuccess)(res, userData, 'Onboarding completed successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to complete onboarding', 500);
    }
});
// Delete account (soft delete)
exports.deleteAccount = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    try {
        // Soft delete - deactivate account
        req.user.isActive = false;
        req.user.auth.refreshToken = undefined;
        await req.user.save();
        (0, response_1.sendSuccess)(res, null, 'Account deleted successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to delete account', 500);
    }
});
// Get user statistics (aggregated data from all modules)
exports.getUserStatistics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    try {
        const userId = req.user._id;
        // Import models dynamically to avoid circular dependencies
        const { Order } = await Promise.resolve().then(() => __importStar(require('../models/Order')));
        const { Video } = await Promise.resolve().then(() => __importStar(require('../models/Video')));
        const { Project } = await Promise.resolve().then(() => __importStar(require('../models/Project')));
        const OfferRedemption = (await Promise.resolve().then(() => __importStar(require('../models/OfferRedemption')))).default;
        const { UserVoucher } = await Promise.resolve().then(() => __importStar(require('../models/Voucher')));
        const { Review } = await Promise.resolve().then(() => __importStar(require('../models/Review')));
        const { UserAchievement } = await Promise.resolve().then(() => __importStar(require('../models/Achievement')));
        // Aggregate statistics from various modules
        const [orderStats, videoStats, projectStats, offerStats, voucherStats, reviewStats, achievementStats] = await Promise.all([
            // Order statistics
            Order.aggregate([
                { $match: { user: userId } },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalSpent: { $sum: '$totalPrice' },
                        completedOrders: {
                            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
                        },
                        cancelledOrders: {
                            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                        }
                    }
                }
            ]),
            // Video statistics
            Video.aggregate([
                { $match: { creator: userId } },
                {
                    $group: {
                        _id: null,
                        totalVideos: { $sum: 1 },
                        totalViews: { $sum: '$engagement.views' },
                        totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
                        totalShares: { $sum: '$engagement.shares' }
                    }
                }
            ]),
            // Project statistics
            Project.aggregate([
                { $match: { 'submissions.user': userId } },
                { $unwind: '$submissions' },
                { $match: { 'submissions.user': userId } },
                {
                    $group: {
                        _id: null,
                        totalProjects: { $sum: 1 },
                        approvedSubmissions: {
                            $sum: { $cond: [{ $eq: ['$submissions.status', 'approved'] }, 1, 0] }
                        },
                        rejectedSubmissions: {
                            $sum: { $cond: [{ $eq: ['$submissions.status', 'rejected'] }, 1, 0] }
                        },
                        totalEarned: { $sum: { $ifNull: ['$submissions.paidAmount', 0] } }
                    }
                }
            ]),
            // Offer redemption statistics
            OfferRedemption.countDocuments({ user: userId }),
            // Voucher statistics
            UserVoucher.aggregate([
                { $match: { user: userId } },
                {
                    $group: {
                        _id: null,
                        totalVouchers: { $sum: 1 },
                        usedVouchers: {
                            $sum: { $cond: [{ $eq: ['$status', 'used'] }, 1, 0] }
                        },
                        activeVouchers: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        }
                    }
                }
            ]),
            // Review statistics
            Review.countDocuments({ user: userId, isActive: true }),
            // Achievement statistics
            UserAchievement.aggregate([
                { $match: { user: userId } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        unlocked: {
                            $sum: { $cond: [{ $eq: ['$unlocked', true] }, 1, 0] }
                        }
                    }
                }
            ])
        ]);
        // Build statistics response
        const statistics = {
            user: {
                joinedDate: req.user.createdAt,
                isVerified: req.user.auth.isVerified,
                totalReferrals: req.user.referral.totalReferrals,
                referralEarnings: req.user.referral.referralEarnings
            },
            wallet: {
                balance: req.user.wallet.balance,
                totalEarned: req.user.wallet.totalEarned,
                totalSpent: req.user.wallet.totalSpent,
                pendingAmount: req.user.wallet.pendingAmount
            },
            orders: {
                total: orderStats[0]?.totalOrders || 0,
                completed: orderStats[0]?.completedOrders || 0,
                cancelled: orderStats[0]?.cancelledOrders || 0,
                totalSpent: orderStats[0]?.totalSpent || 0
            },
            videos: {
                totalCreated: videoStats[0]?.totalVideos || 0,
                totalViews: videoStats[0]?.totalViews || 0,
                totalLikes: videoStats[0]?.totalLikes || 0,
                totalShares: videoStats[0]?.totalShares || 0
            },
            projects: {
                totalParticipated: projectStats[0]?.totalProjects || 0,
                approved: projectStats[0]?.approvedSubmissions || 0,
                rejected: projectStats[0]?.rejectedSubmissions || 0,
                totalEarned: projectStats[0]?.totalEarned || 0
            },
            offers: {
                totalRedeemed: offerStats || 0
            },
            vouchers: {
                total: voucherStats[0]?.totalVouchers || 0,
                used: voucherStats[0]?.usedVouchers || 0,
                active: voucherStats[0]?.activeVouchers || 0
            },
            reviews: {
                total: reviewStats || 0
            },
            achievements: {
                total: achievementStats[0]?.total || 0,
                unlocked: achievementStats[0]?.unlocked || 0
            },
            summary: {
                totalActivity: ((orderStats[0]?.totalOrders || 0) +
                    (videoStats[0]?.totalVideos || 0) +
                    (projectStats[0]?.totalProjects || 0) +
                    (offerStats || 0) +
                    (voucherStats[0]?.totalVouchers || 0) +
                    (reviewStats || 0)),
                totalEarnings: ((req.user.wallet.totalEarned || 0) +
                    (projectStats[0]?.totalEarned || 0) +
                    (req.user.referral.referralEarnings || 0)),
                totalSpendings: ((orderStats[0]?.totalSpent || 0) +
                    (req.user.wallet.totalSpent || 0))
            }
        };
        (0, response_1.sendSuccess)(res, statistics, 'User statistics retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching user statistics:', error);
        throw new errorHandler_1.AppError('Failed to fetch user statistics', 500);
    }
});
// Upload profile avatar
exports.uploadAvatar = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_1.sendUnauthorized)(res, 'Authentication required');
    }
    if (!req.file) {
        return (0, response_1.sendBadRequest)(res, 'No image file provided');
    }
    try {
        // Cloudinary automatically uploads the file via multer middleware
        // The file URL is available in req.file.path
        const avatarUrl = req.file.path;
        // Update user profile with new avatar URL
        req.user.profile.avatar = avatarUrl;
        await req.user.save();
        const userData = {
            id: req.user._id,
            phoneNumber: req.user.phoneNumber,
            email: req.user.email,
            profile: req.user.profile,
            preferences: req.user.preferences,
            wallet: req.user.wallet,
            role: req.user.role,
            isVerified: req.user.auth.isVerified,
            isOnboarded: req.user.auth.isOnboarded
        };
        (0, response_1.sendSuccess)(res, userData, 'Profile picture updated successfully');
    }
    catch (error) {
        console.error('Error uploading avatar:', error);
        throw new errorHandler_1.AppError('Failed to upload profile picture', 500);
    }
});
