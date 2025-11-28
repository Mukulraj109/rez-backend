import { IMerchantUser, MerchantUserRole } from '../models/MerchantUser';
export interface InvitationData {
    email: string;
    name: string;
    role: MerchantUserRole;
    merchantId: string;
    invitedBy: string;
}
export interface InvitationResult {
    success: boolean;
    message: string;
    invitationId?: string;
    invitationToken?: string;
    expiresAt?: Date;
}
export declare class TeamInvitationService {
    private static readonly TOKEN_EXPIRY_HOURS;
    /**
     * Generate a unique invitation token
     */
    private static generateInvitationToken;
    /**
     * Create a new team invitation
     */
    static createInvitation(data: InvitationData): Promise<InvitationResult>;
    /**
     * Resend an existing invitation
     */
    static resendInvitation(merchantUserId: string): Promise<InvitationResult>;
    /**
     * Accept an invitation and set password
     */
    static acceptInvitation(token: string, password: string): Promise<{
        success: boolean;
        message: string;
        merchantUser?: IMerchantUser;
    }>;
    /**
     * Validate invitation token
     */
    static validateInvitationToken(token: string): Promise<{
        valid: boolean;
        merchantUser?: IMerchantUser;
        message?: string;
    }>;
    /**
     * Cancel an invitation
     */
    static cancelInvitation(merchantUserId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Send invitation email
     */
    private static sendInvitationEmail;
    /**
     * Get HTML list of role permissions
     */
    private static getRolePermissionsHtml;
    /**
     * Clean up expired invitations (should be run periodically)
     */
    static cleanupExpiredInvitations(): Promise<number>;
}
export default TeamInvitationService;
