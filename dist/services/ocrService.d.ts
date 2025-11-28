/**
 * OCR Service - Bill Text Extraction
 *
 * Supports two OCR providers:
 * 1. Google Cloud Vision API (Recommended - 90%+ accuracy)
 * 2. AWS Textract (Alternative)
 *
 * Setup Instructions:
 *
 * GOOGLE CLOUD VISION:
 * 1. Create a Google Cloud project: https://console.cloud.google.com
 * 2. Enable Cloud Vision API
 * 3. Create service account and download JSON key
 * 4. Set environment variable: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 * 5. Or set GOOGLE_CLOUD_API_KEY in .env
 *
 * AWS TEXTRACT:
 * 1. Create AWS account and IAM user with Textract permissions
 * 2. Set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 *
 * Default provider: Google Cloud Vision
 * Fallback: Manual text parsing
 */
import { IExtractedData } from '../models/Bill';
interface OCRResult {
    success: boolean;
    extractedData?: IExtractedData;
    confidence?: number;
    rawText?: string;
    error?: string;
}
declare class OCRService {
    private provider;
    private googleApiKey?;
    private awsConfig?;
    constructor();
    /**
     * Extract text from bill image
     */
    extractTextFromBill(imageUrl: string): Promise<OCRResult>;
    /**
     * Extract text using Google Cloud Vision API
     */
    private extractWithGoogleVision;
    /**
     * Extract text using AWS Textract
     */
    private extractWithAWSTextract;
    /**
     * Manual extraction (fallback)
     */
    private manualExtraction;
    /**
     * Parse raw text to extract bill data
     */
    private parseTextToBillData;
    /**
     * Validate extracted data against user input
     */
    validateExtractedData(extracted: IExtractedData, userInput: {
        amount: number;
        billDate: Date;
        merchantName?: string;
    }): {
        isValid: boolean;
        warnings: string[];
    };
    /**
     * Calculate string similarity (simple Levenshtein-based)
     */
    private calculateStringSimilarity;
    /**
     * Calculate Levenshtein distance
     */
    private levenshteinDistance;
}
export declare const ocrService: OCRService;
export default ocrService;
