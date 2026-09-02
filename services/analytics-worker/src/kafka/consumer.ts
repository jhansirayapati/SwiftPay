import { getKafkaConsumer } from '../config/kafka';
import { analyticsRepository } from '../repositories/analyticsRepository';
import { logger } from '../middleware/logger';
import { Decimal } from '@prisma/client/runtime/library';

export const startAnalyticsConsumer = async (): Promise<void> => {
  const consumer = getKafkaConsumer();

  await consumer.subscribe({
    topic: 'swiftpay.payment.completed',
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message, topic, partition }) => {
      if (!message.value) {
        logger.warn({ topic, partition }, 'Received analytics message without payload');
        return;
      }

      const event = JSON.parse(message.value.toString());
      const requestId = message.headers?.['x-request-id'] ? message.headers['x-request-id'].toString() : undefined;

      try {
        if (!event.transactionId || !event.senderId || !event.receiverId || !event.amount) {
          logger.warn({ event, requestId }, 'Skipping invalid analytics event');
          return;
        }

        await analyticsRepository.upsertCompletedPayment({
          transactionId: event.transactionId,
          senderId: event.senderId,
          receiverId: event.receiverId,
          amount: new Decimal(event.amount),
          currency: event.currency || 'INR',
        });

        logger.info({ transactionId: event.transactionId, requestId, eventId: event.eventId }, 'Analytics event stored');
      } catch (error) {
        logger.error({ error, requestId, transactionId: event.transactionId }, 'Failed to process analytics event');
      }
    },
  });
};
