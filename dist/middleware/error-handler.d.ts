import { Request, Response, NextFunction } from 'express';
import { HuggingFaceError } from '../types/huggingface';
export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}
export declare class ValidationError extends Error {
    details?: any | undefined;
    statusCode: number;
    code: string;
    constructor(message: string, details?: any | undefined);
}
export declare class RateLimitError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class ServiceUnavailableError extends Error {
    service?: string | undefined;
    statusCode: number;
    code: string;
    constructor(message: string, service?: string | undefined);
}
export declare const errorHandler: (error: Error | ApiError | HuggingFaceError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
export default errorHandler;
