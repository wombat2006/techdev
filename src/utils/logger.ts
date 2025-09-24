import type { Format } from 'logform';
import { format as logformFormat } from 'logform';
import winston from 'winston';
import { config } from '../config/environment';

const { createLogger, format, transports } = winston;

const identityFormat: Format = logformFormat(info => info) as unknown as Format;
const MESSAGE = Symbol.for('message');

const safeCombine = (...formats: Format[]): Format => {
  const available = formats.filter(Boolean);
  if (typeof format.combine === 'function') {
    return format.combine(...available);
  }
  return available[0] ?? identityFormat;
};

const safeTimestamp = (options?: Parameters<typeof format.timestamp>[0]): Format => {
  if (typeof format.timestamp === 'function') {
    return format.timestamp(options);
  }
  return identityFormat;
};

const safeJson = (options?: Parameters<typeof format.json>[0]): Format => {
  if (typeof format.json === 'function') {
    return format.json(options);
  }
  return logformFormat(info => ({ ...info })) as unknown as Format;
};

const safePrintf = (formatter: Parameters<typeof format.printf>[0]): Format => {
  if (typeof format.printf === 'function') {
    return format.printf(formatter);
  }

  return logformFormat(info => ({
    ...info,
    [MESSAGE]: formatter(info)
  })) as unknown as Format;
};

const safeColorize = (options?: Parameters<typeof format.colorize>[0]): Format => {
  if (typeof format.colorize === 'function') {
    return format.colorize(options);
  }
  return identityFormat;
};

const customFormat = safePrintf(({ level, message, timestamp, stack, ...meta }) => {
  const serializedMeta = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${stack || message}${serializedMeta}`;
});

const enhanceErrorsFormat: Format = (() => {
  if (typeof format.errors === 'function') {
    return format.errors({ stack: true }) as unknown as Format;
  }

  return logformFormat(info => {
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
  }) as unknown as Format;
})();

export const logger = createLogger({
  level: config.logging.level,
  format: safeCombine(
    enhanceErrorsFormat,
    safeTimestamp(),
    config.server.nodeEnv === 'development'
      ? safeCombine(safeColorize(), customFormat)
      : safeJson()
  ),
  defaultMeta: { service: 'techsapo' },
  transports: [
    new transports.Console({
      format: config.server.nodeEnv === 'development'
        ? safeCombine(safeColorize(), customFormat)
        : safeJson()
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
