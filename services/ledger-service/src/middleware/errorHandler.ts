import { Express, Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { sendErrorResponse } from '../utils/errorResponse';

export const setupErrorHandling = (app: Express): void => {
  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err.statusCode) {
      logger.error({ error: err.message }, 'HTTP error');
      return sendErrorResponse(res, err.statusCode, err.code, err.message, err.details || null);
    }

    logger.error({ error: err }, 'Unexpected error');

    return sendErrorResponse(
      res,
      500,
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      null,
    );
  });

  // 404 handler
  app.use((_req: Request, res: Response, _next: NextFunction) => {
    return sendErrorResponse(res, 404, 'NOT_FOUND', 'Endpoint not found', null);
  });
};
