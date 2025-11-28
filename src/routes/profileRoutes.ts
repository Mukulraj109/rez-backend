// Profile Routes
// Routes for user profile management endpoints

import express from 'express';
import {
  getProfile,
  updateProfile,
  getProfileCompletion,
  saveRingSize,
  uploadProfilePicture,
  deleteProfilePicture,
  verifyProfile
} from '../controllers/profileController';
import { authenticate } from '../middleware/auth';
import { uploadProfileImage } from '../middleware/upload';

const router = express.Router();

// All profile routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile data
 * @access  Private
 */
router.get('/', getProfile);

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/', updateProfile);

/**
 * @route   GET /api/user/profile/completion
 * @desc    Get profile completion status
 * @access  Private
 */
router.get('/completion', getProfileCompletion);

/**
 * @route   POST /api/user/profile/ring-size
 * @desc    Save ring size to user profile
 * @access  Private
 */
router.post('/ring-size', saveRingSize);

/**
 * @route   POST /api/user/profile/picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/picture', uploadProfileImage.single('profilePicture'), uploadProfilePicture);

/**
 * @route   DELETE /api/user/profile/picture
 * @desc    Delete profile picture
 * @access  Private
 */
router.delete('/picture', deleteProfilePicture);

/**
 * @route   POST /api/user/profile/verify
 * @desc    Submit profile verification documents
 * @access  Private
 */
router.post('/verify', verifyProfile);

export default router;
