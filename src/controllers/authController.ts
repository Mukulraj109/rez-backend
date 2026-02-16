import { Request, Response } from 'express';
import { User } from '../models/User';
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyToken,
  blacklistToken
} from '../middleware/auth';
import {
  sendSuccess,
  sendError,
  sendCreated,
  sendUnauthorized,
  sendNotFound,
  sendConflict,
  sendTooManyRequests,
  sendBadRequest
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import referralService from '../services/referralService';
import { Wallet } from '../models/Wallet';
import { Types } from 'mongoose';
import achievementService from '../services/achievementService';
import gamificationIntegrationService from '../services/gamificationIntegrationService';

import twilio from "twilio";
import dotenv from 'dotenv';

// Ensure dotenv is loaded
dotenv.config();

// Twilio credentials loaded from environment

// Use environment variables for Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER?.startsWith('+') 
  ? process.env.TWILIO_PHONE_NUMBER 
  : `+91${process.env.TWILIO_PHONE_NUMBER || '8210224305'}`;

// Twilio configuration loaded

// Only initialize Twilio client if we have valid credentials
let client = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_ACCOUNT_SID.startsWith('AC')) {
  try {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized successfully');
  } catch (error) {
    console.log('❌ Failed to initialize Twilio client:', error instanceof Error ? error.message : String(error));
    client = null;
  }
} else {
  console.log('🔧 Development mode: Twilio client not initialized (using console OTP)');
}

const isDev = process.env.NODE_ENV === 'development';

const smsService = {
  sendOTP: async (phoneNumber: string, otp: string): Promise<boolean> => {
    // In development without Twilio, log OTP to console for testing
    if (!client) {
      if (isDev) {
        console.log(`📱 [DEV_MODE] OTP for ${phoneNumber}: ${otp}`);
      } else {
        console.error(`❌ [OTP_SERVICE] No SMS provider configured in production!`);
        return false;
      }
      return true;
    }

    // Send SMS via Twilio
    try {
      await client.messages.create({
        body: `Your REZ App OTP is ${otp}. Valid for 10 minutes.`,
        from: TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      console.log(`✅ [OTP_SERVICE] SMS sent to ***${phoneNumber.slice(-4)}`);
      return true;
    } catch (error) {
      console.error("❌ [OTP_SERVICE] SMS send failed:", error instanceof Error ? error.message : String(error));
      if (isDev) {
        console.log(`📱 [DEV_FALLBACK] OTP for ${phoneNumber}: ${otp}`);
        return true;
      }
      return false;
    }
  }
};


// Phone normalization helper - supports international numbers
const normalizePhoneNumber = (phone: string): string => {
  // Remove all spaces and special characters except +
  let normalized = phone.replace(/[\s\-()]/g, '');

  // If already has international format (starts with +), return as-is
  if (normalized.startsWith('+')) {
    return normalized;
  }

  // For backward compatibility: if starts with country code without +, add +
  if (normalized.startsWith('91') && normalized.length >= 12) {
    return `+${normalized}`;
  }
  if (normalized.startsWith('971') && normalized.length >= 12) {
    return `+${normalized}`;
  }

  // Default: assume Indian number if no country code, add +91
  return `+91${normalized}`;
};

// Send OTP to phone number
export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
  let { phoneNumber, email, referralCode } = req.body;

  // Normalize phone number BEFORE validation
  const originalPhone = phoneNumber;
  phoneNumber = normalizePhoneNumber(phoneNumber);

  if (isDev) {
    console.log(`[SEND_OTP] Phone: ${phoneNumber}, Email: ${email || 'none'}`);
  }

  try {
    // Check if user exists
    let user = await User.findOne({ phoneNumber });

    // Create user if doesn't exist, or reactivate if inactive
    if (!user) {
      // Check if email already exists (only if email is provided)
      if (email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
          return sendConflict(res, 'Email is already registered');
        }
      }

      // Check if referral code is valid (if provided)
      let referrerUser = null;
      if (referralCode) {
        referrerUser = await User.findOne({ 'referral.referralCode': referralCode });
        if (!referrerUser) {
          return sendBadRequest(res, 'Invalid referral code');
        }
      }

      user = new User({
        phoneNumber,
        email,
        role: 'user',
        auth: {
          isVerified: false,
          isOnboarded: false
        },
        referral: referralCode ? {
          referredBy: referralCode,
          referredUsers: [],
          totalReferrals: 0,
          referralEarnings: 0
        } : undefined
      });

      // Initialize achievements for new user
      try {
        await achievementService.initializeUserAchievements(String(user._id));
      } catch (error) {
        console.error('❌ [AUTH] Error initializing achievements for new user:', error);
        // Don't fail user creation if achievement initialization fails
      }
    } else if (user && user.isActive && email) {
      // If user exists and is active, and email is provided (signup attempt)
      // This means someone is trying to signup with an existing number
      return sendConflict(res, 'Phone number is already registered. Please use Sign In instead.');
    } else if (user && user.isActive && !email) {
      // If user exists and is active, and no email is provided (login attempt)
      // This is normal login flow, continue with OTP generation
      // No need to create new user or modify existing user data
    } else if (user && !user.isActive) {
      // Deactivated account — DON'T reactivate yet.
      // Just generate OTP; reactivation happens in verifyOTP after successful verification.
      // S-7: Do NOT reset loginAttempts or lockUntil here — failed login count
      // must persist through deactivation/reactivation to prevent lockout bypass.

      // S-13: Do NOT apply email changes during reactivation — email must be
      // verified separately after the account is reactivated. Log if attempted.
      if (email && user.email !== email) {
        console.log(`⚠️ [AUTH] Email change attempted during reactivation for user ${user._id} — will be ignored. User must update email after reactivation.`);
      }
    }

    // Safety check to ensure user exists at this point
    if (!user) {
      return sendError(res, 'User creation or retrieval failed', 500);
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      const lockTime = user.auth.lockUntil;
      const minutesLeft = lockTime ? Math.ceil((lockTime.getTime() - Date.now()) / (1000 * 60)) : 0;
      
      return sendTooManyRequests(res, `Account locked. Try again in ${minutesLeft} minutes.`);
    }

    // Generate and save OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP via SMS
    const otpSent = await smsService.sendOTP(phoneNumber, otp);

    if (!otpSent) {
      throw new AppError('Failed to send OTP. Please try again.', 500);
    }

    const responseData: any = {
      message: 'OTP sent successfully',
      expiresIn: 10 * 60 // 10 minutes in seconds
    };

    // Only include OTP in response in development mode (for testing convenience)
    if (isDev) {
      responseData.devOtp = otp;
    }

    sendSuccess(res, responseData, 'OTP sent to your phone number');

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('[SEND_OTP] Error:', error instanceof Error ? error.message : String(error));
    throw new AppError('Failed to send OTP. Please try again.', 500);
  }
});

