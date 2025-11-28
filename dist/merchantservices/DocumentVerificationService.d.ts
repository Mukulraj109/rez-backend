export interface DocumentUploadResult {
    url: string;
    publicId: string;
    format: string;
    size: number;
}
export interface DocumentVerificationResult {
    documentId: string;
    status: 'verified' | 'rejected';
    rejectionReason?: string;
    verifiedBy: string;
    verifiedAt: Date;
}
/**
 * DocumentVerificationService
 * Handles document upload, storage, and verification workflow
 */
export declare class DocumentVerificationService {
    /**
     * Upload document to Cloudinary
     */
    static uploadDocument(file: any, merchantId: string, documentType: string): Promise<DocumentUploadResult>;
    /**
     * Add document to merchant onboarding
     */
    static addDocumentToOnboarding(merchantId: string, documentType: string, documentUrl: string): Promise<any>;
    /**
     * Get all documents for a merchant
     */
    static getMerchantDocuments(merchantId: string): Promise<any>;
    /**
     * Verify a document (Admin only)
     */
    static verifyDocument(merchantId: string, documentIndex: number, adminId: string, approved: boolean, rejectionReason?: string): Promise<DocumentVerificationResult>;
    /**
     * Verify all documents at once (Admin only)
     */
    static verifyAllDocuments(merchantId: string, adminId: string, approved: boolean, rejectionReason?: string): Promise<any>;
    /**
     * Request additional documents (Admin only)
     */
    static requestAdditionalDocuments(merchantId: string, documentTypes: string[], message: string): Promise<any>;
    /**
     * Delete a document
     */
    static deleteDocument(merchantId: string, documentIndex: number): Promise<any>;
    /**
     * Get pending verifications (Admin)
     */
    static getPendingVerifications(limit?: number): Promise<any>;
    /**
     * OCR document extraction (Placeholder for future implementation)
     */
    static extractDocumentData(documentUrl: string, documentType: string): Promise<any>;
    /**
     * Validate document authenticity (Placeholder for future implementation)
     */
    static validateDocumentAuthenticity(documentType: string, documentNumber: string): Promise<any>;
    /**
     * Helper: Extract Cloudinary public ID from URL
     */
    private static extractPublicIdFromUrl;
    /**
     * Helper: Send document verification email
     */
    private static sendDocumentVerificationEmail;
    /**
     * Get document statistics (Admin)
     */
    static getDocumentStatistics(): Promise<any>;
}
export default DocumentVerificationService;
