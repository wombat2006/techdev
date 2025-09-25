"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const logform_1 = require("logform");
const winston_1 = __importDefault(require("winston"));
const environment_1 = require("../config/environment");
const { createLogger, format, transports } = winston_1.default;
const identityFormat = (0, logform_1.format)(info => info);
const MESSAGE = Symbol.for('message');
const safeCombine = (...formats) => {
    const available = formats.filter(Boolean);
    if (typeof format.combine === 'function') {
        return format.combine(...available);
    }
    return available[0] ?? identityFormat;
};
const safeTimestamp = (options) => {
    if (typeof format.timestamp === 'function') {
        return format.timestamp(options);
    }
    return identityFormat;
};
const safeJson = (options) => {
    if (typeof format.json === 'function') {
        return format.json(options);
    }
    return (0, logform_1.format)(info => ({ ...info }));
};
const safePrintf = (formatter) => {
    if (typeof format.printf === 'function') {
        return format.printf(formatter);
    }
    return (0, logform_1.format)(info => ({
        ...info,
        [MESSAGE]: formatter(info)
    }));
};
const safeColorize = (options) => {
    if (typeof format.colorize === 'function') {
        return format.colorize(options);
    }
    return identityFormat;
};
const customFormat = safePrintf(({ level, message, timestamp, stack, ...meta }) => {
    const serializedMeta = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${stack || message}${serializedMeta}`;
});
const enhanceErrorsFormat = (() => {
    if (typeof format.errors === 'function') {
        return format.errors({ stack: true });
    }
    return (0, logform_1.format)(info => {
        const error = info instanceof Error
            ? info
            : info.error instanceof Error
                ? info.error
                : null;
        if (error) {
            return {
                ...info,
                message: error.message,
                stack: error.stack
            };
        }
        if (info.stack && !info.message) {
            return {
                ...info,
                message: info.stack
            };
        }
        return info;
    });
})();
exports.logger = createLogger({
    level: environment_1.config.logging.level,
    format: safeCombine(enhanceErrorsFormat, safeTimestamp(), environment_1.config.server.nodeEnv === 'development'
        ? safeCombine(safeColorize(), customFormat)
        : safeJson()),
    defaultMeta: { service: 'techsapo' },
    transports: [
        new transports.Console({
            format: environment_1.config.server.nodeEnv === 'development'
                ? safeCombine(safeColorize(), customFormat)
                : safeJson()
        }),
        new transports.File({
            filename: environment_1.config.logging.filePath.replace('.log', '-error.log'),
            level: 'error'
        }),
        new transports.File({
            filename: environment_1.config.logging.filePath
        })
    ]
});
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map