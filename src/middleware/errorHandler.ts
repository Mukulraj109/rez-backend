import { Request, Response, NextFunction } from 'express';
import { sendError, sendInternalError } from '../utils/response';

// Custom error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle Mongoose validation errors
const handleValidationError = (error: any) => {
  const errors = Object.values(error.errors).map((err: any) => ({
    field: err.path,
    message: err.message
  }));
  
  return new AppError('Validation failed', 400);
};

// Handle Mongoose duplicate key errors
const handleDuplicateKeyError = (error: any) => {
  const field = Object.keys(error.keyValue)[0];
  return new AppError(`${field} already exists`, 409);
};

// Handle Mongoose cast errors
const handleCastError = (error: any) => {
  return new AppError(`Invalid ${error.path}: ${error.value}`, 400);
};

// Handle JWT errors
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Token expired. Please log in again', 401);
};

// Global error handling middleware
export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let err = { ...error };
  err.message = error.message;

  console.error('Error:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    err = handleValidationError(error);
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    err = handleDuplicateKeyError(error);
  }

  // Mongoose cast error
  if (error.name === 'CastError') {
    err = handleCastError(error);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    err = handleJWTError();
  }

  if (error.name === 'TokenExpiredError') {
    err = handleJWTExpiredError();
  }

  // Send error response
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Something went wrong';

  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      success: false,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // Production error response
  if (err.isOperational) {
    return sendError(res, message, statusCode);
  }

  // Programming or other unknown error: don't leak error details
  console.error('ERROR:', err);
  return sendInternalError(res, 'Something went wrong');
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};