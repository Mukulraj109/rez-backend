/**
 * Validation Helper Functions
 * Utility functions for validating Indian business information
 */

/**
 * Validate GST (Goods and Services Tax) number
 * Format: 15 alphanumeric characters
 * Pattern: 2-digit state code + 10-digit PAN + 1-digit entity code + 1-digit checksum
 */
export const validateGST = (gst: string): boolean => {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gst.toUpperCase().replace(/\s/g, ''));
};

/**
 * Validate PAN (Permanent Account Number)
 * Format: 10 alphanumeric characters
 * Pattern: [A-Z]{5}[0-9]{4}[A-Z]{1}
 */
export const validatePAN = (pan: string): boolean => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.toUpperCase().replace(/\s/g, ''));
};

/**
 * Validate IFSC Code (Indian Financial System Code)
 * Format: 11 alphanumeric characters (4 letters + 0 + 6 alphanumeric)
 */
export const validateIFSC = (ifsc: string): boolean => {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc.toUpperCase().replace(/\s/g, ''));
};

/**
 * Validate Indian phone number
 * Accepts 10-digit numbers, with or without country code (+91)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

/**
 * Validate email address
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toLowerCase());
};

/**
 * Validate Indian postal code (pincode)
 * Format: 6 digits
 */
export const validatePincode = (pincode: string): boolean => {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(pincode.replace(/\s/g, ''));
};

/**
 * Validate AADHAAR number
 * Format: 12 digits
 */
export const validateAadhaar = (aadhaar: string): boolean => {
  const aadhaarRegex = /^[0-9]{12}$/;
  return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
};

/**
 * Validate bank account number
 * Format: 9-18 digits
 */
export const validateBankAccount = (account: string): boolean => {
  const accountRegex = /^[0-9]{9,18}$/;
  return accountRegex.test(account.replace(/\s/g, ''));
};

/**
 * Validate UPI ID
 * Format: username@bankname
 */
export const validateUPI = (upi: string): boolean => {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/;
  return upiRegex.test(upi.toLowerCase());
};

/**
 * Validate URL
 */
export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate password strength
 * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
} => {
  const feedback: string[] = [];
  let strength = 0;

  if (password.length >= 8) strength++;
  else feedback.push('Password must be at least 8 characters');

  if (password.length >= 12) strength++;
  else if (password.length >= 8) feedback.push('Password length could be longer (12+ chars recommended)');

  if (/[A-Z]/.test(password)) strength++;
  else feedback.push('Add uppercase letter (A-Z)');

  if (/[a-z]/.test(password)) strength++;
  else feedback.push('Add lowercase letter (a-z)');

  if (/[0-9]/.test(password)) strength++;
  else feedback.push('Add number (0-9)');

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
  else feedback.push('Add special character (!@#$%^&*...)');

  const strengthMap: { [key: number]: 'weak' | 'fair' | 'good' | 'strong' } = {
    0: 'weak',
    1: 'weak',
    2: 'fair',
    3: 'fair',
    4: 'good',
    5: 'good',
    6: 'strong',
  };

  return {
    isValid: strength >= 4,
    strength: strengthMap[Math.min(strength, 6)],
    feedback: feedback.slice(0, 3),
  };
};

/**
 * Validate business name
 * Allow alphanumeric, spaces, and common business symbols
 */
export const validateBusinessName = (name: string): boolean => {
  const nameRegex = /^[a-zA-Z0-9\s&().,'-]{2,100}$/;
  return nameRegex.test(name.trim());
};

/**
 * Validate GST number format with Luhn algorithm (enhanced validation)
 */
export const validateGSTWithChecksum = (gst: string): boolean => {
  const cleanGST = gst.toUpperCase().replace(/\s/g, '');

  // First check format
  if (!validateGST(cleanGST)) return false;

  // GST checksum validation (Luhn algorithm)
  const gstDigits = cleanGST.slice(0, 14);
  const checksum = parseInt(cleanGST[14], 10);

  // Character to number mapping for Luhn algorithm
  const charMap: { [key: string]: number } = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15, 'G': 16, 'H': 17, 'I': 18,
    'J': 19, 'K': 20, 'L': 21, 'M': 22, 'N': 23, 'O': 24, 'P': 25, 'Q': 26, 'R': 27,
    'S': 28, 'T': 29, 'U': 30, 'V': 31, 'W': 32, 'X': 33, 'Y': 34, 'Z': 35,
  };

  let sum = 0;
  for (let i = 0; i < gstDigits.length; i++) {
    const digit = charMap[gstDigits[i]] || 0;
    const doubled = i % 2 === 0 ? digit * 2 : digit;
    sum += doubled > 35 ? Math.floor(doubled / 36) + (doubled % 36) : doubled;
  }

  const calculatedChecksum = (36 - (sum % 36)) % 36;
  return calculatedChecksum === checksum;
};

/**
 * Sanitize input string
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return cleaned;
};

/**
 * Format GST number for display
 */
export const formatGST = (gst: string): string => {
  const cleaned = gst.toUpperCase().replace(/\s/g, '');
  return cleaned.replace(/(.{2})(.{5})(.{4})(.{1})(.{1})(.{1})/, '$1 $2 $3 $4 $5 $6');
};

/**
 * Format PAN number for display
 */
export const formatPAN = (pan: string): string => {
  const cleaned = pan.toUpperCase().replace(/\s/g, '');
  return cleaned.replace(/(.{5})(.{4})(.{1})/, '$1 $2 $3');
};

/**
 * Format bank account for display (masked)
 */
export const formatBankAccountMasked = (account: string): string => {
  const cleaned = account.replace(/\s/g, '');
  if (cleaned.length < 4) return cleaned;
  const lastFour = cleaned.slice(-4);
  return `****${lastFour}`;
};
