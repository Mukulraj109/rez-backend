"use strict";
// Profile Routes
// Routes for user profile management endpoints
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const profileController_1 = require("../controllers/profileController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
// All profile routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   GET /api/user/profile
 * @desc    Get user profile data
 * @access  Private
 */
router.get('/', profileController_1.getProfile);
/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/', profileController_1.updateProfile);
/**
 * @route   GET /api/user/profile/completion
 * @desc    Get profile completion status
 * @access  Private
 */
router.get('/completion', profileController_1.getProfileCompletion);
/**
 * @route   POST /api/user/profile/ring-size
 * @desc    Save ring size to user profile
 * @access  Private
 */
router.post('/ring-size', profileController_1.saveRingSize);
/**
 * @route   POST /api/user/profile/picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/picture', upload_1.uploadProfileImage.single('profilePicture'), profileController_1.uploadProfilePicture);
/**
 * @route   DELETE /api/user/profile/picture
 * @desc    Delete profile picture
 * @access  Private
 */
router.delete('/picture', profileController_1.deleteProfilePicture);
/**
 * @route   POST /api/user/profile/verify
 * @desc    Submit profile verification documents
 * @access  Private
 */
router.post('/verify', profileController_1.verifyProfile);
exports.default = router;
