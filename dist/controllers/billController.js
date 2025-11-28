"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFraudHistory = exports.getVerificationStatistics = exports.rejectBill = exports.approveBill = exports.getPendingBills = exports.resubmitBill = exports.getBillStatistics = exports.getBillById = exports.getUserBills = exports.uploadBill = void 0;
const Bill_1 = require("../models/Bill");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const errorHandler_1 = require("../middleware/errorHandler");
const billVerificationService_1 = require("../services/billVerificationService");
const cloudinaryUtils_1 = require("../utils/cloudinaryUtils");
const fraudDetectionService_1 = require("../services/fraudDetectionService");
const crypto_1 = __importDefault(require("crypto"));
// Upload bill with image
exports.uploadBill = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    // Check if file is uploaded
    if (!req.file) {
        throw new errorHandler_1.AppError('Bill image is required', 400);
    }
    const { merchantId, amount, billDate, billNumber, notes } = req.body;
    // Validate required fields
    if (!merchantId || !amount || !billDate) {
        throw new errorHandler_1.AppError('Merchant, amount, and bill date are required', 400);
    }
    console.log('📤 [BILL UPLOAD] Processing bill upload...');
    console.log('User:', req.user._id);
    console.log('Merchant:', merchantId);
    console.log('Amount:', amount);
    try {
        // Generate image hash for duplicate detection
        const imageHash = crypto_1.default
            .createHash('sha256')
            .update(req.file.buffer)
            .digest('hex');
        // Check for duplicate image
        const duplicateImage = await Bill_1.Bill.findOne({
            'billImage.imageHash': imageHash,
            verificationStatus: { $in: ['pending', 'processing', 'approved'] },
            isActive: true,
        });
        if (duplicateImage) {
            throw new errorHandler_1.AppError('This bill image has already been uploaded', 400);
        }
        // Upload to Cloudinary
        console.log('☁️ [CLOUDINARY] Uploading bill image...');
        const cloudinaryResult = await (0, cloudinaryUtils_1.uploadToCloudinary)(req.file.buffer, `bills/${req.user._id}`, {
            transformation: [
                { width: 1200, crop: 'limit' },
                { quality: 'auto' },
            ],
            generateThumbnail: true,
        });
        console.log('✅ [CLOUDINARY] Image uploaded successfully');
        // Create bill document
        const bill = await Bill_1.Bill.create({
            user: req.user._id,
            merchant: merchantId,
            billImage: {
                url: cloudinaryResult.url,
                thumbnailUrl: cloudinaryResult.thumbnailUrl,
                cloudinaryId: cloudinaryResult.publicId,
                publicId: cloudinaryResult.publicId,
                imageHash,
            },
            amount: parseFloat(amount),
            billDate: new Date(billDate),
            billNumber,
            notes,
            verificationStatus: 'pending',
            metadata: {
                ipAddress: req.ip,
                deviceInfo: req.headers['user-agent'],
            },
        });
        console.log('✅ [BILL] Bill created:', bill._id);
        // Trigger async verification process
        billVerificationService_1.billVerificationService
            .processBill(bill._id, cloudinaryResult.url, imageHash)
            .then((result) => {
            console.log(`✅ [VERIFICATION] Bill ${bill._id} processed:`, result.status);
        })
            .catch((error) => {
            console.error(`❌ [VERIFICATION] Error processing bill ${bill._id}:`, error);
        });
        // Populate merchant details before sending response
        await bill.populate('merchant', 'name logo cashbackPercentage');
        (0, response_1.sendSuccess)(res, bill, 'Bill uploaded successfully and is being verified', 201);
    }
    catch (error) {
        console.error('❌ [BILL UPLOAD] Error:', error);
        throw error;
    }
});
// Get user's bill history
exports.getUserBills = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { status, merchantId, startDate, endDate, limit = 20, page = 1, } = req.query;
    // Build query
    const query = {
        user: req.user._id,
        isActive: true,
    };
    if (status) {
        query.verificationStatus = status;
    }
    if (merchantId) {
        query.merchant = merchantId;
    }
    if (startDate || endDate) {
        query.billDate = {};
        if (startDate) {
            query.billDate.$gte = new Date(startDate);
        }
        if (endDate) {
            query.billDate.$lte = new Date(endDate);
        }
    }
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    // Get bills
    const bills = await Bill_1.Bill.find(query)
        .populate('merchant', 'name logo cashbackPercentage')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip(skip);
    // Get total count
    const total = await Bill_1.Bill.countDocuments(query);
    (0, response_1.sendSuccess)(res, {
        bills,
        pagination: {
            total,
            page: parseInt(page),
            limit: limitNum,
            pages: Math.ceil(total / limitNum),
        },
    });
});
// Get bill by ID
exports.getBillById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { billId } = req.params;
    const bill = await Bill_1.Bill.findOne({
        _id: billId,
        user: req.user._id,
        isActive: true,
    }).populate('merchant', 'name logo cashbackPercentage');
    if (!bill) {
        return (0, response_1.sendNotFound)(res, 'Bill not found');
    }
    (0, response_1.sendSuccess)(res, bill);
});
// Get bill statistics
exports.getBillStatistics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const stats = await Bill_1.Bill.getUserStatistics(req.user._id);
    (0, response_1.sendSuccess)(res, stats);
});
// Resubmit rejected bill
exports.resubmitBill = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { billId } = req.params;
    // Check if file is uploaded
    if (!req.file) {
        throw new errorHandler_1.AppError('New bill image is required', 400);
    }
    const bill = await Bill_1.Bill.findOne({
        _id: billId,
        user: req.user._id,
        isActive: true,
    });
    if (!bill) {
        return (0, response_1.sendNotFound)(res, 'Bill not found');
    }
    if (bill.verificationStatus !== 'rejected') {
        throw new errorHandler_1.AppError('Only rejected bills can be resubmitted', 400);
    }
    // Check resubmission limit (max 3 times)
    if ((bill.resubmissionCount || 0) >= 3) {
        throw new errorHandler_1.AppError('Maximum resubmission limit reached', 400);
    }
    try {
        // Delete old image from Cloudinary
        if (bill.billImage.cloudinaryId) {
            await (0, cloudinaryUtils_1.deleteFromCloudinary)(bill.billImage.cloudinaryId);
        }
        // Generate new image hash
        const imageHash = crypto_1.default
            .createHash('sha256')
            .update(req.file.buffer)
            .digest('hex');
        // Upload new image
        const cloudinaryResult = await (0, cloudinaryUtils_1.uploadToCloudinary)(req.file.buffer, `bills/${req.user._id}`, {
            transformation: [
                { width: 1200, crop: 'limit' },
                { quality: 'auto' },
            ],
            generateThumbnail: true,
        });
        // Reprocess bill
        const result = await billVerificationService_1.billVerificationService.reprocessBill(bill._id, cloudinaryResult.url, imageHash);
        if (!result.success) {
            throw new errorHandler_1.AppError(result.error || 'Resubmission failed', 400);
        }
        // Get updated bill
        const updatedBill = await Bill_1.Bill.findById(billId).populate('merchant', 'name logo cashbackPercentage');
        (0, response_1.sendSuccess)(res, updatedBill, 'Bill resubmitted successfully');
    }
    catch (error) {
        console.error('❌ [RESUBMIT] Error:', error);
        throw error;
    }
});
// Admin: Get pending bills for manual review
exports.getPendingBills = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        throw new errorHandler_1.AppError('Admin access required', 403);
    }
    const { limit = 20, page = 1 } = req.query;
    const bills = await billVerificationService_1.billVerificationService.getPendingReviewBills(parseInt(limit), parseInt(page));
    const total = await Bill_1.Bill.countDocuments({
        verificationStatus: 'pending',
        verificationMethod: 'manual',
        isActive: true,
    });
    (0, response_1.sendSuccess)(res, {
        bills,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
        },
    });
});
// Admin: Manually approve bill
exports.approveBill = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        throw new errorHandler_1.AppError('Admin access required', 403);
    }
    const { billId } = req.params;
    const { notes } = req.body;
    const result = await billVerificationService_1.billVerificationService.manuallyApproveBill(billId, req.user._id, notes);
    if (!result.success) {
        throw new errorHandler_1.AppError(result.error || 'Approval failed', 400);
    }
    const bill = await Bill_1.Bill.findById(billId).populate('merchant', 'name logo');
    (0, response_1.sendSuccess)(res, bill, 'Bill approved successfully');
});
// Admin: Manually reject bill
exports.rejectBill = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        throw new errorHandler_1.AppError('Admin access required', 403);
    }
    const { billId } = req.params;
    const { reason } = req.body;
    if (!reason) {
        throw new errorHandler_1.AppError('Rejection reason is required', 400);
    }
    const result = await billVerificationService_1.billVerificationService.manuallyRejectBill(billId, req.user._id, reason);
    if (!result.success) {
        throw new errorHandler_1.AppError(result.error || 'Rejection failed', 400);
    }
    const bill = await Bill_1.Bill.findById(billId).populate('merchant', 'name logo');
    (0, response_1.sendSuccess)(res, bill, 'Bill rejected successfully');
});
// Admin: Get verification statistics
exports.getVerificationStatistics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        throw new errorHandler_1.AppError('Admin access required', 403);
    }
    const stats = await billVerificationService_1.billVerificationService.getVerificationStatistics();
    (0, response_1.sendSuccess)(res, stats);
});
// Admin: Get user's fraud history
exports.getUserFraudHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        throw new errorHandler_1.AppError('Admin access required', 403);
    }
    const { userId } = req.params;
    const history = await fraudDetectionService_1.fraudDetectionService.getUserFraudHistory(userId);
    (0, response_1.sendSuccess)(res, history);
});
