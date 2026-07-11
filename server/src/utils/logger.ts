import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, errors, json, colorize, printf, splat } = winston.format;

// ─── Custom Format for Development ───────────────────────────────────────────

const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${ts} [${level}]: ${stack || message}${metaStr}`;
});

// ─── Transport: Console ───────────────────────────────────────────────────────

const consoleTransport = new winston.transports.Console({
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    splat(),
    devFormat
  ),
  silent: process.env.NODE_ENV === 'test',
});

// ─── Transport: Rotating File (JSON) ─────────────────────────────────────────

const fileTransportOptions = {
  dirname: path.join(process.cwd(), 'logs'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: combine(timestamp(), errors({ stack: true }), json()),
};

const errorFileTransport = new DailyRotateFile({
  ...fileTransportOptions,
  filename: 'error-%DATE%.log',
  level: 'error',
});

const combinedFileTransport = new DailyRotateFile({
  ...fileTransportOptions,
  filename: 'combined-%DATE%.log',
});

// ─── Logger Instance ──────────────────────────────────────────────────────────

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'aether-mart-api' },
  transports: [
    consoleTransport,
    ...(process.env.NODE_ENV !== 'test' ? [errorFileTransport, combinedFileTransport] : []),
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
  exitOnError: false,
});

// ─── Child Logger Factory ─────────────────────────────────────────────────────

/**
 * Creates a child logger with a module-specific context label.
 * Usage: const log = createModuleLogger('AuthService');
 */
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};

export default logger;
