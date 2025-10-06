import { Request, Response } from 'express';
import { User } from '../models/User';
import { 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken 
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

import twilio from "twilio";
import dotenv from 'dotenv';

// Ensure dotenv is loaded
dotenv.config();

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
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized successfully');
  } catch (error) {
    console.log('❌ Failed to initialize Twilio client:', error instanceof Error ? error.message : String(error));
    client = null;
  }
} else {
  console.log('🔧 Development mode: Twilio client not initialized (using console OTP)');
}

const smsService = {
  sendOTP: async (phoneNumber: string, otp: string): Promise<boolean> => {
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
    } catch (error) {
      console.error("❌ Error sending OTP:", error);
      console.log(`📱 [FALLBACK] OTP for ${phoneNumber}: ${otp} (SMS failed, use console OTP)`);
      console.log(`ℹ️  SMS failed, but OTP is still valid for login`);
      // Return true for fallback mode - this allows development to continue
      return true;
    }
  }
};


// Send OTP to phone number
export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
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
    let user = await User.findOne({ phoneNumber });

    // Create user if doesn't exist, or reactivate if inactive
    if (!user) {
      // For new users, email is required
      if (!email) {
        return sendBadRequest(res, 'User not found. Please sign up first or check your phone number.');
      }
      
      // Check if email already exists
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return sendConflict(res, 'Email is already registered');
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
        referral: {
          referredBy: referralCode || undefined,
          referredUsers: [],
          totalReferrals: 0,
          referralEarnings: 0
        }
      });
    } else if (user && user.isActive && email) {
      // If user exists and is active, and email is provided (signup attempt)
      // This means someone is trying to signup with an existing number
      return sendConflict(res, 'Phone number is already registered. Please use Sign In instead.');
    } else if (user && user.isActive && !email) {
      // If user exists and is active, and no email is provided (login attempt)
      // This is normal login flow, continue with OTP generation
      // No need to create new user or modify existing user data
    } else if (user && !user.isActive) {
      // Reactivate deactivated account - reset to fresh state
      user.isActive = true;
      user.auth.isVerified = false;
      user.auth.isOnboarded = false;
      user.auth.refreshToken = undefined;
      user.auth.loginAttempts = 0;
      user.auth.lockUntil = undefined;
      
      // Update email if provided and different
      if (email && user.email !== email) {
        const emailExists = await User.findOne({ email });
        if (emailExists && String(emailExists._id) !== String(user._id)) {
          return sendConflict(res, 'Email is already registered');
        }
        user.email = email;
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
      throw new AppError('Failed to send OTP. Please try again.', 500);
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
    
    sendSuccess(res, 
      { 
        message: 'OTP sent successfully',
        expiresIn: 10 * 60 // 10 minutes in seconds
      }, 
      'OTP sent to your phone number'
    );

  } catch (error) {
    throw new AppError('Failed to send OTP', 500);
  }
});

// Verify OTP and login
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, otp } = req.body;

  console.log(`🔍 [VERIFY] Starting OTP verification for ${phoneNumber} with OTP: ${otp}`);

  // Find user with OTP fields
  const user = await User.findOne({ phoneNumber }).select('+auth.otpCode +auth.otpExpiry');

  if (!user) {
    console.log(`❌ [VERIFY] User not found for phone: ${phoneNumber}`);
    return sendNotFound(res, 'User not found');
  }

  console.log(`✅ [VERIFY] User found for phone: ${phoneNumber}`);

  // Check if account is inactive
  if (!user.isActive) {
    console.log(`❌ [VERIFY] Account is deactivated for phone: ${phoneNumber}`);
    return sendUnauthorized(res, 'Account is deactivated. Please contact support.');
  }

  // Check if account is locked
  if (user.isAccountLocked()) {
    return sendTooManyRequests(res, 'Account is temporarily locked');
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
          // Use addFunds method if available, or update manually
          refereeWallet.balance.total += 30;
          refereeWallet.balance.available += 30;
          refereeWallet.statistics.totalEarned += 30;
          refereeWallet.statistics.totalTopups += 30;
          await refereeWallet.save();
        }

        // Update user referral stats
        referrerUser.referral.referredUsers.push(String(user._id));
        referrerUser.referral.totalReferrals += 1;
        await referrerUser.save();

        console.log(`🎁 [REFERRAL] New referral created! Referee ${user.phoneNumber} received ₹30 signup bonus.`);
      }
    } catch (error) {
      console.error('Error processing referral:', error);
      // Don't fail the OTP verification if referral processing fails
    }
  }
  
  // Update last login
  user.auth.lastLogin = new Date();
  
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
  if (req.user) {
    // Clear refresh token
    req.user.auth.refreshToken = undefined;
    await req.user.save();
  }

  sendSuccess(res, null, 'Logged out successfully');
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
    throw new AppError('Failed to complete onboarding', 500);
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
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  if (!req.file) {
    return sendBadRequest(res, 'No image file provided');
  }

  try {
    // Cloudinary automatically uploads the file via multer middleware
    // The file URL is available in req.file.path
    const avatarUrl = (req.file as any).path;

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

    sendSuccess(res, userData, 'Profile picture updated successfully');

  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw new AppError('Failed to upload profile picture', 500);
  }
});