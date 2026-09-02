import { Decimal } from '@prisma/client/runtime/library';
import { prismaClient } from '../repositories/transactionRepository';
import { logger } from '../middleware/logger';
import { invalidateUserBalanceCache } from '../redis/client';

export const getLedgerService = () => ({
  /**
   * Atomically process a payment: debit sender, credit receiver.
   * 
   * CRITICAL: This must be fully atomic. Either both debit and credit succeed,
   * or the entire transaction rolls back.
   */
  processPaymentTransfer: async (data: {
    transactionId: string;
    senderId: string;
    receiverId: string;
    amount: Decimal;
  }): Promise<'COMPLETED' | 'FAILED' | 'ALREADY_PROCESSED'> => {
    const { transactionId, senderId, receiverId, amount } = data;

    try {
      // Use Prisma transaction for atomicity
      const result = await prismaClient.$transaction(async (tx) => {
        // 1. Fetch transaction - verify it exists and is PENDING
        const transaction = await tx.transaction.findUnique({
          where: { transactionId },
        });

        if (!transaction) {
          logger.error({ transactionId }, 'Transaction not found');
          throw new Error('Transaction not found');
        }

        if (transaction.status !== 'PENDING') {
          logger.warn(
            { transactionId, currentStatus: transaction.status },
            'Transaction is not in PENDING state',
          );
          return 'ALREADY_PROCESSED';
        }

        // 2. Load sender balance with row-level lock (FOR UPDATE)
        // Using raw query because Prisma doesn't directly support FOR UPDATE
        const senderRows = await tx.$queryRaw<
          Array<{ id: string; balance: number }>
        >`SELECT id, balance FROM "User" WHERE id = ${senderId} FOR UPDATE`;

        if (!senderRows || senderRows.length === 0) {
          logger.error({ senderId }, 'Sender not found');
          throw new Error('Sender not found');
        }

        const senderBalance = new Decimal(senderRows[0].balance.toString());

        // 3. Verify sufficient funds
        if (senderBalance.lessThan(amount)) {
          logger.warn(
            {
              transactionId,
              senderId,
              balance: senderBalance.toString(),
              requestedAmount: amount.toString(),
            },
            'Insufficient balance',
          );

          // Update transaction to FAILED
          await tx.transaction.update({
            where: { transactionId },
            data: {
              status: 'FAILED',
              failureReason: 'INSUFFICIENT_FUNDS',
              completedAt: new Date(),
            },
          });

          return 'FAILED';
        }

        // 4. Debit sender
        await tx.user.update({
          where: { id: senderId },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });

        logger.debug(
          { senderId, amount: amount.toString() },
          'Sender debited',
        );

        // 5. Credit receiver
        await tx.user.update({
          where: { id: receiverId },
          data: {
            balance: {
              increment: amount,
            },
          },
        });

        logger.debug(
          { receiverId, amount: amount.toString() },
          'Receiver credited',
        );

        // 6. Mark transaction as COMPLETED
        await tx.transaction.update({
          where: { transactionId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        logger.info(
          {
            transactionId,
            senderId,
            receiverId,
            amount: amount.toString(),
          },
          'Payment transfer completed successfully',
        );

        return 'COMPLETED';
      });

      if (result === 'COMPLETED') {
        await invalidateUserBalanceCache(senderId);
        await invalidateUserBalanceCache(receiverId);
      }

      return result;
    } catch (error) {
      logger.error(
        {
          transactionId,
          senderId,
          receiverId,
          amount: amount.toString(),
          error,
        },
        'Payment transfer failed',
      );

      throw error;
    }
  },
});
