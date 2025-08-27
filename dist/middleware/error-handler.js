"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.ServiceUnavailableError = exports.RateLimitError = exports.ValidationError = void 0;
const logger_1 = require("../utils/logger");
class ValidationError extends Error {
    details;
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class RateLimitError extends Error {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    constructor(message = 'Rate limit exceeded') {
        super(message);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class ServiceUnavailableError extends Error {
    service;
    statusCode = 503;
    code = 'SERVICE_UNAVAILABLE';
    constructor(message, service) {
        super(message);
        this.service = service;
        this.name = 'ServiceUnavailableError';
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
const errorHandler = (error, req, res, next) => {
    logger_1.logger.error('API Error occurred', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    // Handle HuggingFace specific errors
    if ('retryable' in error) {
        const hfError = error;
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
        const apiError = error;
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
                details: error.details
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
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: {
            message: `Route ${req.path} not found`,
            code: 'ROUTE_NOT_FOUND'
        },
        timestamp: new Date().toISOString(),
        path: req.path
    });
};
exports.notFoundHandler = notFoundHandler;
exports.default = exports.errorHandler;
//# sourceMappingURL=error-handler.js.map