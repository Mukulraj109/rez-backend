"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const MerchantUser_1 = require("../models/MerchantUser");
const merchantauth_1 = require("../middleware/merchantauth");
const merchantvalidation_1 = require("../middleware/merchantvalidation");
const rbac_1 = require("../middleware/rbac");
const TeamInvitationService_1 = __importDefault(require("../services/TeamInvitationService"));
const permissions_1 = require("../config/permissions");
const router = (0, express_1.Router)();
// All team routes require authentication
router.use(merchantauth_1.authMiddleware);
// Validation schemas
const inviteSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    name: joi_1.default.string().min(2).max(100).required(),
    role: joi_1.default.string().valid('admin', 'manager', 'staff').required()
});
const updateRoleSchema = joi_1.default.object({
    role: joi_1.default.string().valid('admin', 'manager', 'staff').required()
});
const updateStatusSchema = joi_1.default.object({
    status: joi_1.default.string().valid('active', 'suspended').required()
});
/**
 * @route   GET /api/merchant/team
 * @desc    List all team members
 * @access  Private (owner, admin)
 */
router.get('/', (0, rbac_1.checkPermission)('team:view'), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const teamMembers = await MerchantUser_1.MerchantUser.find({ merchantId })
            .select('-password -invitationToken -resetPasswordToken')
            .populate('invitedBy', 'name email')
            .sort({ createdAt: -1 });
        return res.json({
            success: true,
            data: {
                teamMembers,
                total: teamMembers.length
            }
        });
    }
    catch (error) {
        console.error('Error fetching team members:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch team members',
            error: error.message
        });
    }
});
/**
 * @route   POST /api/merchant/team/invite
 * @desc    Invite new team member
 * @access  Private (owner, admin)
 */
router.post('/invite', (0, rbac_1.checkPermission)('team:invite'), (0, merchantvalidation_1.validateRequest)(inviteSchema), async (req, res) => {
    try {
        const { email, name, role } = req.body;
        const merchantId = req.merchantId;
        const invitedBy = req.merchantUser?._id ? String(req.merchantUser._id) : String(req.merchantId); // Use merchantUser if exists, else merchant
        // Create invitation
        const result = await TeamInvitationService_1.default.createInvitation({
            email,
            name,
            role,
            merchantId: merchantId,
            invitedBy: invitedBy
        });
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }
        return res.status(201).json({
            success: true,
            message: result.message,
            data: {
                invitationId: result.invitationId,
                expiresAt: result.expiresAt,
                ...(process.env.NODE_ENV === 'development' && {
                    invitationToken: result.invitationToken,
                    invitationUrl: `${process.env.FRONTEND_URL}/team/accept-invitation/${result.invitationToken}`
                })
            }
        });
    }
    catch (error) {
        console.error('Error inviting team member:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to invite team member',
            error: error.message
        });
    }
});
/**
 * @route   POST /api/merchant/team/:userId/resend-invite
 * @desc    Resend invitation email
 * @access  Private (owner, admin)
 */
router.post('/:userId/resend-invite', (0, rbac_1.checkPermission)('team:invite'), async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await TeamInvitationService_1.default.resendInvitation(userId);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }
        return res.json({
            success: true,
            message: result.message,
            data: {
                invitationId: result.invitationId,
                expiresAt: result.expiresAt,
                ...(process.env.NODE_ENV === 'development' && {
                    invitationToken: result.invitationToken
                })
            }
        });
    }
    catch (error) {
        console.error('Error resending invitation:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to resend invitation',
            error: error.message
        });
    }
});
/**
 * @route   PUT /api/merchant/team/:userId/role
 * @desc    Update team member role
 * @access  Private (owner only)
 */
router.put('/:userId/role', (0, rbac_1.checkPermission)('team:change_role'), (0, merchantvalidation_1.validateRequest)(updateRoleSchema), async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        const merchantId = req.merchantId;
        // Find team member
        const teamMember = await MerchantUser_1.MerchantUser.findOne({
            _id: userId,
            merchantId
        });
        if (!teamMember) {
            return res.status(404).json({
                success: false,
                message: 'Team member not found'
            });
        }
        // Prevent changing owner role
        if (teamMember.role === 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Cannot change role of owner'
            });
        }
        // Update role and permissions
        const oldRole = teamMember.role;
        teamMember.role = role;
        teamMember.permissions = (0, permissions_1.getPermissionsForRole)(role);
        await teamMember.save();
        console.log(`✅ Role updated for ${teamMember.email}: ${oldRole} -> ${role}`);
        return res.json({
            success: true,
            message: 'Role updated successfully',
            data: {
                teamMember: {
                    id: teamMember._id,
                    name: teamMember.name,
                    email: teamMember.email,
                    role: teamMember.role,
                    permissions: teamMember.permissions,
                    oldRole
                }
            }
        });
    }
    catch (error) {
        console.error('Error updating team member role:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update role',
            error: error.message
        });
    }
});
/**
 * @route   PUT /api/merchant/team/:userId/status
 * @desc    Update team member status (active/suspended)
 * @access  Private (owner, admin)
 */
