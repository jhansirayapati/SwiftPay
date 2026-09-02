import { Decimal } from '@prisma/client/runtime/library';
import { getTransactionRepository } from '../repositories/transactionRepository';
import { getUserRepository } from '../repositories/userRepository';
import { getIdempotencyManager } from '../redis/client';
import { getKafkaProducerHelper } from '../kafka/producer';
import { logger } from '../middleware/logger';
import { PaymentRequest } from '../types';

export interface PaymentServiceError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

class PaymentServiceException extends Error implements PaymentServiceError {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, statusCode: number = 500, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'PaymentServiceException';
  }
}

export const getPaymentService = () => ({
  processPayment: async (request: PaymentRequest) => {
    const { transaction_id, sender_id, receiver_id, amount, currency } = request;

    const transactionRepo = getTransactionRepository();
    const userRepo = getUserRepository();
    const idempotencyMgr = getIdempotencyManager();
    const kafkaProducer = getKafkaProducerHelper();

    logger.info(
      { transactionId: transaction_id, senderId: sender_id, receiverId: receiver_id, amount },
      'Processing payment',
    );

    // 1. Idempotency check
    const { exists, conflict } = await idempotencyMgr.checkAndSetIdempotency(transaction_id, request);

    if (conflict) {
      logger.warn({ transactionId: transaction_id }, 'Duplicate transaction ID with conflicting payload');
      throw new PaymentServiceException(
        'DUPLICATE_TRANSACTION_CONFLICT',
        'Transaction ID already exists with different payload',
        409,
      );
    }

    if (exists) {
      // Return cached result for duplicate request with same payload
      const cached = await transactionRepo.findByTransactionId(transaction_id);
      if (cached) {
        logger.info({ transactionId: transaction_id }, 'Returning cached transaction result');
        return cached;
      }
    }

    // 2. Verify sender exists
    const sender = await userRepo.findById(sender_id);
    if (!sender) {
      logger.warn({ senderId: sender_id }, 'Sender not found');
      throw new PaymentServiceException('SENDER_NOT_FOUND', 'Sender not found', 404);
    }

    // 3. Verify receiver exists
    const receiver = await userRepo.findById(receiver_id);
    if (!receiver) {
      logger.warn({ receiverId: receiver_id }, 'Receiver not found');
      throw new PaymentServiceException('RECEIVER_NOT_FOUND', 'Receiver not found', 404);
    }

    // 4. Verify currency is supported (basic check)
    if (currency !== 'INR') {
      logger.warn({ currency }, 'Unsupported currency');
      throw new PaymentServiceException(
        'UNSUPPORTED_CURRENCY',
        `Currency ${currency} not supported`,
        400,
      );
    }

    // 5. Check sender balance
    const amountDecimal = new Decimal(amount);
    if (sender.balance.lessThan(amountDecimal)) {
      logger.warn(
        {
          transactionId: transaction_id,
          senderId: sender_id,
          balance: sender.balance.toString(),
          requestedAmount: amountDecimal.toString(),
        },
        'Insufficient balance',
      );
      throw new PaymentServiceException(
        'INSUFFICIENT_FUNDS',
        'Insufficient balance',
        402,
      );
    }

    // 6. Create transaction with PENDING status
    const transaction = await transactionRepo.create({
      transactionId: transaction_id,
      senderId: sender_id,
      receiverId: receiver_id,
      amount: amountDecimal,
      currency,
    });

    // 7. Publish PaymentInitiated event to Kafka
    await kafkaProducer.publishPaymentInitiated({
      transactionId: transaction_id,
      senderId: sender_id,
      receiverId: receiver_id,
      amount: amountDecimal,
      currency,
    });

    logger.info(
      {
        transactionId: transaction_id,
        status: transaction.status,
      },
      'Payment created and initiated',
    );

    return transaction;
  },
});