// Verify OTP and login
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  let { phoneNumber, otp } = req.body;

  // Normalize phone number BEFORE looking up user
  const originalPhone = phoneNumber;
  phoneNumber = normalizePhoneNumber(phoneNumber);

  if (isDev) {
    console.log(`[VERIFY_OTP] Phone: ${phoneNumber}`);
  }

  // Find user with OTP fields
  const user = await User.findOne({ phoneNumber }).select('+auth.otpCode +auth.otpExpiry');

  if (!user) {
    return sendNotFound(res, 'User not found');
  }

  // Deactivated accounts are allowed through OTP verification — reactivated below on success.

  // Check if account is locked
  if (user.isAccountLocked()) {
    return sendTooManyRequests(res, 'Account is temporarily locked');
  }

  // Development bypass: Accept OTP starting with "123" for testing
  const isDevelopmentBypass = isDev && otp.startsWith('123');

  if (isDevelopmentBypass) {
    console.log(`[DEV_BYPASS] Development OTP bypass for ${phoneNumber}`);
  } else {
    // Verify OTP properly
    const isValidOTP = user.verifyOTP(otp);

    if (!isValidOTP) {
      await user.incrementLoginAttempts();
      return sendUnauthorized(res, 'Invalid or expired OTP');
    }
  }

  // Reset login attempts on successful verification
  await user.resetLoginAttempts();

  // Process referral if this is a new user with a referrer
  if (!user.auth.isVerified && user.referral.referredBy) {
    try {
      const referrerUser = await User.findOne({ 'referral.referralCode': user.referral.referredBy });
      if (referrerUser) {
        // Create referral relationship using referral service
        await referralService.createReferral({
          referrerId: new Types.ObjectId(String(referrerUser._id)),
          refereeId: new Types.ObjectId(String(user._id)),
          referralCode: user.referral.referredBy,
          signupSource: 'otp_verification',
        });

        // Add referee discount (₹30) to their wallet for first order
        let refereeWallet = await Wallet.findOne({ user: user._id });
        if (!refereeWallet) {
          // Create wallet if doesn't exist
          refereeWallet = await Wallet.create({
            user: user._id,
            balance: {
              total: 30,
              available: 30,
              pending: 0,
            },
            statistics: {
              totalEarned: 30,
              totalSpent: 0,
              totalCashback: 0,
              totalRefunds: 0,
              totalTopups: 30,
              totalWithdrawals: 0,
            },
          });
        } else {
          // Use atomic addFunds method
          await refereeWallet.addFunds(30, 'topup');
        }

        // Update user referral stats
        referrerUser.referral.referredUsers.push(String(user._id));
        referrerUser.referral.totalReferrals += 1;
        await referrerUser.save();

        // Trigger achievement update for the REFERRER (not the new user)
        try {
          await achievementService.triggerAchievementUpdate(String(referrerUser._id), 'referral_completed');
          console.log(`🏆 [REFERRAL] Achievement update triggered for referrer: ${referrerUser._id}`);
        } catch (achievementError) {
          console.error('❌ [REFERRAL] Error triggering referrer achievement:', achievementError);
        }

        // Update referrer's partner referral task progress
        try {
          const Partner = require('../models/Partner').default;
          const partner = await Partner.findOne({ userId: referrerUser._id });
          
          if (partner) {
            const referralTask = partner.tasks.find((t: any) => t.type === 'referral');
            if (referralTask && referralTask.progress.current < referralTask.progress.target) {
              referralTask.progress.current += 1;
              
              if (referralTask.progress.current >= referralTask.progress.target) {
                referralTask.completed = true;
                referralTask.completedAt = new Date();
              }
              
              await partner.save();
              console.log('✅ [REFERRAL] Partner referral task updated:', referralTask.progress.current, '/', referralTask.progress.target);
            }
          }
        } catch (error) {
          console.error('❌ [REFERRAL] Error updating partner referral task:', error);
        }

        console.log(`🎁 [REFERRAL] New referral created! Referee ${user._id} received ₹30 signup bonus.`);
      }
    } catch (error) {
      console.error('Error processing referral:', error);
      // Don't fail the OTP verification if referral processing fails
    }
  }

  // Reactivate deactivated accounts after successful OTP verification
  if (!user.isActive) {
    user.isActive = true;
    user.auth.isVerified = false;
    user.auth.isOnboarded = false;
    user.auth.refreshToken = undefined;

    // S-13: Do NOT apply any pending email changes during reactivation.
    // Email changes must go through a separate verified flow (profile update with OTP/email verification).
    // The original email on file is preserved to prevent unverified email takeover.
    if ((user as any)._pendingReactivationEmail) {
      console.log(`⚠️ [AUTH] Email change requested during reactivation for user ${user._id} — ignored. User must update email separately after reactivation.`);
    }

    console.log('✅ [AUTH] Deactivated account reactivated after OTP verification:', user._id);
  }

  // Update last login
  user.auth.lastLogin = new Date();

  // Trigger gamification events for login
  try {
    await gamificationIntegrationService.onUserLogin(String(user._id));
    console.log(`✅ [GAMIFICATION] Login tracking completed for user: ${user._id}`);
  } catch (gamificationError) {
    // Don't fail login if gamification fails
    console.error(`❌ [GAMIFICATION] Error tracking login:`, gamificationError);
  }

  // Generate tokens
  const accessToken = generateToken(String(user._id), user.role);
  const refreshToken = generateRefreshToken(String(user._id));

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

  sendSuccess(res, {
    user: userData,
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
    }
  }, 'Login successful');
});

