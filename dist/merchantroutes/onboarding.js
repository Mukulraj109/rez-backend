"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const OnboardingService_1 = require("../merchantservices/OnboardingService");
const DocumentVerificationService_1 = require("../merchantservices/DocumentVerificationService");
const merchantauth_1 = require("../middleware/merchantauth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/documents/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
        }
    }
});
/**
 * @route   GET /api/merchant/onboarding/status
 * @desc    Get onboarding status and progress
 * @access  Private (Merchant)
 */
router.get('/status', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        const status = await OnboardingService_1.OnboardingService.getOnboardingStatus(merchantId);
        return res.status(200).json({
            success: true,
            data: {
                status: status.status || 'pending',
                currentStep: status.currentStep || 1,
                completedSteps: status.completedSteps || [],
                totalSteps: status.totalSteps || 5,
                progressPercentage: status.progressPercentage || 0,
                stepData: status.stepData || {},
                startedAt: status.startedAt,
                completedAt: status.completedAt,
                rejectionReason: status.rejectionReason
            }
        });
    }
    catch (error) {
        console.error('Get onboarding status error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get onboarding status',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
});
/**
 * @route   POST /api/merchant/onboarding/step/:stepNumber
 * @desc    Save step data (auto-save)
 * @access  Private (Merchant)
 */
router.post('/step/:stepNumber', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const stepNumber = parseInt(req.params.stepNumber);
        const stepData = req.body;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 5) {
            return res.status(400).json({
                success: false,
                message: 'Invalid step number. Must be between 1 and 5.'
            });
        }
        if (!stepData || Object.keys(stepData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Step data is required'
            });
        }
        const result = await OnboardingService_1.OnboardingService.saveStepData(merchantId, stepNumber, stepData);
        return res.status(200).json({
            success: true,
            message: result.message || `Step ${stepNumber} data saved successfully`,
            data: result.stepData || {}
        });
    }
    catch (error) {
        console.error('Save step data error:', error);
        console.error('Step number:', req.params.stepNumber);
        console.error('Step data received:', JSON.stringify(req.body, null, 2));
        // Return 400 for validation errors, 500 for server errors
        const statusCode = error.message?.includes('required') ||
            error.message?.includes('invalid') ||
            error.message?.includes('Invalid') ? 400 : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Failed to save step data',
            ...(process.env.NODE_ENV === 'development' && {
                error: error.message,
                stepNumber: req.params.stepNumber
            })
        });
    }
});
/**
 * @route   POST /api/merchant/onboarding/step/:stepNumber/complete
 * @desc    Complete step and move to next
 * @access  Private (Merchant)
 */
router.post('/step/:stepNumber/complete', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const stepNumber = parseInt(req.params.stepNumber);
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        const result = await OnboardingService_1.OnboardingService.completeStep(merchantId, stepNumber);
        res.json({
            success: true,
            message: result.message,
            data: {
                currentStep: result.currentStep,
                completedSteps: result.completedSteps,
                progressPercentage: result.progressPercentage,
                canSubmit: result.canSubmit
            }
        });
    }
    catch (error) {
        console.error('Complete step error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to complete step'
        });
    }
});
/**
 * @route   POST /api/merchant/onboarding/step/:stepNumber/previous
 * @desc    Go back to previous step
 * @access  Private (Merchant)
 */
router.post('/step/:stepNumber/previous', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const stepNumber = parseInt(req.params.stepNumber);
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        const result = await OnboardingService_1.OnboardingService.previousStep(merchantId, stepNumber);
        res.json({
            success: true,
            data: {
                currentStep: result.currentStep
            }
        });
    }
    catch (error) {
        console.error('Previous step error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to go to previous step'
        });
    }
});
/**
 * @route   POST /api/merchant/onboarding/submit
 * @desc    Submit onboarding for verification
 * @access  Private (Merchant)
 */
