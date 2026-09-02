import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../middleware/logger';

const prisma = new PrismaClient();

export const getTransactionRepository = () => ({
  create: async (data: {
    transactionId: string;
    senderId: string;
    receiverId: string;
    amount: Decimal;
    currency: string;
  }) => {
    try {
      const transaction = await prisma.transaction.create({
        data: {
          transactionId: data.transactionId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          amount: data.amount,
          currency: data.currency,
          status: 'PENDING',
        },
      });
      logger.info(
        {
          transactionId: transaction.transactionId,
          senderId: transaction.senderId,
          receiverId: transaction.receiverId,
          amount: transaction.amount.toString(),
        },
        'Transaction created',
      );
      return transaction;
    } catch (error) {
      logger.error({ data, error }, 'Failed to create transaction');
      throw error;
    }
  },

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
});

export const prismaClient = prisma;