// Refresh access token
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendUnauthorized(res, 'Refresh token required');
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user and check if refresh token matches
    const user = await User.findById(decoded.userId).select('+auth.refreshToken');
    
    if (!user || user.auth.refreshToken !== refreshToken) {
      return sendUnauthorized(res, 'Invalid refresh token');
    }

    if (!user.isActive) {
      return sendUnauthorized(res, 'Account is deactivated');
    }

    // Blacklist the old refresh token (TTL = 7 days to match refresh token lifetime)
    blacklistToken(refreshToken, 7 * 24 * 60 * 60);

    // Generate new tokens
    const newAccessToken = generateToken(String(user._id), user.role);
    const newRefreshToken = generateRefreshToken(String(user._id));

    // Update refresh token in database
    user.auth.refreshToken = newRefreshToken;
    await user.save();

    sendSuccess(res, {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
      }
    }, 'Token refreshed successfully');

  } catch (error) {
    return sendUnauthorized(res, 'Invalid refresh token');
  }
});

// Logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Try to get user from token if available
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      // Blacklist the access token so it can't be reused (TTL = 24h to match token lifetime)
      blacklistToken(token, 24 * 60 * 60);

      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId);

        if (user) {
          // Blacklist the refresh token too
          if (user.auth.refreshToken) {
            blacklistToken(user.auth.refreshToken, 7 * 24 * 60 * 60);
          }
          // Clear refresh token from DB
          user.auth.refreshToken = undefined;
          await user.save();
          console.log('✅ [LOGOUT] User tokens cleared:', user._id);
        }
      } catch (tokenError) {
        // Token is invalid/expired, but that's okay for logout
        console.log('⚠️ [LOGOUT] Invalid token during logout (this is expected):', tokenError instanceof Error ? tokenError.message : String(tokenError));
      }
    }
    
    console.log('✅ [LOGOUT] Logout successful');
    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    // Even if there's an error, logout should succeed
    console.warn('⚠️ [LOGOUT] Error during logout, but proceeding:', error instanceof Error ? error.message : String(error));
    sendSuccess(res, null, 'Logged out successfully');
  }
});

