import { createHash } from 'crypto';
import { logger } from '../middleware/logger';
import { PaymentRequest } from '../types';

const getRedisClient = () => {
  // This module is only used in runtime paths that have initialized Redis.
  // Unit tests exercise the hash/logic behavior without requiring a live Redis connection.
  return require('../config/redis').getRedisClient();
};

const IDEMPOTENCY_TTL = 86400; // 24 hours in seconds

const generatePayloadHash = (payload: PaymentRequest): string => {
  return createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
};

export const getIdempotencyManager = () => ({
  generatePayloadHash,

  checkAndSetIdempotency: async (
    transactionId: string,
    payload: PaymentRequest,
  ): Promise<{ exists: boolean; conflict: boolean }> => {
    const redis = getRedisClient();
    const idempotencyKey = `payment:idempotency:${transactionId}`;
    const payloadHashKey = `${idempotencyKey}:payload`;

    try {
      const existing = await redis.exists(idempotencyKey);

      if (existing) {
        const existingPayloadHash = await redis.get(payloadHashKey);
        const currentPayloadHash = generatePayloadHash(payload);

        if (existingPayloadHash !== currentPayloadHash) {
          logger.warn(
            {
              transactionId,
              existing: existingPayloadHash,
              current: currentPayloadHash,
            },
            'Payload mismatch for transaction ID',
          );

          return { exists: true, conflict: true };
        }

        logger.info(
          { transactionId },
          'Duplicate transaction ID with matching payload',
        );

        return { exists: true, conflict: false };
      }

      const payloadHash = generatePayloadHash(payload);

      await redis.setEx(
        idempotencyKey,
        IDEMPOTENCY_TTL,
        JSON.stringify(payload),
      );

      await redis.setEx(
        payloadHashKey,
        IDEMPOTENCY_TTL,
        payloadHash,
      );

      return { exists: false, conflict: false };
    } catch (error) {
      logger.error(
        { transactionId, error },
        'Idempotency check failed',
      );

      throw error;
    }
  },

  getIdempotencyPayload: async (
    transactionId: string,
  ): Promise<PaymentRequest | null> => {
    const redis = getRedisClient();
    const idempotencyKey = `payment:idempotency:${transactionId}`;

    try {
      const cached = await redis.get(idempotencyKey);

      return cached ? JSON.parse(cached) as PaymentRequest : null;
    } catch (error) {
      logger.error(
        { transactionId, error },
        'Failed to retrieve cached idempotency payload',
      );

      return null;
    }
  },
});