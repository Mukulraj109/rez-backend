"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const bulkImportService_1 = require("../merchantservices/bulkImportService");
const ImportJob_1 = require("../models/ImportJob");
const Store_1 = require("../models/Store");
const merchantauth_1 = require("../middleware/merchantauth");
const router = express_1.default.Router();
// Configure multer for file upload
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/imports');
        // Create directory if it doesn't exist
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `import-${uniqueSuffix}${ext}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        const allowedExtensions = ['.csv', '.xls', '.xlsx'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
        }
    }
});
/**
 * @route   POST /api/merchant/products/bulk-import
 * @desc    Upload and process bulk product import
 * @access  Private (Merchant)
 */
router.post('/bulk-import', merchantauth_1.authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { storeId } = req.body;
        // Validate merchant and store
        if (!merchantId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Merchant ID not found'
            });
        }
        if (!storeId) {
            return res.status(400).json({
                success: false,
                message: 'Store ID is required'
            });
        }
        // Verify store belongs to merchant
        const store = await Store_1.Store.findOne({ _id: storeId, merchantId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found or does not belong to this merchant'
            });
        }
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        const file = req.file;
        const fileType = file.originalname.endsWith('.csv') ? 'csv' : 'excel';
        // Create import job
        const importJob = new ImportJob_1.ImportJob({
            merchantId,
            storeId,
            fileName: file.originalname,
            fileType,
            filePath: file.path,
            status: 'pending'
        });
        await importJob.save();
        // Process import asynchronously
        processImportJob(importJob._id.toString(), file.path, fileType, storeId, merchantId).catch(error => {
            console.error('Import job failed:', error);
        });
        return res.status(202).json({
            success: true,
            message: 'Import job created successfully. Processing in background.',
            data: {
                jobId: importJob._id,
                status: importJob.status,
                fileName: importJob.fileName
            }
        });
    }
    catch (error) {
        console.error('Bulk import error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process bulk import',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Process import job asynchronously
 */
async function processImportJob(jobId, filePath, fileType, storeId, merchantId) {
    try {
        // Update job status to processing
        await ImportJob_1.ImportJob.findByIdAndUpdate(jobId, {
            status: 'processing',
            startedAt: new Date()
        });
        // Process the import
        const result = await bulkImportService_1.bulkImportService.processBulkImport(filePath, fileType, storeId, merchantId);
        // Update job with results
        await ImportJob_1.ImportJob.findByIdAndUpdate(jobId, {
            status: 'completed',
            result,
            progress: {
                total: result.total,
                processed: result.total,
                successful: result.successful,
                failed: result.failed,
                warnings: result.warnings
            },
            completedAt: new Date()
        });
        // Clean up uploaded file
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    catch (error) {
        console.error('Import processing error:', error);
        // Update job with error
        await ImportJob_1.ImportJob.findByIdAndUpdate(jobId, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date()
        });
        // Clean up uploaded file
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
}
/**
 * @route   GET /api/merchant/products/import-status/:jobId
 * @desc    Get import job status
 * @access  Private (Merchant)
 */
router.get('/import-status/:jobId', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { jobId } = req.params;
        const importJob = await ImportJob_1.ImportJob.findOne({ _id: jobId, merchantId });
        if (!importJob) {
            return res.status(404).json({
                success: false,
                message: 'Import job not found'
            });
        }
        // Calculate progress percentage
        const progressPercent = importJob.progress.total > 0
            ? Math.round((importJob.progress.processed / importJob.progress.total) * 100)
            : 0;
        return res.status(200).json({
            success: true,
            data: {
                jobId: importJob._id,
                fileName: importJob.fileName,
                status: importJob.status,
                progress: {
                    ...importJob.progress,
                    percentage: progressPercent
                },
                result: importJob.result,
                error: importJob.error,
                createdAt: importJob.createdAt,
                startedAt: importJob.startedAt,
                completedAt: importJob.completedAt
            }
        });
    }
    catch (error) {
        console.error('Get import status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get import status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @route   GET /api/merchant/products/import-jobs
 * @desc    Get all import jobs for merchant
 * @access  Private (Merchant)
 */
router.get('/import-jobs', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { status, storeId, page = 1, limit = 20 } = req.query;
        const query = { merchantId };
        if (status) {
            query.status = status;
        }
        if (storeId) {
            query.storeId = storeId;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [jobs, total] = await Promise.all([
            ImportJob_1.ImportJob.find(query)
                .populate('storeId', 'name')
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip(skip),
            ImportJob_1.ImportJob.countDocuments(query)
        ]);
        return res.status(200).json({
            success: true,
            data: {
                jobs: jobs.map(job => ({
                    jobId: job._id,
                    fileName: job.fileName,
                    store: job.storeId,
                    status: job.status,
                    progress: job.progress,
                    createdAt: job.createdAt,
                    completedAt: job.completedAt
                })),
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get import jobs error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get import jobs',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @route   GET /api/merchant/products/import-template
 * @desc    Download CSV import template
 * @access  Private (Merchant)
 */
router.get('/import-template', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const csv = bulkImportService_1.bulkImportService.generateCSVTemplate();
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.csv');
        return res.status(200).send(csv);
    }
    catch (error) {
        console.error('Get template error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate template',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @route   GET /api/merchant/products/import-instructions
 * @desc    Get import instructions
 * @access  Private (Merchant)
 */
router.get('/import-instructions', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const instructions = bulkImportService_1.bulkImportService.getImportInstructions();
        return res.status(200).json({
            success: true,
            data: instructions
        });
    }
    catch (error) {
        console.error('Get instructions error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get instructions',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @route   DELETE /api/merchant/products/import-job/:jobId
 * @desc    Delete import job
 * @access  Private (Merchant)
 */
router.delete('/import-job/:jobId', merchantauth_1.authMiddleware, async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { jobId } = req.params;
        const importJob = await ImportJob_1.ImportJob.findOne({ _id: jobId, merchantId });
        if (!importJob) {
            return res.status(404).json({
                success: false,
                message: 'Import job not found'
            });
        }
        // Can only delete completed or failed jobs
        if (importJob.status === 'pending' || importJob.status === 'processing') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete job in progress'
            });
        }
        await importJob.deleteOne();
        return res.status(200).json({
            success: true,
            message: 'Import job deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete import job error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete import job',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
