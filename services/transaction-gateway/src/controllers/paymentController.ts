import { Request, Response, NextFunction } from 'express';
import { validatePaymentRequest } from '../validators/paymentValidator';
import { getPaymentService, PaymentServiceError } from '../services/paymentService';
import { sendErrorResponse, sendSuccessResponse } from '../utils/errorResponse';
import { logger } from '../middleware/logger';
import { PaymentResponse } from '../types';

export const postPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const request = validatePaymentRequest(req.body);
    const paymentService = getPaymentService();

    const transaction = await paymentService.processPayment(request);

    const response: PaymentResponse = {
      transactionId: transaction.transactionId,
      status: transaction.status as 'PENDING' | 'COMPLETED' | 'FAILED',
      senderId: transaction.senderId,
      receiverId: transaction.receiverId,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      createdAt: transaction.createdAt.toISOString(),
    };

    logger.info(
      { transactionId: transaction.transactionId },
      'Payment request processed successfully',
    );

    return sendSuccessResponse(res, 202, response);
  } catch (error) {
    const err = error as PaymentServiceError | Error;

    if ('statusCode' in err && 'code' in err) {
      const serviceError = err as PaymentServiceError;
      return sendErrorResponse(
        res,
        serviceError.statusCode,
        serviceError.code,
        serviceError.message,
        serviceError.details || null,
      );
    }

    return next(error);
  }
};
