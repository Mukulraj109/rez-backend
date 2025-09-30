import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Merchant } from '../models/Merchant';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { authMiddleware } from '../middleware/merchantauth';
import { validateRequest } from '../middleware/merchantvalidation';
import Joi from 'joi';

const router = Router();

// Simple test endpoint for mobile connectivity
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Merchant auth route is working!',
    timestamp: new Date().toISOString()
  });
});

// Validation schemas
const registerSchema = Joi.object({
  businessName: Joi.string().required().min(2).max(100),
  ownerName: Joi.string().required().min(2).max(50),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
  businessAddress: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().required()
  }).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// POST /api/auth/register
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { businessName, ownerName, email, password, phone, businessAddress } = req.body;

    const existingMerchant = await Merchant.findOne({ email });
    if (existingMerchant) {
      return res.status(400).json({
        success: false,
        message: 'Merchant with this email already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const merchant = new Merchant({
      businessName,
      ownerName,
      email,
      password: hashedPassword,
      phone,
      businessAddress,
      verificationStatus: 'pending'
    });

    await merchant.save();

    // Automatically create a store for the merchant on user side
    await createStoreForMerchant(merchant);

    const token = jwt.sign(
      { merchantId: merchant._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Merchant registered successfully',
      data: {
        token,
        merchant: {
          id: merchant._id,
          businessName: merchant.businessName,
          ownerName: merchant.ownerName,
          email: merchant.email,
          verificationStatus: merchant.verificationStatus
        }
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// POST /api/auth/login
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const merchant = await Merchant.findOne({ email }).select('+password');
    if (!merchant) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, merchant.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    merchant.lastLogin = new Date();
    await merchant.save();

    const token = jwt.sign(
      { merchantId: merchant._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    console.log('🔐 LOGIN DEBUG: Generated token for merchant:', merchant._id);
    console.log('🔐 LOGIN DEBUG: Token preview:', token.substring(0, 20) + '...');
    console.log('🔐 LOGIN DEBUG: JWT Secret used:', (process.env.JWT_SECRET || 'fallback-secret').substring(0, 10) + '...');
    console.log('🔐 LOGIN DEBUG: Merchant isActive:', merchant.isActive);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        merchant: {
          id: merchant._id,
          businessName: merchant.businessName,
          ownerName: merchant.ownerName,
          email: merchant.email,
          verificationStatus: merchant.verificationStatus,
          isActive: merchant.isActive
        }
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    return res.json({
      success: true,
      data: {
        merchant: {
          id: merchant._id,
          businessName: merchant.businessName,
          ownerName: merchant.ownerName,
          email: merchant.email,
          phone: merchant.phone,
          businessAddress: merchant.businessAddress,
          verificationStatus: merchant.verificationStatus,
          isActive: merchant.isActive,
          createdAt: merchant.createdAt
        }
      }
    });
  } catch (error: any) {
    console.error('Get merchant error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get merchant data',
      error: error.message
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout merchant (client-side token removal)
// @access  Private
router.post('/logout', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Helper function to create a store for new merchant
async function createStoreForMerchant(merchant: any): Promise<void> {
  try {
    // Find a default category or create one if it doesn't exist
    let defaultCategory = await Category.findOne({ name: 'General' });
    if (!defaultCategory) {
      defaultCategory = await Category.create({
        name: 'General',
        slug: 'general',
        type: 'store',
        isActive: true
      });
    }

    // Create store slug from business name
    const storeSlug = merchant.businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    // Check if store with this slug already exists and make it unique
    let finalSlug = storeSlug;
    let counter = 1;
    while (await Store.findOne({ slug: finalSlug })) {
      finalSlug = `${storeSlug}-${counter}`;
      counter++;
    }

    // Create the store
    const store = new Store({
      name: merchant.businessName,
      slug: finalSlug,
      description: `${merchant.businessName} - Your trusted local business`,
      category: defaultCategory._id,
      merchantId: merchant._id, // Link to merchant
      location: {
        address: `${merchant.businessAddress.street}, ${merchant.businessAddress.city}`,
        city: merchant.businessAddress.city,
        state: merchant.businessAddress.state,
        pincode: merchant.businessAddress.zipCode
      },
      contact: {
        phone: merchant.phone,
        email: merchant.email
      },
      ratings: {
        average: 0,
        count: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      },
      offers: {
        cashback: 5, // Default 5% cashback
        isPartner: true,
        partnerLevel: 'bronze'
      },
      operationalInfo: {
        hours: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '18:00', closed: false },
          sunday: { open: '10:00', close: '16:00', closed: false }
        },
        deliveryTime: '30-45 mins',
        minimumOrder: 0,
        deliveryFee: 0,
        freeDeliveryAbove: 500,
        acceptsWalletPayment: true,
        paymentMethods: ['cash', 'card', 'upi', 'wallet']
      },
      analytics: {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        repeatCustomers: 0
      },
      tags: ['new-store', 'local-business'],
      isActive: true,
      isFeatured: false,
      isVerified: merchant.verificationStatus === 'verified'
    });

    await store.save();
    
    console.log(`🏪 Automatically created store "${merchant.businessName}" for merchant ${merchant._id}`);

  } catch (error) {
    console.error('Error creating store for merchant:', error);
    // Don't throw error to avoid breaking merchant registration
  }
}

export default router;