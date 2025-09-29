import { Request, Response, NextFunction } from 'express';
export interface OpenAIAuthRequest extends Request {
    headers: any;
    openaiAuth?: {
        apiKey: string;
        model: string;
    };
}
export declare function openaiAuth(req: OpenAIAuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>>;
export declare function enhancedSecurityValidation(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
