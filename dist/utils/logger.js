"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const environment_1 = require("../config/environment");
const { createLogger, format, transports } = winston_1.default;
const { combine, timestamp, errors, json, printf, colorize } = format;
const customFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    return `${timestamp} [${level}]: ${stack || message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});
exports.logger = createLogger({
    level: environment_1.config.logging.level,
    format: combine(errors({ stack: true }), timestamp(), environment_1.config.server.nodeEnv === 'development'
        ? combine(colorize(), customFormat)
        : json()),
    defaultMeta: { service: 'techsapo-huggingface' },
    transports: [
        new transports.Console({
            format: environment_1.config.server.nodeEnv === 'development'
                ? combine(colorize(), customFormat)
                : json()
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