// Get current user profile
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
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

  sendSuccess(res, userData, 'User profile retrieved successfully');
});

// Update user profile
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const { profile, preferences } = req.body;

  try {
    // Update profile fields
    if (profile) {
      Object.keys(profile).forEach(key => {
        if (profile[key] !== undefined) {
          req.user!.profile[key as keyof typeof req.user.profile] = profile[key];
        }
      });
    }

    // Update preferences
    if (preferences) {
      Object.keys(preferences).forEach(key => {
        if (preferences[key] !== undefined) {
          req.user!.preferences[key as keyof typeof req.user.preferences] = preferences[key];
        }
      });
    }

    await req.user.save();

    // Sync with partner profile to update completion percentage
    try {
      const partnerService = require('../services/partnerService').default;
      const userId = (req.user._id as any).toString();
      await partnerService.syncProfileCompletion(userId);
    } catch (error) {
      console.error('Error syncing partner profile:', error);
      // Don't fail the profile update if partner sync fails
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
      isOnboarded: req.user.auth.isOnboarded
    };

    sendSuccess(res, userData, 'Profile updated successfully');

  } catch (error) {
    throw new AppError('Failed to update profile', 500);
  }
});

// Complete onboarding
export const completeOnboarding = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  if (req.user.auth.isOnboarded) {
    return sendConflict(res, 'User is already onboarded');
  }

  const { profile, preferences } = req.body;

  try {
    // Update profile and preferences
    if (profile) {
      Object.keys(profile).forEach(key => {
        if (profile[key] !== undefined) {
          req.user!.profile[key as keyof typeof req.user.profile] = profile[key];
        }
      });
    }

    if (preferences) {
      Object.keys(preferences).forEach(key => {
        if (preferences[key] !== undefined) {
          req.user!.preferences[key as keyof typeof req.user.preferences] = preferences[key];
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

    sendSuccess(res, userData, 'Onboarding completed successfully');

  } catch (error) {
    console.error('❌ [COMPLETE_ONBOARDING] Error details:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to complete onboarding: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
});

// Change password
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required', 400);
  }

  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters long', 400);
  }

  // S-10: Require at least one uppercase, one lowercase, and one digit
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    throw new AppError('Password must contain at least one uppercase letter, one lowercase letter, and one digit', 400);
  }

  try {
    // Verify current password
    const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();

    sendSuccess(res, null, 'Password changed successfully');

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to change password', 500);
  }
});

