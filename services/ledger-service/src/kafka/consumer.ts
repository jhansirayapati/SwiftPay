import { Decimal } from '@prisma/client/runtime/library';
import { getKafkaConsumer, getKafkaProducer } from '../config/kafka';
import { getLedgerService } from '../services/ledgerService';
import { getTransactionRepository } from '../repositories/transactionRepository';
import { logger } from '../middleware/logger';
import { PaymentInitiatedEvent } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { publishDlqMessage } from './dlq';
import { config } from '../config/env';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelayMs = (retryCount: number): number => {
  const backoff = config.kafka.retryInitialDelayMs * Math.pow(2, Math.max(0, retryCount));
  return Math.min(backoff, config.kafka.retryMaxDelayMs);
};

export const getPaymentConsumer = () => ({
  subscribe: async (): Promise<void> => {
    const consumer = getKafkaConsumer();

    await consumer.subscribe({
      topic: 'swiftpay.payment.initiated',
      fromBeginning: false,
    });

    logger.info('Subscribed to swiftpay.payment.initiated topic');
  },

  processMessages: async (): Promise<void> => {
    const consumer = getKafkaConsumer();
    const ledgerService = getLedgerService();
    const transactionRepo = getTransactionRepository();
    const producer = getKafkaProducer();

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const headers = message.headers ?? {};
        const retryCount = Number(headers['retry-count']?.toString() ?? '0');
        const originalEventId = headers['original-event-id']?.toString();
        const rawPayload = message.value ? message.value.toString() : '';
        let event: PaymentInitiatedEvent | null = null;

        try {
          if (!message.value) {
            logger.warn(
              { topic, partition },
              'Received message with no value',
            );
            return;
          }

          event = JSON.parse(rawPayload) as PaymentInitiatedEvent;

          logger.info(
            {
              eventId: event.eventId,
              transactionId: event.transactionId,
              retryCount,
              topic,
            },
            'Processing PaymentInitiated event',
          );

          const transaction = await transactionRepo.findByTransactionId(
            event.transactionId,
          );

          if (!transaction) {
            logger.error(
              { transactionId: event.transactionId },
              'Transaction not found',
            );
            return;
          }

          if (transaction.status !== 'PENDING') {
            logger.warn(
              {
                transactionId: event.transactionId,
                currentStatus: transaction.status,
              },
              'Transaction already processed, ignoring duplicate event',
            );
            return;
          }

          const amount = new Decimal(event.amount);
          const result = await ledgerService.processPaymentTransfer({
            transactionId: event.transactionId,
            senderId: event.senderId,
            receiverId: event.receiverId,
            amount,
          });

          if (result === 'COMPLETED') {
            const completedEvent = {
              eventId: uuidv4(),
              eventType: 'PaymentCompleted',
              transactionId: event.transactionId,
              senderId: event.senderId,
              receiverId: event.receiverId,
              amount: event.amount,
              currency: event.currency,
              timestamp: new Date().toISOString(),
            };

            await producer.send({
              topic: 'swiftpay.payment.completed',
              messages: [
                {
                  key: event.transactionId,
                  value: JSON.stringify(completedEvent),
                  headers: {
                    'event-type': Buffer.from('PaymentCompleted'),
                    'event-id': Buffer.from(completedEvent.eventId),
                  },
                },
              ],
            });

            logger.info(
              {
                transactionId: event.transactionId,
                eventId: completedEvent.eventId,
              },
              'PaymentCompleted event published',
            );
            return;
          }

          if (result === 'FAILED') {
            const failedEvent = {
              eventId: uuidv4(),
              eventType: 'PaymentFailed',
              transactionId: event.transactionId,
              senderId: event.senderId,
              receiverId: event.receiverId,
              amount: event.amount,
              currency: event.currency,
              reason: 'INSUFFICIENT_FUNDS',
              timestamp: new Date().toISOString(),
            };

            await producer.send({
              topic: 'swiftpay.payment.failed',
              messages: [
                {
                  key: event.transactionId,
                  value: JSON.stringify(failedEvent),
                  headers: {
                    'event-type': Buffer.from('PaymentFailed'),
                    'event-id': Buffer.from(failedEvent.eventId),
                  },
                },
              ],
            });

            logger.info(
              {
                transactionId: event.transactionId,
                eventId: failedEvent.eventId,
                reason: failedEvent.reason,
              },
              'PaymentFailed event published',
            );
            return;
          }

          logger.warn({ transactionId: event.transactionId }, 'Ledger returned ALREADY_PROCESSED');
          return;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown Kafka processing error';
          const nextRetryCount = retryCount + 1;
          const transactionId = event?.transactionId ?? (rawPayload ? (JSON.parse(rawPayload) as Partial<PaymentInitiatedEvent>)?.transactionId : undefined);

          logger.error(
            { topic, partition, transactionId, retryCount, error: errorMessage },
            'Error processing Kafka message',
          );

          if (nextRetryCount >= config.kafka.retryAttempts) {
            await publishDlqMessage({
              topic: config.kafka.dlqTopic,
              originalEventId: event?.eventId ?? originalEventId,
              eventType: 'PaymentInitiated',
              transactionId,
              retryCount: nextRetryCount,
              error: errorMessage,
              originalPayload: event ?? (rawPayload ? JSON.parse(rawPayload) : undefined),
            });
            return;
          }

          const delayMs = getRetryDelayMs(retryCount);
          logger.warn({ transactionId, retryCount, nextRetryCount, delayMs }, 'Retrying PaymentInitiated event with exponential backoff');
          await sleep(delayMs);
        }
      },
    });
  },
});
