import { Response } from 'express';
import { ErrorResponse } from '../types';

export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details: Record<string, unknown> | null = null,
): void => {
  const response: ErrorResponse = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(response);
};

export const sendSuccessResponse = (res: Response, statusCode: number, data: any): void => {
  res.status(statusCode).json(data);
};
