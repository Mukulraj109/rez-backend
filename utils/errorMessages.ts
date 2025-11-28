/**
 * User-friendly error messages for different error types and scenarios
 * This file maps technical errors to user-readable messages
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorMessageConfig {
  title: string;
  message: string;
  action?: string;
  recoverable: boolean;
}

/**
 * Get user-friendly error message based on error type
 */
export const errorMessages: Record<ErrorType, ErrorMessageConfig> = {
  [ErrorType.NETWORK]: {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    action: 'Retry',
    recoverable: true,
  },
  [ErrorType.AUTHENTICATION]: {
    title: 'Authentication Failed',
    message: 'Your session has expired. Please log in again.',
    action: 'Log In',
    recoverable: true,
  },
  [ErrorType.AUTHORIZATION]: {
    title: 'Access Denied',
    message: 'You do not have permission to access this resource.',
    action: 'Go Back',
    recoverable: false,
  },
  [ErrorType.VALIDATION]: {
    title: 'Invalid Input',
    message: 'Please check your input and try again.',
    action: 'Try Again',
    recoverable: true,
  },
  [ErrorType.SERVER]: {
    title: 'Server Error',
    message: 'The server encountered an error. Please try again later.',
    action: 'Retry',
    recoverable: true,
  },
  [ErrorType.NOT_FOUND]: {
    title: 'Not Found',
    message: 'The requested resource was not found.',
    action: 'Go Back',
    recoverable: false,
  },
  [ErrorType.TIMEOUT]: {
    title: 'Request Timeout',
    message: 'The request took too long. Please try again.',
    action: 'Retry',
    recoverable: true,
  },
  [ErrorType.UNKNOWN]: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    action: 'Retry',
    recoverable: true,
  },
};

/**
 * Get error message for HTTP status codes
 */
export const getErrorMessageByStatus = (status: number): ErrorMessageConfig => {
  switch (status) {
    case 400:
      return errorMessages[ErrorType.VALIDATION];
    case 401:
      return errorMessages[ErrorType.AUTHENTICATION];
    case 403:
      return errorMessages[ErrorType.AUTHORIZATION];
    case 404:
      return errorMessages[ErrorType.NOT_FOUND];
    case 500:
    case 502:
    case 503:
    case 504:
      return errorMessages[ErrorType.SERVER];
    default:
      return errorMessages[ErrorType.UNKNOWN];
  }
};

/**
 * Get error message for specific error scenarios
 */
export const getErrorMessage = (
  error: unknown,
  errorType?: ErrorType
): ErrorMessageConfig => {
  // If error type is provided, use it directly
  if (errorType && errorMessages[errorType]) {
    return errorMessages[errorType];
  }

  // Check for HTTP error
  if (error instanceof Error && 'status' in error) {
    const status = (error as any).status;
    if (typeof status === 'number') {
      return getErrorMessageByStatus(status);
    }
  }

  // Check for network error
  if (
    error instanceof Error &&
    (error.message.includes('Network') ||
      error.message.includes('fetch') ||
      error.message.includes('Connection'))
  ) {
    return errorMessages[ErrorType.NETWORK];
  }

  // Check for timeout
  if (
    error instanceof Error &&
    (error.message.includes('timeout') || error.message.includes('Timeout'))
  ) {
    return errorMessages[ErrorType.TIMEOUT];
  }

  // Default to unknown error
  return errorMessages[ErrorType.UNKNOWN];
};

/**
 * Format error for display
 */
export const formatErrorDisplay = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

/**
 * Check if error is recoverable
 */
export const isErrorRecoverable = (error: unknown, errorType?: ErrorType): boolean => {
  const message = getErrorMessage(error, errorType);
  return message.recoverable;
};
