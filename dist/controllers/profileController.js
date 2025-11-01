"use strict";
// Profile Controller
// Handles user profile management API endpoints
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyProfile = exports.deleteProfilePicture = exports.uploadProfilePicture = exports.saveRingSize = exports.getProfileCompletion = exports.updateProfile = exports.getProfile = void 0;
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../middleware/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const User_1 = require("../models/User");
/**
 * @desc    Get user profile data
 * @route   GET /api/user/profile
 * @access  Private
 */
exports.getProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    const user = await User_1.User.findById(userId);
    if (!user) {
        return (0, response_1.sendNotFound)(res, 'User not found');
    }
    const profileData = {
        id: user._id.toString(),
        name: user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : '',
        email: user.email,
        phone: user.phoneNumber,
        profilePicture: user.profile?.avatar || '',
        isVerified: user.auth?.isVerified || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
    (0, response_1.sendSuccess)(res, profileData, 'Profile retrieved successfully');
});
/**
 * @desc    Update user profile
 * @route   PUT /api/user/profile
 * @access  Private
 */
exports.updateProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    const { firstName, lastName, email, phone } = req.body;
    try {
        const user = await User_1.User.findById(userId);
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        // Update profile fields
        if (firstName !== undefined) {
            user.profile = user.profile || {};
            user.profile.firstName = firstName;
        }
        if (lastName !== undefined) {
            user.profile = user.profile || {};
            user.profile.lastName = lastName;
        }
        if (email !== undefined && email !== user.email) {
            // Check if email already exists
            const existingUser = await User_1.User.findOne({ email, _id: { $ne: user._id } });
            if (existingUser) {
                return (0, response_1.sendBadRequest)(res, 'Email is already in use');
            }
            user.email = email;
        }
        if (phone !== undefined && phone !== user.phoneNumber) {
            // Check if phone already exists
            const existingUser = await User_1.User.findOne({ phoneNumber: phone, _id: { $ne: user._id } });
            if (existingUser) {
                return (0, response_1.sendBadRequest)(res, 'Phone number is already in use');
            }
            user.phoneNumber = phone;
        }
        await user.save();
        const updatedProfile = {
            id: user._id.toString(),
            name: user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : '',
            email: user.email,
            phone: user.phoneNumber,
            profilePicture: user.profile?.avatar || '',
            isVerified: user.auth?.isVerified || false,
            updatedAt: user.updatedAt
        };
        (0, response_1.sendSuccess)(res, updatedProfile, 'Profile updated successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to update profile', 500);
    }
});
/**
 * @desc    Get profile completion status
 * @route   GET /api/user/profile/completion
 * @access  Private
 */
exports.getProfileCompletion = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    const user = await User_1.User.findById(userId);
    if (!user) {
        return (0, response_1.sendNotFound)(res, 'User not found');
    }
    const profile = user.profile || {};
    const totalFields = 9; // Total number of profile fields (increased to include website)
    let completedFields = 0;
    const missingFields = [];
    const nextSteps = [];
    // Check each field
    if (profile.firstName)
        completedFields++;
    else
        missingFields.push('firstName');
    if (user.email)
        completedFields++;
    else
        missingFields.push('email');
    if (user.phoneNumber)
        completedFields++;
    else
        missingFields.push('phone');
    if (profile.avatar)
        completedFields++;
    else
        missingFields.push('avatar');
    if (profile.dateOfBirth)
        completedFields++;
    else
        missingFields.push('dateOfBirth');
    if (profile.gender)
        completedFields++;
    else
        missingFields.push('gender');
    if (profile.location?.address)
        completedFields++;
    else
        missingFields.push('address');
    if (profile.bio)
        completedFields++;
    else
        missingFields.push('bio');
    if (profile.website)
        completedFields++;
    else
        missingFields.push('website');
    // Calculate completion percentage
    const completionPercentage = Math.round((completedFields / totalFields) * 100);
    // Generate next steps
    if (missingFields.includes('name'))
        nextSteps.push('Add your name');
    if (missingFields.includes('profilePicture'))
        nextSteps.push('Upload a profile picture');
    if (missingFields.includes('dateOfBirth'))
        nextSteps.push('Add your date of birth');
    if (missingFields.includes('address'))
        nextSteps.push('Add your address');
    const completionStatus = {
        totalFields,
        completedFields,
        completionPercentage,
        missingFields,
        nextSteps
    };
    (0, response_1.sendSuccess)(res, completionStatus, 'Profile completion status retrieved successfully');
});
/**
 * @desc    Save ring size to user profile
 * @route   POST /api/user/profile/ring-size
 * @access  Private
 */
exports.saveRingSize = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { ringSize } = req.body;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    if (!ringSize) {
        return (0, response_1.sendError)(res, 'Ring size is required', 400);
    }
    const validSizes = ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'];
    if (!validSizes.includes(ringSize)) {
        return (0, response_1.sendError)(res, 'Invalid ring size', 400);
    }
    try {
        const user = await User_1.User.findById(userId);
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        user.profile = user.profile || {};
        user.profile.ringSize = ringSize;
        await user.save();
        (0, response_1.sendSuccess)(res, { ringSize }, 'Ring size saved successfully');
    }
    catch (error) {
        console.error('❌ [PROFILE] Save ring size failed:', error);
        (0, response_1.sendError)(res, 'Failed to save ring size', 500);
    }
});
/**
 * @desc    Upload profile picture
 * @route   POST /api/user/profile/picture
 * @access  Private
 */
exports.uploadProfilePicture = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    if (!req.file) {
        return (0, response_1.sendBadRequest)(res, 'No profile picture uploaded');
    }
    try {
        const user = await User_1.User.findById(userId);
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        // Update user profile with new picture URL
        user.profile = user.profile || {};
        user.profile.avatar = req.file.path;
        await user.save();
        (0, response_1.sendSuccess)(res, { profilePicture: req.file.path }, 'Profile picture uploaded successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to upload profile picture', 500);
    }
});
/**
 * @desc    Delete profile picture
 * @route   DELETE /api/user/profile/picture
 * @access  Private
 */
exports.deleteProfilePicture = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const user = await User_1.User.findById(userId);
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        // Remove profile picture
        user.profile = user.profile || {};
        user.profile.avatar = '';
        await user.save();
        (0, response_1.sendSuccess)(res, { success: true }, 'Profile picture deleted successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to delete profile picture', 500);
    }
});
/**
 * @desc    Verify profile
 * @route   POST /api/user/profile/verify
 * @access  Private
 */
exports.verifyProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    const { documentType, documentNumber, documentImage } = req.body;
    if (!documentType || !documentNumber || !documentImage) {
        return (0, response_1.sendBadRequest)(res, 'Document type, number, and image are required');
    }
    try {
        const user = await User_1.User.findById(userId);
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        // In a real application, you would:
        // 1. Store the verification documents
        // 2. Send them to a verification service
        // 3. Update the user's verification status
        // For now, we'll just mark it as pending
        user.profile = user.profile || {};
        user.profile.verificationStatus = 'pending';
        user.profile.verificationDocuments = {
            documentType,
            documentNumber,
            documentImage,
            submittedAt: new Date()
        };
        await user.save();
        (0, response_1.sendSuccess)(res, { verificationStatus: 'pending' }, 'Verification documents submitted successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to submit verification documents', 500);
    }
});
