import express, { Request, Response } from 'express';
import Joi from 'joi';
import { Types } from 'mongoose';
import UserZoneVerification from '../../models/UserZoneVerification';
import { User } from '../../models/User';
import ProgramMembership from '../../models/ProgramMembership';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { NotificationService } from '../../services/notificationService';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const reviewSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  rejectionReason: Joi.string().max(500).when('status', {
    is: 'rejected',
    then: Joi.optional(), // Optional for revocations (admin may or may not give a reason)
    otherwise: Joi.optional(),
  }),
  expiresAt: Joi.date().optional(), // For verifications that expire (e.g., student)
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @route   GET /api/admin/zone-verifications
 * @desc    Get all verification requests (with filters)
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status = 'pending',
      verificationType,
      page = 1,
      limit = 20,
    } = req.query;

    const query: any = {};

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by verification type
    if (verificationType) {
      query.verificationType = verificationType;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [verifications, total] = await Promise.all([
      UserZoneVerification.find(query)
        .populate('userId', 'fullName profile.firstName profile.lastName email phoneNumber')
        .populate('reviewedBy', 'fullName profile.firstName profile.lastName')
        .sort({ createdAt: status === 'pending' ? 1 : -1 }) // Oldest first for pending
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      UserZoneVerification.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        verifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasNext: skip + verifications.length < total,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('[ADMIN] Get zone verifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch verifications',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/zone-verifications/stats
 * @desc    Get verification statistics
 * @access  Admin
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [pending, approved, rejected, byType] = await Promise.all([
      UserZoneVerification.countDocuments({ status: 'pending' }),
      UserZoneVerification.countDocuments({ status: 'approved' }),
      UserZoneVerification.countDocuments({ status: 'rejected' }),
      UserZoneVerification.aggregate([
        {
          $group: {
            _id: '$verificationType',
            total: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        total: pending + approved + rejected,
        pending,
        approved,
        rejected,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = {
            total: item.total,
            pending: item.pending,
            approved: item.approved,
            rejected: item.rejected,
          };
          return acc;
        }, {} as Record<string, any>),
      },
    });
  } catch (error: any) {
    console.error('[ADMIN] Get zone verification stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/zone-verifications/:id
 * @desc    Get single verification request details
 * @access  Admin
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification ID',
      });
    }

    const verification = await UserZoneVerification.findById(id)
      .populate('userId', 'fullName profile email phoneNumber createdAt verifications')
      .populate('reviewedBy', 'fullName profile.firstName profile.lastName')
      .lean();

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found',
      });
    }

    return res.json({
      success: true,
      data: verification,
    });
  } catch (error: any) {
    console.error('[ADMIN] Get zone verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch verification',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/admin/zone-verifications/:id/review
 * @desc    Review (approve/reject) a verification request
 * @access  Admin
 */
router.patch('/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user._id;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification ID',
      });
    }

    // Validate request body
    const { error, value } = reviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { status, rejectionReason, expiresAt } = value;

    // Find the verification
    const verification = await UserZoneVerification.findById(id);
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found',
      });
    }

    // Check valid transitions: pending -> approved/rejected, approved -> rejected (revoke)
    if (verification.status === 'rejected' && status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Verification is already rejected',
      });
    }
    if (verification.status === 'approved' && status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Verification is already approved',
      });
    }

    const isRevoke = verification.status === 'approved' && status === 'rejected';

    // Update verification
    verification.status = status;
    verification.reviewedBy = adminId;
    verification.reviewedAt = new Date();
    if (rejectionReason) {
      verification.rejectionReason = rejectionReason;
    }
    if (expiresAt) {
      verification.expiresAt = new Date(expiresAt);
    }

    await verification.save();

    // If approved, update user's verifications
    if (status === 'approved') {
      const updatePath = `verifications.${verification.verificationType}`;
      await User.findByIdAndUpdate(verification.userId, {
        $set: {
          [`${updatePath}.verified`]: true,
          [`${updatePath}.verifiedAt`]: new Date(),
          ...(verification.submittedData.instituteName && {
            [`${updatePath}.instituteName`]: verification.submittedData.instituteName,
          }),
          ...(verification.submittedData.companyName && {
            [`${updatePath}.companyName`]: verification.submittedData.companyName,
          }),
          ...(expiresAt && { [`${updatePath}.expiresAt`]: new Date(expiresAt) }),
        },
      });

      // Send approval notification to user
      await NotificationService.createNotification({
        userId: verification.userId,
        title: 'Verification Approved! 🎉',
        message: `Your ${verification.verificationType} verification has been approved. You now have access to exclusive ${verification.verificationType} deals!`,
        type: 'success',
        category: 'general',
        priority: 'high',
        data: {
          type: 'verification_approved',
          verificationType: verification.verificationType,
          zoneSlug: verification.zoneSlug,
        },
        deliveryChannels: ['in_app', 'push'],
      });
    } else {
      // If revoking an approved verification, remove the verified flag and suspend membership
      if (isRevoke) {
        const updatePath = `verifications.${verification.verificationType}`;
        await User.findByIdAndUpdate(verification.userId, {
          $set: {
            [`${updatePath}.verified`]: false,
          },
          $unset: {
            [`${updatePath}.verifiedAt`]: 1,
          },
        });

        // Suspend any active program membership linked to this verification zone
        const ZONE_TO_PROGRAM: Record<string, string> = {
          student: 'student_zone',
          corporate: 'corporate_perks',
        };
        const programSlug = ZONE_TO_PROGRAM[verification.verificationType];
        if (programSlug) {
          const activeMembership = await ProgramMembership.findOne({
            user: verification.userId,
            programSlug,
            status: 'active',
          });
          if (activeMembership) {
            activeMembership.status = 'suspended' as any;
            (activeMembership as any).statusHistory.push({
              status: 'suspended',
              changedAt: new Date(),
              reason: `Verification revoked by admin${rejectionReason ? ': ' + rejectionReason : ''}`,
              changedBy: adminId,
            });
            await activeMembership.save();
          }
        }
      }

      // Send rejection/revocation notification to user
      await NotificationService.createNotification({
        userId: verification.userId,
        title: isRevoke ? 'Verification Revoked' : 'Verification Update',
        message: isRevoke
          ? `Your ${verification.verificationType} verification has been revoked. ${rejectionReason || 'Please contact support for details.'}`
          : `Your ${verification.verificationType} verification was not approved. ${rejectionReason || 'Please try again with valid documents.'}`,
        type: 'warning',
        category: 'general',
        priority: 'medium',
        data: {
          type: isRevoke ? 'verification_revoked' : 'verification_rejected',
          verificationType: verification.verificationType,
          zoneSlug: verification.zoneSlug,
          reason: rejectionReason,
        },
        deliveryChannels: ['in_app', 'push'],
      });
    }

    return res.json({
      success: true,
      message: `Verification ${status}`,
      data: {
        id: verification._id,
        status: verification.status,
        reviewedAt: verification.reviewedAt,
      },
    });
  } catch (error: any) {
    console.error('[ADMIN] Review zone verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to review verification',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/admin/zone-verifications/:id
 * @desc    Delete a verification request
 * @access  Admin
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification ID',
      });
    }

    const verification = await UserZoneVerification.findByIdAndDelete(id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found',
      });
    }

    return res.json({
      success: true,
      message: 'Verification deleted',
    });
  } catch (error: any) {
    console.error('[ADMIN] Delete zone verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete verification',
      error: error.message,
    });
  }
});

export default router;
