import { Decimal } from '@prisma/client/runtime/library';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { analyticsRepository } from '../src/repositories/analyticsRepository';

jest.mock('@prisma/client', () => {
  const mockUpsert = jest.fn() as jest.Mock<any>;
  const mockAggregate = jest.fn() as jest.Mock<any>;
  const mockGroupBy = jest.fn() as jest.Mock<any>;

  return {
    PrismaClient: jest.fn(() => ({
      analyticsEvent: {
        upsert: mockUpsert,
        aggregate: mockAggregate,
        groupBy: mockGroupBy,
      },
    })),
    __mockControls: {
      mockUpsert,
      mockAggregate,
      mockGroupBy,
    },
  };
});

describe('Analytics worker', () => {
  const { __mockControls } = jest.requireMock('@prisma/client') as {
    __mockControls: {
      mockUpsert: jest.Mock<any>;
      mockAggregate: jest.Mock<any>;
      mockGroupBy: jest.Mock<any>;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores a completed payment for analytics', async () => {
    __mockControls.mockUpsert.mockResolvedValue({
      transactionId: 'analytics_001',
      senderId: 'user_001',
      receiverId: 'user_002',
      amount: new Decimal('250.00'),
      currency: 'INR',
    });

    const record = await analyticsRepository.upsertCompletedPayment({
      transactionId: 'analytics_001',
      senderId: 'user_001',
      receiverId: 'user_002',
      amount: new Decimal('250.00'),
      currency: 'INR',
    });

    expect(__mockControls.mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { transactionId: 'analytics_001' },
        create: expect.objectContaining({
          transactionId: 'analytics_001',
        }),
      }),
    );

    expect(record.transactionId).toBe('analytics_001');
    expect(record.currency).toBe('INR');
  });

  it('summarizes transaction volume by currency', async () => {
    __mockControls.mockAggregate.mockResolvedValue({
      _count: { transactionId: 2 },
      _sum: { amount: new Decimal('350.00') },
    });

    __mockControls.mockGroupBy.mockResolvedValue([
      {
        currency: 'INR',
        _count: { transactionId: 2 },
        _sum: { amount: new Decimal('350.00') },
      },
    ]);

    const volume = await analyticsRepository.getVolume();

    expect(__mockControls.mockAggregate).toHaveBeenCalled();
    expect(__mockControls.mockGroupBy).toHaveBeenCalled();
    expect(volume.totalTransactions).toBe(2);
    expect(volume.currencies.INR.transactions).toBe(2);
    expect(volume.totalVolume).toBe('350.00');
  });
});