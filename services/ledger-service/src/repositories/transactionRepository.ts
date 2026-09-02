import { PrismaClient } from '@prisma/client';
import { logger } from '../middleware/logger';

const prisma = new PrismaClient();

type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

type TransactionWhereInput = {
  OR?: Array<{
    senderId?: string;
    receiverId?: string;
  }>;
  senderId?: string;
  receiverId?: string;
  status?: TransactionStatus;
};

export const getTransactionRepository = () => ({
  findByTransactionId: async (transactionId: string) => {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { transactionId },
      });

      return transaction;
    } catch (error) {
      logger.error({ transactionId, error }, 'Failed to fetch transaction');
      throw error;
    }
  },

  findById: async (id: string) => {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id },
      });

      return transaction;
    } catch (error) {
      logger.error({ id, error }, 'Failed to fetch transaction by id');
      throw error;
    }
  },

  findBySenderId: async (
    senderId: string,
    page: number = 1,
    limit: number = 20,
  ) => {
    try {
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where: { senderId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),

        prisma.transaction.count({
          where: { senderId },
        }),
      ]);

      return {
        transactions,
        total,
      };
    } catch (error) {
      logger.error(
        { senderId, error },
        'Failed to fetch transactions by sender',
      );
      throw error;
    }
  },

  findByReceiverId: async (
    receiverId: string,
    page: number = 1,
    limit: number = 20,
  ) => {
    try {
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where: { receiverId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),

        prisma.transaction.count({
          where: { receiverId },
        }),
      ]);

      return {
        transactions,
        total,
      };
    } catch (error) {
      logger.error(
        { receiverId, error },
        'Failed to fetch transactions by receiver',
      );
      throw error;
    }
  },

  findByUserIdAsSenderOrReceiver: async (
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
  ) => {
    try {
      const skip = (page - 1) * limit;

      const where: TransactionWhereInput = {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      };

      if (status) {
        where.status = status as TransactionStatus;
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),

        prisma.transaction.count({
          where,
        }),
      ]);

      return {
        transactions,
        total,
      };
    } catch (error) {
      logger.error(
        { userId, error },
        'Failed to fetch user transactions',
      );
      throw error;
    }
  },

  updateStatus: async (
    transactionId: string,
    status: 'COMPLETED' | 'FAILED',
    failureReason?: string,
  ) => {
    try {
      const data: {
        status: 'COMPLETED' | 'FAILED';
        completedAt: Date;
        failureReason?: string;
      } = {
        status,
        completedAt: new Date(),
      };

      if (failureReason) {
        data.failureReason = failureReason;
      }

      const transaction = await prisma.transaction.update({
        where: { transactionId },
        data,
      });

      logger.info(
        {
          transactionId,
          status,
          failureReason,
        },
        'Transaction status updated',
      );

      return transaction;
    } catch (error) {
      logger.error(
        {
          transactionId,
          status,
          error,
        },
        'Failed to update transaction status',
      );

      throw error;
    }
  },
});

export const prismaClient = prisma;