// Delete account (soft delete)
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  try {
    // Soft delete - deactivate account
    req.user.isActive = false;
    req.user.auth.refreshToken = undefined;
    await req.user.save();

    sendSuccess(res, null, 'Account deleted successfully');

  } catch (error) {
    throw new AppError('Failed to delete account', 500);
  }
});

// Get user statistics (aggregated data from all modules)
export const getUserStatistics = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  try {
    const userId = req.user._id;

    // Import models dynamically to avoid circular dependencies
    const { Order } = await import('../models/Order');
    const { Video } = await import('../models/Video');
    const { Project } = await import('../models/Project');
    const OfferRedemption = (await import('../models/OfferRedemption')).default;
    const { UserVoucher } = await import('../models/Voucher');
    const { Review } = await import('../models/Review');
    const { UserAchievement } = await import('../models/Achievement');

    // Aggregate statistics from various modules
    const [
      orderStats,
      videoStats,
      projectStats,
      offerStats,
      voucherStats,
      reviewStats,
      achievementStats
    ] = await Promise.all([
      // Order statistics (exclude pending_payment orders)
      Order.aggregate([
        {
          $match: {
            user: userId,
            status: { $ne: 'pending_payment' } // Exclude pending payment orders
          }
        },
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
        totalActivity: (
          (orderStats[0]?.totalOrders || 0) +
          (videoStats[0]?.totalVideos || 0) +
          (projectStats[0]?.totalProjects || 0) +
          (offerStats || 0) +
          (voucherStats[0]?.totalVouchers || 0) +
          (reviewStats || 0)
        ),
        totalEarnings: (
          (req.user.wallet.totalEarned || 0) +
          (projectStats[0]?.totalEarned || 0) +
          (req.user.referral.referralEarnings || 0)
        ),
        totalSpendings: (
          (orderStats[0]?.totalSpent || 0) +
          (req.user.wallet.totalSpent || 0)
        )
      }
    };

    sendSuccess(res, statistics, 'User statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw new AppError('Failed to fetch user statistics', 500);
  }
});

// Upload profile avatar
export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log('📸 [AVATAR UPLOAD] Started for user:', req.user?._id);
  
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  if (!req.file) {
    console.error('❌ [AVATAR UPLOAD] No file provided');
    return sendBadRequest(res, 'No image file provided');
  }

  try {
    // Cloudinary automatically uploads the file via multer middleware
    // The file URL is available in req.file.path
    const avatarUrl = (req.file as any).path;
    
    if (!avatarUrl) {
      console.error('❌ [AVATAR UPLOAD] No URL returned from Cloudinary');
      throw new AppError('Failed to upload image to Cloudinary', 500);
    }
    
    console.log('✅ [AVATAR UPLOAD] Cloudinary upload successful:', avatarUrl);

    // Update user profile with new avatar URL
    req.user.profile.avatar = avatarUrl;
    await req.user.save();
    console.log('💾 [AVATAR UPLOAD] User profile updated');

    // Sync with partner profile to update avatar AND completion percentage
    try {
      const partnerService = require('../services/partnerService').default;
      const userId = (req.user._id as any).toString();
      
      // Update partner avatar
      const Partner = require('../models/Partner').default;
      await Partner.findOneAndUpdate(
        { userId: userId },
        { avatar: avatarUrl }
      );
      console.log('✅ [AVATAR UPLOAD] Partner profile avatar synced');
      
      // Update profile completion
      await partnerService.syncProfileCompletion(userId);
    } catch (error) {
      console.error('Error syncing partner profile:', error);
      // Don't fail the avatar upload if partner sync fails
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
      isOnboarded: req.user.auth.isOnboarded
    };

    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️ [AVATAR UPLOAD] Completed in ${uploadTime} seconds`);

    sendSuccess(res, userData, 'Profile picture updated successfully');

  } catch (error) {
    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ [AVATAR UPLOAD] Failed after ${uploadTime} seconds:`, error);
    throw new AppError('Failed to upload profile picture', 500);
  }
});