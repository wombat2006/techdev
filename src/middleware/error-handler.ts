import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { HuggingFaceError } from '../types/huggingface';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  public details?: any;
  
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class RateLimitError extends Error {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends Error {
  statusCode = 503;
  code = 'SERVICE_UNAVAILABLE';
  public service?: string;
  
  constructor(message: string, service?: string) {
    super(message);
    this.name = 'ServiceUnavailableError';
    this.service = service;
  }
}

export const errorHandler = (
  error: Error | ApiError | HuggingFaceError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  next: NextFunction
): void => {
  logger.error('API Error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle HuggingFace specific errors
  if ('retryable' in error) {
    const hfError = error as HuggingFaceError;
    res.status(hfError.statusCode || 500).json({
      error: {
        message: hfError.error,
        code: 'HUGGINGFACE_ERROR',
        model: hfError.model,
        retryable: hfError.retryable,
        details: hfError.details
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
    return;
  }

  // Handle known API errors
  if ('statusCode' in error) {
    const apiError = error as ApiError;
    res.status(apiError.statusCode || 500).json({
      error: {
        message: error.message,
        code: apiError.code || 'API_ERROR',
        details: apiError.details
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: {
        message: error.message,
        code: 'VALIDATION_ERROR',
        details: (error as any).details
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
    return;
  }

  // Handle MongoDB/Database errors
  if (error.name === 'MongoError' || error.name === 'MongooseError') {
    res.status(500).json({
      error: {
        message: 'Database error occurred',
        code: 'DATABASE_ERROR'
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
    return;
  }

  // Handle timeout errors
  if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
    res.status(504).json({
      error: {
        message: 'Request timeout',
        code: 'TIMEOUT_ERROR'
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
    return;
  }

  // Default error response
  res.status(500).json({
    error: {
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    },
    timestamp: new Date().toISOString(),
    path: req.path
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: {
      message: `Route ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND'
    },
    timestamp: new Date().toISOString(),
    path: req.path
  });
};

export default errorHandler;
