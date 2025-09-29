"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactSensitiveContent = exports.sanitizeFileName = void 0;
const path = __importStar(require("path"));
const MAX_FILENAME_LENGTH = 255;
const UNSAFE_FILENAME_CHARS = new RegExp(String.raw `[\\/:*?"<>|]`, 'g');
const PATH_TRAVERSAL_PATTERN = new RegExp(String.raw `(?:^|[\\/])\.\.?(?:[\\/]|$)`, 'g');
const MULTIPLE_SEPARATORS = new RegExp(String.raw `[\\/]+`, 'g');
const SECRET_KEY_VALUE_PATTERN = new RegExp(String.raw `\b[A-Za-z0-9_]{3,}=[A-Za-z0-9+/=.-]{3,}\b`, 'gi');
function stripControlCharacters(value) {
    let sanitized = '';
    for (const char of value) {
        const codePoint = char.charCodeAt(0);
        if ((codePoint >= 0 && codePoint <= 31) || codePoint === 127) {
            sanitized += ' ';
        }
        else {
            sanitized += char;
        }
    }
    return sanitized;
}
function sanitizeFileName(originalName) {
    const normalized = originalName.normalize('NFKC');
    const withoutControlChars = stripControlCharacters(normalized);
    const withoutTraversal = withoutControlChars.replace(PATH_TRAVERSAL_PATTERN, '/');
    const collapsedSeparators = withoutTraversal.replace(MULTIPLE_SEPARATORS, '/');
    const basename = path.basename(collapsedSeparators).trim();
    const safeCharacters = basename.replace(UNSAFE_FILENAME_CHARS, '_');
    const condensedDots = safeCharacters.replace(/\.\.+/g, '.');
    const cleaned = condensedDots.replace(/\s+/g, ' ').trim();
    const fallbackName = cleaned.length > 0 ? cleaned : 'untitled';
    return fallbackName.slice(0, MAX_FILENAME_LENGTH);
}
exports.sanitizeFileName = sanitizeFileName;
function redactSensitiveContent(value) {
    return value.replace(SECRET_KEY_VALUE_PATTERN, '[REDACTED]');
}
exports.redactSensitiveContent = redactSensitiveContent;
//# sourceMappingURL=security.js.map