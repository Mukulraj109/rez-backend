import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/merchantauth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const merchantId = req.merchantId;
    const merchantDir = path.join(uploadsDir, merchantId!);
    if (!fs.existsSync(merchantDir)) {
      fs.mkdirSync(merchantDir, { recursive: true });
    }
    cb(null, merchantDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// File filter for images
const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
  }
};

// Helper function to parse file size from env
function parseFileSize(sizeStr: string): number {
  if (!sizeStr) return 10485760; // 10MB default
  
  const match = sizeStr.match(/^(\d+)(MB|KB|GB)?$/i);
  if (!match) {
    console.log('⚠️ Invalid MAX_FILE_SIZE format, using default 10MB');
    return 10485760;
  }
  
  const value = parseInt(match[1]);
  const unit = match[2]?.toLowerCase() || '';
  
  switch (unit) {
    case 'gb': return value * 1024 * 1024 * 1024;
    case 'mb': return value * 1024 * 1024;
    case 'kb': return value * 1024;
    default: return value; // Assume bytes if no unit
  }
}

// Configure upload middleware
const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: parseFileSize(process.env.MAX_FILE_SIZE || '10MB'), // 10MB default
    files: 10 // Maximum 10 files per request
  }
});

// @route   POST /api/uploads/image
// @desc    Upload single image
// @access  Private
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.merchantId}/${req.file.filename}`;

    return res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

// @route   POST /api/uploads/images
// @desc    Upload multiple images
// @access  Private
router.post('/images', upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const uploadedFiles = files.map((file, index) => ({
      url: `${baseUrl}/uploads/${req.merchantId}/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      sortOrder: index
    }));

    return res.json({
      success: true,
      message: `${files.length} images uploaded successfully`,
      data: {
        files: uploadedFiles
      }
    });
  } catch (error: any) {
    console.error('Multiple image upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
});

// @route   DELETE /api/uploads/:filename
// @desc    Delete uploaded file
// @access  Private
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, req.merchantId!, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    fs.unlinkSync(filePath);

    return res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error: any) {
    console.error('File deletion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message
    });
  }
});

// Error handling middleware for multer
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files per request.'
      });
    }
  }
  return res.status(400).json({
    success: false,
    message: error.message || 'File upload error'
  });
});

export default router;
