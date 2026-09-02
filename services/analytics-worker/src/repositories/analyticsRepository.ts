import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../middleware/logger';

const prisma = new PrismaClient();

export const analyticsRepository = {
  upsertCompletedPayment: async (data: {
    transactionId: string;
    senderId: string;
    receiverId: string;
    amount: Decimal;
    currency: string;
  }) => {
    try {
      return await prisma.analyticsEvent.upsert({
        where: { transactionId: data.transactionId },
        update: {
          senderId: data.senderId,
          receiverId: data.receiverId,
          amount: data.amount,
          currency: data.currency,
          completedAt: new Date(),
        },
        create: {
          transactionId: data.transactionId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          amount: data.amount,
          currency: data.currency,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error({ data, error }, 'Failed to upsert analytics event');
      throw error;
    }
  },

  getVolume: async (filters?: { from?: string; to?: string }) => {
    const where = filters?.from || filters?.to
      ? {
          completedAt: {
            ...(filters?.from ? { gte: new Date(filters.from) } : {}),
            ...(filters?.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {};

    const [totals, currencyBreakdown] = await Promise.all([
      prisma.analyticsEvent.aggregate({
        where,
        _sum: { amount: true },
        _count: { transactionId: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ['currency'],
        where,
        _sum: { amount: true },
        _count: { transactionId: true },
      }),
    ]);

    const currencies = Object.fromEntries(
      currencyBreakdown.map((entry) => [
        entry.currency,
        {
          transactions: entry._count.transactionId ?? 0,
          volume: new Decimal((entry._sum.amount ?? new Decimal('0')).toString()).toFixed(2),
        },
      ]),
    );

    return {
      totalTransactions: totals._count.transactionId ?? 0,
      totalVolume: new Decimal((totals._sum.amount ?? new Decimal('0')).toString()).toFixed(2),
      currencies,
    };
  },
};

export const prismaClient = prisma;
