"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateVideoUpload = exports.validateDocumentUpload = exports.validateImageUpload = exports.validateMultipleFiles = exports.validateUploadedFile = void 0;
exports.validateFileType = validateFileType;
exports.validateFileSize = validateFileSize;
exports.generateSecureFilename = generateSecureFilename;
exports.basicMalwareScan = basicMalwareScan;
const file_type_1 = require("file-type");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Enhanced File Upload Security Middleware
 * Validates file types, scans for malware, enforces size limits
 */
// Allowed MIME types for different upload categories
const ALLOWED_TYPES = {
    images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    videos: ['video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime'],
    all: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4']
};
// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
    image: 10 * 1024 * 1024, // 10MB
    document: 5 * 1024 * 1024, // 5MB
    video: 100 * 1024 * 1024, // 100MB
    default: 10 * 1024 * 1024 // 10MB
};
/**
 * Validate file type using magic numbers (not just extension)
 * Prevents bypass attacks using fake extensions
 */
async function validateFileType(file, allowedTypes = ALLOWED_TYPES.all) {
    if (!file || !file.buffer) {
        throw new Error('No file buffer available');
    }
    try {
        // Get actual file type from file content (magic numbers)
        const fileTypeResult = await (0, file_type_1.fromBuffer)(file.buffer);
        if (!fileTypeResult) {
            throw new Error('Could not determine file type');
        }
        // Check if detected MIME type is in allowed list
        if (!allowedTypes.includes(fileTypeResult.mime)) {
            throw new Error(`File type ${fileTypeResult.mime} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }
        // Verify extension matches detected type
        const expectedExtension = fileTypeResult.ext;
        const actualExtension = file.originalname.split('.').pop()?.toLowerCase();
        if (actualExtension !== expectedExtension) {
            console.warn(`File extension mismatch: ${actualExtension} vs detected ${expectedExtension}`);
            // Allow but log suspicious activity
        }
        return true;
    }
    catch (error) {
        throw error;
    }
}
/**
 * Validate file size
 */
function validateFileSize(file, maxSize) {
    const sizeLimit = maxSize || MAX_FILE_SIZES.default;
    if (file.size > sizeLimit) {
        throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size ${(sizeLimit / 1024 / 1024).toFixed(2)}MB`);
    }
    return true;
}
/**
 * Generate secure filename
 * Prevents directory traversal and other filename-based attacks
 */
function generateSecureFilename(originalFilename) {
    // Get file extension
    const extension = originalFilename.split('.').pop()?.toLowerCase() || '';
    // Generate random filename using crypto
    const randomName = crypto_1.default.randomBytes(16).toString('hex');
    // Return secure filename
    return `${randomName}.${extension}`;
}
/**
 * Scan file for malware patterns
 * Basic pattern matching (integrate with ClamAV for production)
 */
async function basicMalwareScan(file) {
    if (!file || !file.buffer) {
        throw new Error('No file buffer available');
    }
    // Convert buffer to string for pattern matching
    const fileContent = file.buffer.toString('utf8', 0, Math.min(file.buffer.length, 10000));
    // Dangerous patterns to look for
    const dangerousPatterns = [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi, // Script tags
        /javascript:/gi, // JavaScript protocol
        /on\w+\s*=/gi, // Event handlers
        /eval\s*\(/gi, // Eval function
        /base64,/gi, // Base64 encoded data (potential payload)
    ];
    for (const pattern of dangerousPatterns) {
        if (pattern.test(fileContent)) {
            console.warn('⚠️ Potentially malicious content detected in file');
            throw new Error('File contains potentially malicious content');
        }
    }
    return true;
}
/**
 * Comprehensive file validation middleware
 */
const validateUploadedFile = (options) => {
    return async (req, res, next) => {
        try {
            // Get file from request
            const file = req.file;
            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }
            // Determine allowed types
            const allowedTypes = options.allowedTypes || ALLOWED_TYPES[options.category || 'all'];
            // Determine max size
            let maxSize = options.maxSize;
            if (!maxSize && options.category) {
                switch (options.category) {
                    case 'images':
                        maxSize = MAX_FILE_SIZES.image;
                        break;
                    case 'documents':
                        maxSize = MAX_FILE_SIZES.document;
                        break;
                    case 'videos':
                        maxSize = MAX_FILE_SIZES.video;
                        break;
                    default:
                        maxSize = MAX_FILE_SIZES.default;
                }
            }
            // Validate file type
            await validateFileType(file, allowedTypes);
            // Validate file size
            validateFileSize(file, maxSize);
            // Scan for malware if enabled
            if (options.scanMalware !== false) {
                await basicMalwareScan(file);
            }
            // Generate secure filename
            const secureFilename = generateSecureFilename(file.originalname);
            if (req.file) {
                req.file.filename = secureFilename;
            }
            console.log(`✅ File validation passed: ${file.originalname} -> ${secureFilename}`);
            next();
        }
        catch (error) {
            console.error('❌ File validation failed:', error.message);
            return res.status(400).json({
                success: false,
                message: 'File validation failed',
                error: error.message
            });
        }
    };
};
exports.validateUploadedFile = validateUploadedFile;
/**
 * Validate multiple files
 */
const validateMultipleFiles = (options) => {
    return async (req, res, next) => {
        try {
            // Get files from request
            const files = req.files;
            if (!files || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No files uploaded'
                });
            }
            // Check max files limit
            if (options.maxFiles && files.length > options.maxFiles) {
                return res.status(400).json({
                    success: false,
                    message: `Too many files. Maximum ${options.maxFiles} files allowed`
                });
            }
            // Determine allowed types
            const allowedTypes = options.allowedTypes || ALLOWED_TYPES[options.category || 'all'];
            // Determine max size
            let maxSize = options.maxSize || MAX_FILE_SIZES.default;
            // Validate each file
            for (const file of files) {
                await validateFileType(file, allowedTypes);
                validateFileSize(file, maxSize);
                if (options.scanMalware !== false) {
                    await basicMalwareScan(file);
                }
                // Generate secure filename
                file.filename = generateSecureFilename(file.originalname);
            }
            console.log(`✅ ${files.length} files validated successfully`);
            next();
        }
        catch (error) {
            console.error('❌ File validation failed:', error.message);
            return res.status(400).json({
                success: false,
                message: 'File validation failed',
                error: error.message
            });
        }
    };
};
exports.validateMultipleFiles = validateMultipleFiles;
/**
 * Image-specific validation
 */
exports.validateImageUpload = (0, exports.validateUploadedFile)({
    category: 'images',
    scanMalware: true
});
/**
 * Document-specific validation
 */
exports.validateDocumentUpload = (0, exports.validateUploadedFile)({
    category: 'documents',
    scanMalware: true
});
/**
 * Video-specific validation
 */
exports.validateVideoUpload = (0, exports.validateUploadedFile)({
    category: 'videos',
    scanMalware: false // Skip malware scan for large video files
});
exports.default = {
    validateFileType,
    validateFileSize,
    generateSecureFilename,
    basicMalwareScan,
    validateUploadedFile: exports.validateUploadedFile,
    validateMultipleFiles: exports.validateMultipleFiles,
    validateImageUpload: exports.validateImageUpload,
    validateDocumentUpload: exports.validateDocumentUpload,
    validateVideoUpload: exports.validateVideoUpload
};
