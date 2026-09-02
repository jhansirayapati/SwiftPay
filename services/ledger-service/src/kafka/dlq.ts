import { getKafkaProducer } from '../config/kafka';
import { logger } from '../middleware/logger';

export const publishDlqMessage = async ({
  topic,
  originalEventId,
  eventType,
  transactionId,
  retryCount,
  error,
  originalPayload,
}: {
  topic: string;
  originalEventId?: string;
  eventType: string;
  transactionId?: string;
  retryCount: number;
  error: string;
  originalPayload?: Record<string, unknown>;
}): Promise<void> => {
  const producer = getKafkaProducer();

  const dlqEvent = {
    eventId: originalEventId ?? `dlq-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    originalEventId,
    eventType,
    transactionId,
    retryCount,
    error,
    timestamp: new Date().toISOString(),
    ...(originalPayload ? { originalPayload } : {}),
  };

  await producer.send({
    topic,
    messages: [{
      key: transactionId ?? originalEventId ?? 'dlq',
      value: JSON.stringify(dlqEvent),
      headers: {
        'event-type': Buffer.from(eventType),
        'dlq-original-event-id': originalEventId ? Buffer.from(originalEventId) : undefined,
        'retry-count': Buffer.from(String(retryCount)),
      },
    }],
  });

  logger.error({ topic, originalEventId, transactionId, retryCount, error }, 'Payment event sent to DLQ');
};
