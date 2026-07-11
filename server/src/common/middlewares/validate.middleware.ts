import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Zod schema validation middleware factory.
 *
 * Usage:
 *   router.post('/login', validate(sendOtpSchema), authController.sendOtp);
 *   router.get('/products', validate(productQuerySchema, 'query'), catalog.list);
 *
 * @param schema   - The Zod schema to validate against
 * @param target   - The part of the request to validate: 'body' (default), 'query', or 'params'
 */
export function validate(
  schema: ZodSchema,
  target: ValidationTarget = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const zodError = result.error as ZodError;
      const details = zodError.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));

      sendError(
        res,
        'Validation failed',
        HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCodes.VALIDATION_ERROR,
        details
      );
      return;
    }

    // Replace the target with the parsed (and coerced) data
    if (target === 'body') {
      req.body = result.data;
    } else if (target === 'query') {
      // Express types query as ParsedQs, safe to cast
      req.query = result.data as typeof req.query;
    } else if (target === 'params') {
      req.params = result.data as typeof req.params;
    }

    next();
  };
}
