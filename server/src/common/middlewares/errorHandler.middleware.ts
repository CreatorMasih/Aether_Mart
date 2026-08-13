import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import { logger } from '../../utils/logger';
import {
  sendError,
  HttpStatus,
  ErrorCodes,
} from '../../utils/response.util';

// ─── Custom Application Error ─────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    code: string = ErrorCodes.INTERNAL_ERROR,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Specific Error Factories ─────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code: string = ErrorCodes.TOKEN_MISSING) {
    super(message, HttpStatus.UNAUTHORIZED, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, ErrorCodes.VALIDATION_ERROR, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code: string = ErrorCodes.ALREADY_EXISTS) {
    super(message, HttpStatus.CONFLICT, code);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code: string = ErrorCodes.INVALID_PAYLOAD) {
    super(message, HttpStatus.BAD_REQUEST, code);
  }
}

// ─── Prisma Error Codes (inline — avoids Prisma namespace import issues) ──────

const PRISMA_UNIQUE_VIOLATION = 'P2002';
const PRISMA_NOT_FOUND = 'P2025';

interface PrismaKnownError extends Error {
  code: string;
  meta?: { target?: string[] };
  clientVersion?: string;
}

function isPrismaKnownError(err: unknown): err is PrismaKnownError {
  return (
    err instanceof Error &&
    'code' in err &&
    'clientVersion' in err &&
    typeof (err as PrismaKnownError).code === 'string'
  );
}

function isPrismaValidationError(err: unknown): err is Error {
  return (
    err instanceof Error &&
    err.constructor.name === 'PrismaClientValidationError'
  );
}

// ─── Global Error Handler Middleware ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  // ── Operational App Errors ────────────────────────────────────────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Operational error', {
        message: err.message,
        code: err.code,
        stack: err.stack,
        path: req.path,
        method: req.method,
      });
    } else {
      logger.warn('Client error', {
        message: err.message,
        code: err.code,
        path: req.path,
        method: req.method,
      });
    }

    return sendError(
      res,
      err.message,
      err.statusCode as Parameters<typeof sendError>[2],
      err.code as Parameters<typeof sendError>[3],
      err.details
    );
  }

  // ── Zod Validation Errors ─────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));

    return sendError(
      res,
      'Validation failed',
      HttpStatus.UNPROCESSABLE_ENTITY,
      ErrorCodes.VALIDATION_ERROR,
      details
    );
  }

  // ── JWT Errors ────────────────────────────────────────────────────────────
  if (err instanceof TokenExpiredError) {
    return sendError(res, 'Access token has expired', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_EXPIRED);
  }

  if (err instanceof JsonWebTokenError) {
    return sendError(res, 'Invalid access token', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_INVALID);
  }

  // ── Prisma Errors ─────────────────────────────────────────────────────────
  if (isPrismaKnownError(err)) {
    if (err.code === PRISMA_UNIQUE_VIOLATION) {
      const field = err.meta?.target?.join(', ') ?? 'field';
      return sendError(
        res,
        `A record with this ${field} already exists`,
        HttpStatus.CONFLICT,
        ErrorCodes.ALREADY_EXISTS
      );
    }

    if (err.code === PRISMA_NOT_FOUND) {
      return sendError(res, 'Record not found', HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND);
    }

    logger.error('Prisma known error', { code: err.code, message: err.message });
    return sendError(res, 'Database error', HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.DATABASE_ERROR);
  }

  if (isPrismaValidationError(err)) {
    logger.error('Prisma validation error', { message: err.message });
    return sendError(res, 'Invalid database query', HttpStatus.BAD_REQUEST, ErrorCodes.INVALID_PAYLOAD);
  }

  // ── Multer Errors (file upload) ───────────────────────────────────────────
  const unknownErr = err as Error & { code?: string };
  if (unknownErr.name === 'MulterError') {
    const message =
      unknownErr.code === 'LIMIT_FILE_SIZE'
        ? 'File too large. Maximum size is 5MB'
        : 'File upload error';
    return sendError(res, message, HttpStatus.BAD_REQUEST, ErrorCodes.INVALID_PAYLOAD);
  }

  // ── Unknown / Unexpected Errors ───────────────────────────────────────────
  logger.error('Unexpected error', {
    message: unknownErr.message,
    stack: unknownErr.stack,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.userId,
  });

  const isDev = process.env.NODE_ENV === 'development';
  return sendError(
    res,
    isDev ? unknownErr.message : 'An unexpected error occurred',
    HttpStatus.INTERNAL_SERVER_ERROR,
    ErrorCodes.INTERNAL_ERROR,
    isDev ? unknownErr.stack : undefined
  );
}
