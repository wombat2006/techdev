import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './error-handler';
import { TaskType } from '../types/huggingface';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string; // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
}

export const validateRequest = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const data = { ...req.body, ...req.query, ...req.params };

    for (const rule of rules) {
      const value = data[rule.field];
      const fieldName = rule.field;

      // Required field check
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${fieldName}' is required`);
        continue;
      }

      // Skip validation if field is not required and value is empty
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push(`Field '${fieldName}' must be of type ${rule.type}`);
          continue;
        }
      }

      // String validations
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`Field '${fieldName}' must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`Field '${fieldName}' must not exceed ${rule.maxLength} characters`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`Field '${fieldName}' does not match required pattern`);
        }
      }

      // Number validations
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`Field '${fieldName}' must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`Field '${fieldName}' must not exceed ${rule.max}`);
        }
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`Field '${fieldName}' must be one of: ${rule.enum.join(', ')}`);
      }

      // Custom validation
      if (rule.custom) {
        const customResult = rule.custom(value);
        if (customResult !== true) {
          errors.push(typeof customResult === 'string' ? customResult : `Field '${fieldName}' is invalid`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', { errors });
    }

    next();
  };
};

// Predefined validation rules for common use cases
export const embeddingValidation = validateRequest([
  {
    field: 'text',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 10000
  },
  {
    field: 'model',
    required: false,
    type: 'string',
    minLength: 1,
    maxLength: 200
  },
  {
    field: 'options',
    required: false,
    type: 'object'
  }
]);

export const inferenceValidation = validateRequest([
  {
    field: 'inputs',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 5000
  },
  {
    field: 'model',
    required: false,
    type: 'string',
    minLength: 1,
    maxLength: 200
  },
  {
    field: 'taskType',
    required: false,
    type: 'string',
    enum: Object.values(TaskType)
  },
  {
    field: 'conversationId',
    required: false,
    type: 'string',
    pattern: /^[a-zA-Z0-9_-]+$/,
    minLength: 1,
    maxLength: 100
  },
  {
    field: 'parameters',
    required: false,
    type: 'object'
  }
]);

export const conversationValidation = validateRequest([
  {
    field: 'conversationId',
    required: true,
    type: 'string',
    pattern: /^[a-zA-Z0-9_-]+$/,
    minLength: 1,
    maxLength: 100
  },
  {
    field: 'userInput',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 5000
  }
]);

export const multiModelValidation = validateRequest([
  {
    field: 'text',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 5000
  },
  {
    field: 'models',
    required: false,
    type: 'array',
    custom: (value) => {
      if (!Array.isArray(value)) return true;
      if (value.length === 0) return 'Models array cannot be empty';
      if (value.length > 10) return 'Models array cannot exceed 10 items';
      return value.every(model => typeof model === 'string' && model.length > 0) 
        || 'All models must be non-empty strings';
    }
  },
  {
    field: 'options',
    required: false,
    type: 'object'
  }
]);

// Sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize string inputs to prevent XSS and injection attacks
  const sanitizeString = (str: string): string => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  
  next();
};

// Rate limiting per IP
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (requestsPerMinute: number = 60) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    let clientData = rateLimitStore.get(clientIP);
    
    if (!clientData || clientData.resetTime <= now) {
      clientData = { count: 1, resetTime: now + 60000 };
      rateLimitStore.set(clientIP, clientData);
    } else {
      clientData.count++;
    }

    // Clean up old entries
    for (const [ip, data] of rateLimitStore.entries()) {
      if (data.resetTime <= now) {
        rateLimitStore.delete(ip);
      }
    }

    if (clientData.count > requestsPerMinute) {
      res.status(429).json({
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        },
        timestamp: new Date().toISOString(),
        path: req.path
      });
      return;
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': requestsPerMinute.toString(),
      'X-RateLimit-Remaining': Math.max(0, requestsPerMinute - clientData.count).toString(),
      'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString()
    });

    next();
  };
};

export default { 
  validateRequest, 
  sanitizeInput, 
  rateLimiter,
  embeddingValidation,
  inferenceValidation,
  conversationValidation,
  multiModelValidation
};