router.put('/:userId/status', (0, rbac_1.checkPermission)('team:change_status'), (0, merchantvalidation_1.validateRequest)(updateStatusSchema), async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;
        const merchantId = req.merchantId;
        // Find team member
        const teamMember = await MerchantUser_1.MerchantUser.findOne({
            _id: userId,
            merchantId
        });
        if (!teamMember) {
            return res.status(404).json({
                success: false,
                message: 'Team member not found'
            });
        }
        // Prevent suspending owner
        if (teamMember.role === 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Cannot suspend owner account'
            });
        }
        // Prevent suspending yourself
        if (req.merchantUser && teamMember._id.toString() === req.merchantUser._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Cannot change your own status'
            });
        }
        const oldStatus = teamMember.status;
        teamMember.status = status;
        await teamMember.save();
        console.log(`✅ Status updated for ${teamMember.email}: ${oldStatus} -> ${status}`);
        return res.json({
            success: true,
            message: `Team member ${status === 'active' ? 'activated' : 'suspended'} successfully`,
            data: {
                teamMember: {
                    id: teamMember._id,
                    name: teamMember.name,
                    email: teamMember.email,
                    status: teamMember.status,
                    oldStatus
                }
            }
        });
    }
    catch (error) {
        console.error('Error updating team member status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update status',
            error: error.message
        });
    }
});
/**
 * @route   DELETE /api/merchant/team/:userId
 * @desc    Remove team member
 * @access  Private (owner, admin)
 */
router.delete('/:userId', (0, rbac_1.checkPermission)('team:remove'), async (req, res) => {
    try {
        const { userId } = req.params;
        const merchantId = req.merchantId;
        // Find team member
        const teamMember = await MerchantUser_1.MerchantUser.findOne({
            _id: userId,
            merchantId
        });
        if (!teamMember) {
            return res.status(404).json({
                success: false,
                message: 'Team member not found'
            });
        }
        // Prevent removing owner
        if (teamMember.role === 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Cannot remove owner'
            });
        }
        // Prevent removing yourself
        if (req.merchantUser && teamMember._id.toString() === req.merchantUser._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Cannot remove yourself'
            });
        }
        const removedMember = {
            id: teamMember._id,
            name: teamMember.name,
            email: teamMember.email,
            role: teamMember.role
        };
        await MerchantUser_1.MerchantUser.deleteOne({ _id: userId });
        console.log(`✅ Team member removed: ${teamMember.email}`);
        return res.json({
            success: true,
            message: 'Team member removed successfully',
            data: {
                removedMember
            }
        });
    }
    catch (error) {
        console.error('Error removing team member:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to remove team member',
            error: error.message
        });
    }
});
/**
 * @route   GET /api/merchant/team/me/permissions
 * @desc    Get current user's permissions
 * @access  Private
 */
router.get('/me/permissions', async (req, res) => {
    try {
        const role = req.merchantUser?.role || 'owner';
        const permissions = (0, permissions_1.getPermissionsForRole)(role);
        return res.json({
            success: true,
            data: {
                role,
                roleDescription: (0, permissions_1.getRoleDescription)(role),
                permissions,
                permissionCount: permissions.length
            }
        });
    }
    catch (error) {
        console.error('Error fetching permissions:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch permissions',
            error: error.message
        });
    }
});
/**
 * @route   GET /api/merchant/team/:userId
 * @desc    Get team member details
 * @access  Private (owner, admin)
 */
router.get('/:userId', (0, rbac_1.checkPermission)('team:view'), async (req, res) => {
    try {
        const { userId } = req.params;
        const merchantId = req.merchantId;
        const teamMember = await MerchantUser_1.MerchantUser.findOne({
            _id: userId,
            merchantId
        })
            .select('-password -invitationToken -resetPasswordToken')
            .populate('invitedBy', 'name email');
        if (!teamMember) {
            return res.status(404).json({
                success: false,
                message: 'Team member not found'
            });
        }
        return res.json({
            success: true,
            data: {
                teamMember: {
                    ...teamMember.toJSON(),
                    roleDescription: (0, permissions_1.getRoleDescription)(teamMember.role)
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching team member:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch team member',
            error: error.message
        });
    }
});
exports.default = router;
