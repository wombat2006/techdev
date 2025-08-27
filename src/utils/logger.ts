import winston from 'winston';
import { config } from '../config/environment';

const { createLogger, format, transports } = winston;
const { combine, timestamp, errors, json, printf, colorize } = format;

const customFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  return `${timestamp} [${level}]: ${stack || message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

export const logger = createLogger({
  level: config.logging.level,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    config.server.nodeEnv === 'development' 
      ? combine(colorize(), customFormat)
      : json()
  ),
  defaultMeta: { service: 'techsapo' },
  transports: [
    new transports.Console({
      format: config.server.nodeEnv === 'development' 
        ? combine(colorize(), customFormat)
        : json()
    }),
    new transports.File({ 
      filename: config.logging.filePath.replace('.log', '-error.log'),
      level: 'error'
    }),
    new transports.File({ 
      filename: config.logging.filePath 
    })
  ]
});

export default logger;