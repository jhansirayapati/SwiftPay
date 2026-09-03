import { Decimal } from '@prisma/client/runtime/library';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { getLedgerService } from '../src/services/ledgerService';

const mockTx = {
  transaction: {
    findUnique: jest.fn<
      (...args: any[]) => Promise<Record<string, unknown> | null>
    >(),
    update: jest.fn<
      (...args: any[]) => Promise<Record<string, unknown>>
    >(),
  },
  user: {
    update: jest.fn<
      (...args: any[]) => Promise<Record<string, unknown>>
    >(),
  },
  $queryRaw: jest.fn<
    (...args: any[]) => Promise<unknown[]>
  >(),
};

jest.mock('../src/repositories/transactionRepository', () => ({
  prismaClient: {
    $transaction: async (callback: (tx: typeof mockTx) => Promise<'COMPLETED' | 'FAILED' | 'ALREADY_PROCESSED'>) => callback(mockTx),
  },
}));

jest.mock('../src/redis/client', () => ({
  invalidateUserBalanceCache: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

describe('Ledger service integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks successful payment as completed', async () => {
    const ledgerService = getLedgerService();
    const senderId = 'user_001';
    const receiverId = 'user_002';
    const transactionId = 'ledger_success_001';

    mockTx.transaction.findUnique.mockResolvedValue({
      id: 'txn_1',
      transactionId,
      senderId,
      receiverId,
      amount: new Decimal('100.00'),
      status: 'PENDING',
    });
    mockTx.$queryRaw.mockResolvedValue([{ id: senderId, balance: 1000 }]);
    mockTx.user.update.mockResolvedValue({});
    mockTx.transaction.update.mockResolvedValue({
      transactionId,
      status: 'COMPLETED',
    });

    const result = await ledgerService.processPaymentTransfer({
      transactionId,
      senderId,
      receiverId,
      amount: new Decimal('100.00'),
    });

    expect(result).toBe('COMPLETED');
    expect(mockTx.user.update).toHaveBeenCalledTimes(2);
    expect(mockTx.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { transactionId },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('fails when there are insufficient funds', async () => {
    const ledgerService = getLedgerService();
    const senderId = 'user_003';
    const receiverId = 'user_002';
    const transactionId = 'ledger_fail_001';

    mockTx.transaction.findUnique.mockResolvedValue({
      id: 'txn_2',
      transactionId,
      senderId,
      receiverId,
      amount: new Decimal('999999.99'),
      status: 'PENDING',
    });
    mockTx.$queryRaw.mockResolvedValue([{ id: senderId, balance: 50 }]);
    mockTx.transaction.update.mockResolvedValue({
      transactionId,
      status: 'FAILED',
      failureReason: 'INSUFFICIENT_FUNDS',
    });

    const result = await ledgerService.processPaymentTransfer({
      transactionId,
      senderId,
      receiverId,
      amount: new Decimal('999999.99'),
    });

    expect(result).toBe('FAILED');
    expect(mockTx.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { transactionId },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });
});