router.post('/submit', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        // Get merchantId from auth middleware - it sets req.merchantId
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        // Validate that OnboardingService exists
        if (!OnboardingService_1.OnboardingService || typeof OnboardingService_1.OnboardingService.submitForVerification !== 'function') {
            console.error('OnboardingService.submitForVerification not available');
            return res.status(500).json({
                success: false,
                message: 'Onboarding service is not available',
                ...(process.env.NODE_ENV === 'development' && {
                    error: 'OnboardingService.submitForVerification is not a function'
                })
            });
        }
        const result = await OnboardingService_1.OnboardingService.submitForVerification(merchantId);
        return res.status(200).json({
            success: true,
            message: result.message || 'Onboarding submitted successfully',
            data: {
                status: result.status
            }
        });
    }
    catch (error) {
        console.error('Submit onboarding error:', error);
        console.error('Error stack:', error.stack);
        // Return 400 for validation errors, 500 for server errors
        const isValidationError = error.message?.includes('required') ||
            error.message?.includes('invalid') ||
            error.message?.includes('missing') ||
            error.message?.includes('must be completed') ||
            error.message?.includes('incomplete') ||
            error.message?.includes('not started');
        const statusCode = isValidationError ? 400 : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Failed to submit onboarding',
            ...(process.env.NODE_ENV === 'development' && {
                error: error.message,
                stack: error.stack
            })
        });
    }
});
/**
 * @route   POST /api/merchant/onboarding/documents/upload
 * @desc    Upload verification document
 * @access  Private (Merchant)
 */
router.post('/documents/upload', merchantauth_1.authMiddleware, upload.single('document'), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const documentType = req.body.documentType;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        if (!documentType) {
            return res.status(400).json({
                success: false,
                message: 'Document type is required'
            });
        }
        // Upload to Cloudinary
        const uploadResult = await DocumentVerificationService_1.DocumentVerificationService.uploadDocument(req.file, merchantId, documentType);
        // Add to onboarding
        const result = await DocumentVerificationService_1.DocumentVerificationService.addDocumentToOnboarding(merchantId, documentType, uploadResult.url);
        res.json({
            success: true,
            message: result.message,
            data: {
                document: result.document,
                uploadDetails: {
                    url: uploadResult.url,
                    size: uploadResult.size,
                    format: uploadResult.format
                }
            }
        });
    }
    catch (error) {
        console.error('Document upload error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to upload document'
        });
    }
});
/**
 * @route   GET /api/merchant/onboarding/documents
 * @desc    Get all uploaded documents
 * @access  Private (Merchant)
 */
router.get('/documents', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        const result = await DocumentVerificationService_1.DocumentVerificationService.getMerchantDocuments(merchantId);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get documents'
        });
    }
});
/**
 * @route   DELETE /api/merchant/onboarding/documents/:documentIndex
 * @desc    Delete a document
 * @access  Private (Merchant)
 */
router.delete('/documents/:documentIndex', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const documentIndex = parseInt(req.params.documentIndex);
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Merchant ID not found. Authentication required.'
            });
        }
        const result = await DocumentVerificationService_1.DocumentVerificationService.deleteDocument(merchantId, documentIndex);
        res.json({
            success: true,
            message: result.message
        });
    }
    catch (error) {
        console.error('Delete document error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to delete document'
        });
    }
});
// ============================================================================
// ADMIN ROUTES
// Note: Admin authentication middleware should be added when admin system is implemented
// For now, these routes are protected by merchant auth with role checking
// ============================================================================
/**
 * @route   POST /api/admin/onboarding/:merchantId/approve
 * @desc    Approve merchant onboarding
 * @access  Private (Admin)
 */
router.post('/:merchantId/approve', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.params.merchantId;
        const adminId = req.admin.id;
        const result = await OnboardingService_1.OnboardingService.approveOnboarding(merchantId, adminId);
        res.json({
            success: true,
            message: result.message,
            data: {
                merchantId: result.merchantId,
                storeId: result.storeId
            }
        });
    }
    catch (error) {
        console.error('Approve onboarding error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to approve onboarding'
        });
    }
});
/**
 * @route   POST /api/admin/onboarding/:merchantId/reject
 * @desc    Reject merchant onboarding
 * @access  Private (Admin)
 */
