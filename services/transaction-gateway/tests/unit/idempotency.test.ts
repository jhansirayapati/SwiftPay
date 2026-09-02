import { describe, it, expect } from '@jest/globals';
import { getIdempotencyManager } from '../../src/redis/client';

describe('Idempotency Manager', () => {
  describe('generatePayloadHash', () => {
    it('should generate consistent hash for same payload', () => {
      const manager = getIdempotencyManager();
      const payload = {
        transaction_id: 'txn_123',
        sender_id: 'user_001',
        receiver_id: 'user_002',
        amount: 500,
        currency: 'INR',
      };

      const hash1 = manager.generatePayloadHash(payload);
      const hash2 = manager.generatePayloadHash(payload);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it('should generate different hash for different payload', () => {
      const manager = getIdempotencyManager();
      const payload1 = {
        transaction_id: 'txn_123',
        sender_id: 'user_001',
        receiver_id: 'user_002',
        amount: 500,
        currency: 'INR',
      };

      const payload2 = {
        transaction_id: 'txn_123',
        sender_id: 'user_001',
        receiver_id: 'user_003', // Different receiver
        amount: 500,
        currency: 'INR',
      };

      const hash1 = manager.generatePayloadHash(payload1);
      const hash2 = manager.generatePayloadHash(payload2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
