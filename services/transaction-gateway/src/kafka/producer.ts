import { v4 as uuidv4 } from 'uuid';
import { getKafkaProducer } from '../config/kafka';
import { logger } from '../middleware/logger';
import {
  PaymentInitiatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from '../types';
import { Decimal } from '@prisma/client/runtime/library';

const PAYMENT_INITIATED_TOPIC = 'swiftpay.payment.initiated';
const PAYMENT_COMPLETED_TOPIC = 'swiftpay.payment.completed';
const PAYMENT_FAILED_TOPIC = 'swiftpay.payment.failed';

export const getKafkaProducerHelper = () => ({
  buildPaymentInitiatedEvent: (data: {
    transactionId: string;
    senderId: string;
    receiverId: string;
    amount: Decimal;
    currency: string;
    retryCount?: number;
    originalEventId?: string;
  }): PaymentInitiatedEvent => ({
    eventId: uuidv4(),
    eventType: 'PaymentInitiated',
    transactionId: data.transactionId,
    senderId: data.senderId,
    receiverId: data.receiverId,
    amount: data.amount.toFixed(2),
    currency: data.currency,
    timestamp: new Date().toISOString(),
    ...(typeof data.retryCount === 'number' ? { retryCount: data.retryCount } : {}),
    ...(data.originalEventId ? { originalEventId: data.originalEventId } : {}),
  }),

  publishPaymentInitiated: async (data: {
    transactionId: string;
    senderId: string;
    receiverId: string;
    amount: Decimal;
    currency: string;
    retryCount?: number;
    originalEventId?: string;
  }): Promise<void> => {
    try {
      const producer = getKafkaProducer();
      const event = getKafkaProducerHelper().buildPaymentInitiatedEvent(data);

      await producer.send({
        topic: PAYMENT_INITIATED_TOPIC,
        messages: [
          {
            key: data.transactionId,
            value: JSON.stringify(event),
            headers: {
              'event-type': Buffer.from('PaymentInitiated'),
              'event-id': Buffer.from(event.eventId),
              'retry-count': Buffer.from(String(data.retryCount ?? 0)),
              ...(data.originalEventId ? { 'original-event-id': Buffer.from(data.originalEventId) } : {}),
            },
          },
        ],
      });

      logger.info(
        { transactionId: data.transactionId, eventId: event.eventId, retryCount: data.retryCount ?? 0 },
        'Payment initiated event published',
      );
    } catch (error) {
      logger.error({ data, error }, 'Failed to publish payment initiated event');
      throw error;
    }
  },

  publishPaymentCompleted: async (transactionId: string, senderId: string, receiverId: string, amount: Decimal, currency: string): Promise<void> => {
    try {
      const producer = getKafkaProducer();

      const event: PaymentCompletedEvent = {
        eventId: uuidv4(),
        eventType: 'PaymentCompleted',
        transactionId,
        senderId,
        receiverId,
        amount: amount.toFixed(2),
        currency,
        timestamp: new Date().toISOString(),
      };

      await producer.send({
        topic: PAYMENT_COMPLETED_TOPIC,
        messages: [
          {
            key: transactionId,
            value: JSON.stringify(event),
            headers: {
              'event-type': Buffer.from('PaymentCompleted'),
              'event-id': Buffer.from(event.eventId),
            },
          },
        ],
      });

      logger.info({ transactionId, eventId: event.eventId }, 'Payment completed event published');
    } catch (error) {
      logger.error({ transactionId, error }, 'Failed to publish payment completed event');
      throw error;
    }
  },

  publishPaymentFailed: async (transactionId: string, reason: string, senderId?: string, receiverId?: string, amount?: Decimal, currency?: string): Promise<void> => {
    try {
      const producer = getKafkaProducer();

      const event: PaymentFailedEvent = {
        eventId: uuidv4(),
        eventType: 'PaymentFailed',
        transactionId,
        senderId,
        receiverId,
        amount: amount ? amount.toFixed(2) : undefined,
        currency,
        reason,
        timestamp: new Date().toISOString(),
      };

      await producer.send({
        topic: PAYMENT_FAILED_TOPIC,
        messages: [
          {
            key: transactionId,
            value: JSON.stringify(event),
            headers: {
              'event-type': Buffer.from('PaymentFailed'),
              'event-id': Buffer.from(event.eventId),
            },
          },
        ],
      });

      logger.info({ transactionId, eventId: event.eventId, reason }, 'Payment failed event published');
    } catch (error) {
      logger.error({ transactionId, reason, error }, 'Failed to publish payment failed event');
      throw error;
    }
  },
});
