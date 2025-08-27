"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiAuth = openaiAuth;
exports.enhancedSecurityValidation = enhancedSecurityValidation;
function openaiAuth(req, res, next) {
    const apiKey = req.headers['x-openai-api-key'] || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(401).json({
            error: 'OpenAI API key required',
            code: 'MISSING_OPENAI_KEY'
        });
    }
    req.openaiAuth = {
        apiKey,
        model: req.headers['x-openai-model'] || 'gpt-4'
    };
    next();
}
function enhancedSecurityValidation(req, res, next) {
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
//# sourceMappingURL=openai-auth.js.map