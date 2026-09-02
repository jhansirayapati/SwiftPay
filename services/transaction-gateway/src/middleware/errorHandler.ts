import { Express, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';
import { sendErrorResponse } from '../utils/errorResponse';

export const setupErrorHandling = (app: Express): void => {
  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const transactionId = (_req as any).transactionId || 'unknown';

    if (err instanceof ZodError) {
      const details = err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));

      logger.error(
        {
          transactionId,
          error: details,
        },
        'Validation error',
      );

      return sendErrorResponse(
        res,
        400,
        'VALIDATION_ERROR',
        'Invalid payment request',
        { errors: details },
      );
    }

    if (err.statusCode) {
      logger.error({ transactionId, error: err.message }, 'HTTP error');
      return sendErrorResponse(res, err.statusCode, err.code, err.message, err.details || null);
    }

    logger.error({ transactionId, error: err }, 'Unexpected error');

    return sendErrorResponse(
      res,
      500,
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      null,
    );
  });

  // 404 handler
  app.use((_, res: Response, _next: NextFunction) => {
    return sendErrorResponse(res, 404, 'NOT_FOUND', 'Endpoint not found', null);
  });
};
