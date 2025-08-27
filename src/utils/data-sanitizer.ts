export interface SanitizeOptions {
  maxLength?: number;
  allowedFields?: string[];
  stripHtml?: boolean;
}

export function sanitizeInput(input: any, options: SanitizeOptions = {}): any {
  const { maxLength = 10000, allowedFields, stripHtml = true } = options;

  if (typeof input === 'string') {
    let sanitized = input.trim();
    
    // Strip HTML tags if requested
    if (stripHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
    
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
    }
    
    return sanitized;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item, options));
  }

  if (input && typeof input === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(input)) {
      // Skip disallowed fields if allowedFields is specified
      if (allowedFields && !allowedFields.includes(key)) {
        continue;
      }
      
      sanitized[key] = sanitizeInput(value, options);
    }
    
    return sanitized;
  }

  return input;
}

export function sanitizeLogData(logData: any): any {
  return sanitizeInput(logData, {
    maxLength: 50000,
    allowedFields: ['timestamp', 'level', 'message', 'service', 'error', 'context'],
    stripHtml: true
  });
}

export function sanitizeUserInput(userInput: any): any {
  return sanitizeInput(userInput, {
    maxLength: 5000,
    stripHtml: true
  });
}

export interface SanitizationResult {
  sanitized: string;
  flagged: boolean;
  issues: string[];
}

export class DataSanitizer {
  static sanitizeInput(input: string): SanitizationResult {
    const issues: string[] = [];
    let sanitized = input;
    
    // Remove potential XSS
    if (/<script|javascript:|on\w+=/i.test(input)) {
      issues.push('XSS_ATTEMPT');
      sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    }
    
    // Remove SQL injection patterns
    if (/union select|drop table|insert into/i.test(input)) {
      issues.push('SQL_INJECTION_ATTEMPT');
    }
    
    return {
      sanitized,
      flagged: issues.length > 0,
      issues
    };
  }
  
  static sanitizeLogData(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeInput(data).sanitized;
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const key in data) {
        sanitized[key] = this.sanitizeLogData(data[key]);
      }
      return sanitized;
    }
    
    return data;
  }
  
  static sanitizeForExternalAPI(data: any): any {
    // Sanitize data for external API calls
    if (typeof data === 'string') {
      return this.sanitizeInput(data).sanitized;
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const key in data) {
        if (key !== 'password' && key !== 'apiKey' && key !== 'secret') {
          sanitized[key] = this.sanitizeForExternalAPI(data[key]);
        }
      }
      return sanitized;
    }
    
    return data;
  }
}