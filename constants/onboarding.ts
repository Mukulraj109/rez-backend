/**
 * Onboarding Constants
 * Constants and configuration for the merchant onboarding process
 */

// ============================================================================
// Business Types
// ============================================================================

export const BUSINESS_TYPES = [
  {
    value: 'sole_proprietor',
    label: 'Sole Proprietorship',
    description: 'Business owned and run by one person',
  },
  {
    value: 'partnership',
    label: 'Partnership',
    description: 'Business owned by two or more people',
  },
  {
    value: 'pvt_ltd',
    label: 'Private Limited Company',
    description: 'Separate legal entity with limited liability',
  },
  {
    value: 'llp',
    label: 'Limited Liability Partnership',
    description: 'Partnership with limited liability',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other business structure',
  },
] as const;

// ============================================================================
// Business Categories
// ============================================================================

export const BUSINESS_CATEGORIES = [
  {
    value: 'retail',
    label: 'Retail',
    subcategories: [
      'Clothing & Apparel',
      'Electronics',
      'Home & Garden',
      'Books & Media',
      'Sports & Outdoors',
      'Toys & Games',
      'Health & Beauty',
      'Grocery & Food',
    ],
  },
  {
    value: 'food_beverage',
    label: 'Food & Beverage',
    subcategories: [
      'Restaurant',
      'Cafe',
      'Bakery',
      'Fast Food',
      'Cloud Kitchen',
      'Bar & Pub',
      'Food Truck',
      'Catering',
    ],
  },
  {
    value: 'services',
    label: 'Services',
    subcategories: [
      'Salon & Spa',
      'Fitness & Gym',
      'Professional Services',
      'Home Services',
      'Education & Training',
      'Healthcare',
      'Automotive',
      'Repair Services',
    ],
  },
  {
    value: 'entertainment',
    label: 'Entertainment',
    subcategories: [
      'Cinema & Theater',
      'Gaming Zone',
      'Amusement Park',
      'Event Planning',
      'Photography',
      'Music & Arts',
    ],
  },
  {
    value: 'hospitality',
    label: 'Hospitality',
    subcategories: [
      'Hotel',
      'Resort',
      'Guest House',
      'Homestay',
      'Vacation Rental',
    ],
  },
  {
    value: 'other',
    label: 'Other',
    subcategories: ['Other'],
  },
] as const;

// ============================================================================
// Document Types
// ============================================================================

export const DOCUMENT_TYPES = [
  {
    id: 'pan_card',
    type: 'pan_card' as const,
    label: 'PAN Card',
    description: 'Permanent Account Number card for tax purposes',
    isRequired: true,
    maxSize: 5, // MB
    acceptedFormats: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    expiryRequired: false,
  },
  {
    id: 'aadhar',
    type: 'aadhar' as const,
    label: 'Aadhar Card',
    description: 'Unique identification document',
    isRequired: true,
    maxSize: 5,
    acceptedFormats: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    expiryRequired: false,
  },
  {
    id: 'gst_certificate',
    type: 'gst_certificate' as const,
    label: 'GST Registration Certificate',
    description: 'GST registration certificate (if applicable)',
    isRequired: false,
    maxSize: 5,
    acceptedFormats: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    expiryRequired: false,
  },
  {
    id: 'bank_statement',
    type: 'bank_statement' as const,
    label: 'Bank Statement',
    description: 'Recent bank statement (last 3 months)',
    isRequired: true,
    maxSize: 10,
    acceptedFormats: ['application/pdf'],
    expiryRequired: false,
  },
  {
    id: 'business_license',
    type: 'business_license' as const,
    label: 'Business License',
    description: 'Trade license or business registration certificate',
    isRequired: true,
    maxSize: 5,
    acceptedFormats: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    expiryRequired: true,
  },
  {
    id: 'utility_bill',
    type: 'utility_bill' as const,
    label: 'Utility Bill',
    description: 'Recent utility bill as address proof (last 3 months)',
    isRequired: false,
    maxSize: 5,
    acceptedFormats: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    expiryRequired: false,
  },
] as const;

// ============================================================================
// Operating Hours
// ============================================================================

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const OPERATING_HOURS = {
  defaultOpen: '09:00',
  defaultClose: '21:00',
  timeSlots: [
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
    '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
  ],
} as const;

// ============================================================================
// Store Types
// ============================================================================

export const STORE_TYPES = [
  {
    value: 'online',
    label: 'Online Only',
    description: 'Operates exclusively online',
  },
  {
    value: 'offline',
    label: 'Physical Store Only',
    description: 'Traditional brick-and-mortar store',
  },
  {
    value: 'both',
    label: 'Online & Offline',
    description: 'Both online and physical presence',
  },
] as const;

// ============================================================================
// Account Types
// ============================================================================

export const ACCOUNT_TYPES = [
  {
    value: 'savings',
    label: 'Savings Account',
    description: 'Personal or business savings account',
  },
  {
    value: 'current',
    label: 'Current Account',
    description: 'Business current account',
  },
  {
    value: 'business',
    label: 'Business Account',
    description: 'Dedicated business account',
  },
] as const;

// ============================================================================
// Tax Filing Frequencies
// ============================================================================

export const TAX_FILING_FREQUENCIES = [
  {
    value: 'monthly',
    label: 'Monthly',
    description: 'Monthly tax filing',
  },
  {
    value: 'quarterly',
    label: 'Quarterly',
    description: 'Quarterly tax filing',
  },
  {
    value: 'annually',
    label: 'Annually',
    description: 'Annual tax filing',
  },
] as const;

// ============================================================================
// Revenue Ranges
// ============================================================================

