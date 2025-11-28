/**
 * Centralized error handling and logging utilities
 * Provides consistent error handling across the application
 */

import { ErrorType, getErrorMessage, ErrorMessageConfig } from './errorMessages';

export interface AppError extends Error {
  type: ErrorType;
  status?: number;
  originalError?: Error;
  timestamp?: Date;
}

/**
 * Create a standardized app error
 */
export const createAppError = (
  message: string,
  type: ErrorType,
  originalError?: Error,
  status?: number
): AppError => {
  const error: AppError = new Error(message) as AppError;
  error.type = type;
  error.status = status;
  error.originalError = originalError;
  error.timestamp = new Date();
  error.name = 'AppError';
  return error;
};

/**
 * Parse error from various sources
 */
export const parseError = (error: unknown): AppError => {
  if (error instanceof Error && 'type' in error) {
    return error as AppError;
  }

  if (error instanceof Error) {
    let errorType = ErrorType.UNKNOWN;

    // Detect error type from error message
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      errorType = ErrorType.NETWORK;
    } else if (error.message.includes('timeout')) {
      errorType = ErrorType.TIMEOUT;
    }

    return createAppError(error.message, errorType, error);
  }

  if (typeof error === 'string') {
    return createAppError(error, ErrorType.UNKNOWN);
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as any).message || 'Unknown error';
    return createAppError(message, ErrorType.UNKNOWN);
  }

  return createAppError('An unexpected error occurred', ErrorType.UNKNOWN);
};

/**
 * Log error with appropriate level
 */
export const logError = (
  error: AppError | Error,
  context?: string,
  metadata?: Record<string, any>
): void => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    message: error.message,
    stack: error.stack,
    ...(error instanceof Error && 'type' in error && { type: (error as AppError).type }),
    ...metadata,
  };

  console.error('[ERROR]', JSON.stringify(errorInfo, null, 2));

  // Future: Send to error tracking service (Sentry, etc.)
  // if (process.env.NODE_ENV === 'production') {
  //   sendToErrorTracking(errorInfo);
  // }
};

/**
 * Handle API errors
 */
export const handleApiError = (
  error: unknown,
  context?: string
): { error: AppError; message: ErrorMessageConfig } => {
  let appError: AppError;

  if (error instanceof Response) {
    const status = error.status;
    appError = createAppError(`HTTP ${status}: ${error.statusText}`, ErrorType.SERVER, undefined, status);
  } else {
    appError = parseError(error);
  }

  logError(appError, context || 'API Error');

  const message = getErrorMessage(appError, appError.type);
  return { error: appError, message };
};

/**
 * Handle React component errors
 */
export const handleComponentError = (
  error: Error,
  errorInfo: React.ErrorInfo,
  componentName?: string
): void => {
  const appError = parseError(error);
  logError(appError, `Component Error: ${componentName}`, {
    componentStack: errorInfo.componentStack,
  });
};

/**
 * Handle validation errors
 */
export const handleValidationError = (
  error: unknown,
  fieldName?: string
): { error: AppError; message: ErrorMessageConfig } => {
  const appError = createAppError(
    `Validation error${fieldName ? ` in ${fieldName}` : ''}`,
    ErrorType.VALIDATION,
    error instanceof Error ? error : undefined
  );

  logError(appError, 'Validation Error', { fieldName });

  const message = getErrorMessage(appError, ErrorType.VALIDATION);
  return { error: appError, message };
};

/**
 * Handle authentication errors
 */
export const handleAuthError = (error: unknown): { error: AppError; message: ErrorMessageConfig } => {
  const appError = parseError(error);
  appError.type = ErrorType.AUTHENTICATION;

  logError(appError, 'Authentication Error');

  const message = getErrorMessage(appError, ErrorType.AUTHENTICATION);
  return { error: appError, message };
};

/**
 * Retry mechanism for recoverable errors
 */
export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error | undefined;
  let delay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        onRetry?.(attempt, lastError);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= backoffMultiplier;
      }
    }
  }

  throw lastError;
};

/**
 * Safe async wrapper for promise-based operations
 */
export const safeAsync = async <T>(
  fn: () => Promise<T>,
  context?: string
): Promise<{ data?: T; error?: AppError }> => {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    const appError = parseError(error);
    logError(appError, context);
    return { error: appError };
  }
};

/**
 * Safe sync wrapper for synchronous operations
 */
export const safeSync = <T>(
  fn: () => T,
  context?: string
): { data?: T; error?: AppError } => {
  try {
    const data = fn();
    return { data };
  } catch (error) {
    const appError = parseError(error);
    logError(appError, context);
    return { error: appError };
  }
};

/**
 * Chain multiple async operations with error handling
 */
export const executeSequentially = async <T>(
  operations: (() => Promise<T>)[],
  context?: string
): Promise<{ data?: T[]; error?: AppError }> => {
  const results: T[] = [];

  for (let i = 0; i < operations.length; i++) {
    try {
      const result = await operations[i]();
      results.push(result);
    } catch (error) {
      const appError = parseError(error);
      logError(appError, `${context} - Operation ${i + 1}`);
      return { error: appError };
    }
  }

  return { data: results };
};

/**
 * Get error severity level
 */
export const getErrorSeverity = (error: AppError): 'low' | 'medium' | 'high' => {
  switch (error.type) {
    case ErrorType.VALIDATION:
      return 'low';
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
      return 'medium';
    case ErrorType.AUTHENTICATION:
    case ErrorType.AUTHORIZATION:
    case ErrorType.SERVER:
      return 'high';
    default:
      return 'medium';
  }
};
