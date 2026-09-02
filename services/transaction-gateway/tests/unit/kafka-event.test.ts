import { describe, it, expect } from '@jest/globals';
import { getKafkaProducerHelper } from '../../src/kafka/producer';
import { Decimal } from '@prisma/client/runtime/library';

describe('Kafka event metadata', () => {
  it('should include event metadata and retry details in initiated events', async () => {
    const helper = getKafkaProducerHelper();
    const event = helper.buildPaymentInitiatedEvent({
      transactionId: 'txn_123',
      senderId: 'user_001',
      receiverId: 'user_002',
      amount: new Decimal('100.00'),
      currency: 'INR',
      retryCount: 2,
      originalEventId: 'evt_origin_001',
    });

    expect(event.eventId).toBeTruthy();
    expect(event.transactionId).toBe('txn_123');
    expect(event.amount).toBe('100.00');
    expect(event.retryCount).toBe(2);
    expect(event.originalEventId).toBe('evt_origin_001');
    expect(event.eventType).toBe('PaymentInitiated');
  });
});
