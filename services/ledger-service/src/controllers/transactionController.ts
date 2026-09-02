import { Request, Response, NextFunction } from 'express';
import { getTransactionRepository } from '../repositories/transactionRepository';
import { getUserRepository } from '../repositories/userRepository';
import { sendErrorResponse, sendSuccessResponse } from '../utils/errorResponse';
import { logger } from '../middleware/logger';
import { TransactionHistoryResponse } from '../types';

export const getTransactionHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string | undefined;

    if (!userId) {
      return sendErrorResponse(
        res,
        400,
        'INVALID_REQUEST',
        'userId is required',
        null,
      );
    }

    // Verify user exists
    const userRepo = getUserRepository();
    const user = await userRepo.findById(userId);

    if (!user) {
      logger.warn({ userId }, 'User not found');

      return sendErrorResponse(
        res,
        404,
        'USER_NOT_FOUND',
        'User not found',
        null,
      );
    }

    // Fetch transactions
    const transactionRepo = getTransactionRepository();

    const { transactions, total } =
      await transactionRepo.findByUserIdAsSenderOrReceiver(
        userId,
        page,
        limit,
        status,
      );

    const response: TransactionHistoryResponse = {
      data: transactions.map((transaction: any) => ({
        id: transaction.id,
        transactionId: transaction.transactionId,
        senderId: transaction.senderId,
        receiverId: transaction.receiverId,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
        status: transaction.status as 'PENDING' | 'COMPLETED' | 'FAILED',
        failureReason: transaction.failureReason,
        createdAt: transaction.createdAt.toISOString(),
        completedAt: transaction.completedAt
          ? transaction.completedAt.toISOString()
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };

    logger.info(
      { userId, page, limit, total },
      'Transaction history retrieved',
    );

    return sendSuccessResponse(res, 200, response);
  } catch (error) {
    return next(error);
  }
};