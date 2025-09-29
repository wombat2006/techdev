import { Request, Response, NextFunction } from 'express';

export interface OpenAIAuthRequest extends Request {
  headers: any;
  openaiAuth?: {
    apiKey: string;
    model: string;
  };
}

export function openaiAuth(req: OpenAIAuthRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-openai-api-key'] as string || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'OpenAI API key required',
      code: 'MISSING_OPENAI_KEY'
    });
  }

  req.openaiAuth = {
    apiKey,
    model: req.headers['x-openai-model'] as string || 'gpt-4'
  };

  next();
}

export function enhancedSecurityValidation(req: Request, res: Response, next: NextFunction) {
  // Enhanced security validation for IT support endpoints
  const userAgent = req.get('User-Agent');
  const contentType = req.get('Content-Type');
  
  // Block suspicious user agents
  if (userAgent && /bot|crawler|spider|scraper/i.test(userAgent)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Validate content type for POST requests
  if (req.method === 'POST' && contentType !== 'application/json') {
    return res.status(400).json({ error: 'Invalid content type' });
  }
  
  next();
}