router.post('/:merchantId/reject', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.params.merchantId;
        const adminId = req.admin.id;
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }
        const result = await OnboardingService_1.OnboardingService.rejectOnboarding(merchantId, reason, adminId);
        res.json({
            success: true,
            message: result.message,
            data: {
                reason: result.reason
            }
        });
    }
    catch (error) {
        console.error('Reject onboarding error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to reject onboarding'
        });
    }
});
/**
 * @route   POST /api/admin/onboarding/:merchantId/documents/:documentIndex/verify
 * @desc    Verify a specific document
 * @access  Private (Admin)
 */
router.post('/:merchantId/documents/:documentIndex/verify', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.params.merchantId;
        const documentIndex = parseInt(req.params.documentIndex);
        const adminId = req.admin.id;
        const { approved, rejectionReason } = req.body;
        if (approved === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Approved status is required'
            });
        }
        const result = await DocumentVerificationService_1.DocumentVerificationService.verifyDocument(merchantId, documentIndex, adminId, approved, rejectionReason);
        res.json({
            success: true,
            message: approved ? 'Document verified successfully' : 'Document rejected',
            data: result
        });
    }
    catch (error) {
        console.error('Verify document error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to verify document'
        });
    }
});
/**
 * @route   POST /api/admin/onboarding/:merchantId/documents/verify-all
 * @desc    Verify all documents at once
 * @access  Private (Admin)
 */
router.post('/:merchantId/documents/verify-all', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.params.merchantId;
        const adminId = req.admin.id;
        const { approved, rejectionReason } = req.body;
        if (approved === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Approved status is required'
            });
        }
        const result = await DocumentVerificationService_1.DocumentVerificationService.verifyAllDocuments(merchantId, adminId, approved, rejectionReason);
        res.json({
            success: true,
            message: result.message,
            data: {
                verificationStatus: result.verificationStatus,
                totalDocuments: result.totalDocuments
            }
        });
    }
    catch (error) {
        console.error('Verify all documents error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to verify documents'
        });
    }
});
/**
 * @route   POST /api/admin/onboarding/:merchantId/request-documents
 * @desc    Request additional documents from merchant
 * @access  Private (Admin)
 */
router.post('/:merchantId/request-documents', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.params.merchantId;
        const { documentTypes, message } = req.body;
        if (!documentTypes || !Array.isArray(documentTypes) || documentTypes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Document types array is required'
            });
        }
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }
        const result = await DocumentVerificationService_1.DocumentVerificationService.requestAdditionalDocuments(merchantId, documentTypes, message);
        res.json({
            success: true,
            message: result.message,
            data: {
                requestedDocuments: result.requestedDocuments
            }
        });
    }
    catch (error) {
        console.error('Request documents error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to request documents'
        });
    }
});
/**
 * @route   GET /api/admin/onboarding/pending
 * @desc    Get all pending onboarding verifications
 * @access  Private (Admin)
 */
router.get('/pending', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const pendingVerifications = await DocumentVerificationService_1.DocumentVerificationService.getPendingVerifications(limit);
        res.json({
            success: true,
            data: pendingVerifications,
            count: pendingVerifications.length
        });
    }
    catch (error) {
        console.error('Get pending verifications error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get pending verifications'
        });
    }
});
/**
 * @route   GET /api/admin/onboarding/analytics
 * @desc    Get onboarding analytics
 * @access  Private (Admin)
 */
router.get('/analytics', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const analytics = await OnboardingService_1.OnboardingService.getOnboardingAnalytics();
        res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        console.error('Get onboarding analytics error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get analytics'
        });
    }
});
/**
 * @route   GET /api/admin/onboarding/documents/statistics
 * @desc    Get document verification statistics
 * @access  Private (Admin)
 */
router.get('/documents/statistics', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const statistics = await DocumentVerificationService_1.DocumentVerificationService.getDocumentStatistics();
        res.json({
            success: true,
            data: statistics
        });
    }
    catch (error) {
        console.error('Get document statistics error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get statistics'
        });
    }
});
exports.default = router;
