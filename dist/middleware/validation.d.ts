import { Request, Response, NextFunction } from 'express';
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
    custom?: (value: any) => boolean | string;
}
export declare const validateRequest: (rules: ValidationRule[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const embeddingValidation: (req: Request, res: Response, next: NextFunction) => void;
export declare const inferenceValidation: (req: Request, res: Response, next: NextFunction) => void;
export declare const conversationValidation: (req: Request, res: Response, next: NextFunction) => void;
export declare const multiModelValidation: (req: Request, res: Response, next: NextFunction) => void;
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
export declare const rateLimiter: (requestsPerMinute?: number) => (req: Request, res: Response, next: NextFunction) => void;
declare const _default: {
    validateRequest: (rules: ValidationRule[]) => (req: Request, res: Response, next: NextFunction) => void;
    sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
    rateLimiter: (requestsPerMinute?: number) => (req: Request, res: Response, next: NextFunction) => void;
    embeddingValidation: (req: Request, res: Response, next: NextFunction) => void;
    inferenceValidation: (req: Request, res: Response, next: NextFunction) => void;
    conversationValidation: (req: Request, res: Response, next: NextFunction) => void;
    multiModelValidation: (req: Request, res: Response, next: NextFunction) => void;
};
export default _default;