export const REVENUE_RANGES = [
  {
    value: 0,
    label: 'Below ₹1 Lakh',
    description: 'Monthly revenue less than ₹1 lakh',
  },
  {
    value: 100000,
    label: '₹1 Lakh - ₹5 Lakhs',
    description: 'Monthly revenue between ₹1-5 lakhs',
  },
  {
    value: 500000,
    label: '₹5 Lakhs - ₹10 Lakhs',
    description: 'Monthly revenue between ₹5-10 lakhs',
  },
  {
    value: 1000000,
    label: '₹10 Lakhs - ₹25 Lakhs',
    description: 'Monthly revenue between ₹10-25 lakhs',
  },
  {
    value: 2500000,
    label: 'Above ₹25 Lakhs',
    description: 'Monthly revenue above ₹25 lakhs',
  },
] as const;

// ============================================================================
// Onboarding Steps Configuration
// ============================================================================

export const ONBOARDING_STEPS = [
  {
    stepNumber: 1,
    title: 'Welcome',
    route: '/onboarding/welcome',
    description: 'Get started with your merchant account',
    icon: 'hand-wave',
  },
  {
    stepNumber: 2,
    title: 'Business Information',
    route: '/onboarding/business-info',
    description: 'Tell us about your business',
    icon: 'business',
  },
  {
    stepNumber: 3,
    title: 'Store Details',
    route: '/onboarding/store-details',
    description: 'Set up your store information',
    icon: 'storefront',
  },
  {
    stepNumber: 4,
    title: 'Bank Details',
    route: '/onboarding/bank-details',
    description: 'Add your banking information',
    icon: 'account-balance',
  },
  {
    stepNumber: 5,
    title: 'Documents',
    route: '/onboarding/documents',
    description: 'Upload required documents',
    icon: 'description',
  },
  {
    stepNumber: 6,
    title: 'Review & Submit',
    route: '/onboarding/review',
    description: 'Review and submit your application',
    icon: 'check-circle',
  },
] as const;

// ============================================================================
// Validation Rules
// ============================================================================

export const VALIDATION_RULES = {
  phone: {
    pattern: /^[6-9]\d{9}$/,
    message: 'Please enter a valid 10-digit mobile number',
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  pan: {
    pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    message: 'Please enter a valid PAN number (e.g., ABCDE1234F)',
  },
  gst: {
    pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    message: 'Please enter a valid GST number',
  },
  ifsc: {
    pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    message: 'Please enter a valid IFSC code (e.g., SBIN0001234)',
  },
  aadhar: {
    pattern: /^\d{12}$/,
    message: 'Please enter a valid 12-digit Aadhar number',
  },
  pincode: {
    pattern: /^\d{6}$/,
    message: 'Please enter a valid 6-digit PIN code',
  },
  website: {
    pattern: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
    message: 'Please enter a valid website URL',
  },
  accountNumber: {
    minLength: 9,
    maxLength: 18,
    message: 'Account number must be between 9-18 digits',
  },
} as const;

// ============================================================================
// Status & Progress
// ============================================================================

export const ONBOARDING_STATUS = {
  IN_PROGRESS: 'in_progress',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ON_HOLD: 'on_hold',
} as const;

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  INVALID_FILE_TYPE: 'Invalid file type',
  NETWORK_ERROR: 'Network error. Please try again',
  SERVER_ERROR: 'Server error. Please try again later',
  UPLOAD_FAILED: 'File upload failed. Please try again',
  VALIDATION_FAILED: 'Please fix the errors before proceeding',
  INCOMPLETE_STEP: 'Please complete all required fields',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  STEP_SAVED: 'Step saved successfully',
  DOCUMENT_UPLOADED: 'Document uploaded successfully',
  ONBOARDING_SUBMITTED: 'Application submitted successfully',
  DATA_AUTO_SAVED: 'Data auto-saved',
} as const;

// ============================================================================
// Auto-save Configuration
// ============================================================================

export const AUTO_SAVE_CONFIG = {
  enabled: true,
  interval: 30000, // 30 seconds
  debounce: 1000, // 1 second
} as const;

// ============================================================================
// Upload Configuration
// ============================================================================

export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  maxTotalSize: 50 * 1024 * 1024, // 50 MB
  acceptedImageFormats: ['image/jpeg', 'image/jpg', 'image/png'],
  acceptedDocumentFormats: ['application/pdf'],
  chunkSize: 1024 * 1024, // 1 MB chunks for large files
} as const;

// ============================================================================
// Navigation
// ============================================================================

export const NAVIGATION_ROUTES = {
  WELCOME: '/onboarding/welcome',
  BUSINESS_INFO: '/onboarding/business-info',
  STORE_DETAILS: '/onboarding/store-details',
  BANK_DETAILS: '/onboarding/bank-details',
  DOCUMENTS: '/onboarding/documents',
  REVIEW: '/onboarding/review',
  PENDING_APPROVAL: '/onboarding/pending-approval',
  DASHBOARD: '/(dashboard)',
  LOGIN: '/(auth)/login',
} as const;

// ============================================================================
// Step Requirements
// ============================================================================

export const STEP_REQUIREMENTS = {
  STEP_1: ['businessName', 'ownerName', 'ownerEmail', 'ownerPhone', 'businessType', 'businessCategory'],
  STEP_2: ['storeName', 'storeType', 'storeAddress', 'storePhone'],
  STEP_3: ['accountHolderName', 'accountNumber', 'confirmAccountNumber', 'bankName', 'ifscCode', 'panNumber', 'accountType'],
  STEP_4: ['pan_card', 'aadhar', 'bank_statement', 'business_license'],
  STEP_5: ['agreedToTerms', 'agreedToPrivacy'],
} as const;
