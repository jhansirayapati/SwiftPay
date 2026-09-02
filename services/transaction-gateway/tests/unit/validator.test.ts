import { describe, it, expect } from '@jest/globals';
import { validatePaymentRequest } from '../../src/validators/paymentValidator';
import { PaymentRequest } from '../../src/types';

describe('Payment Validator', () => {
  describe('validatePaymentRequest', () => {
    const validPayload: PaymentRequest = {
      transaction_id: 'txn_123',
      sender_id: 'user_001',
      receiver_id: 'user_002',
      amount: 500,
      currency: 'INR',
    };

    it('should accept valid payment request', () => {
      const result = validatePaymentRequest(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should reject request missing transaction_id', () => {
      const { transaction_id, ...payload } = validPayload;
      expect(() => validatePaymentRequest(payload)).toThrow();
    });

    it('should reject request missing sender_id', () => {
      const { sender_id, ...payload } = validPayload;
      expect(() => validatePaymentRequest(payload)).toThrow();
    });

    it('should reject request missing receiver_id', () => {
      const { receiver_id, ...payload } = validPayload;
      expect(() => validatePaymentRequest(payload)).toThrow();
    });

    it('should reject request missing amount', () => {
      const { amount, ...payload } = validPayload;
      expect(() => validatePaymentRequest(payload)).toThrow();
    });

    it('should reject request with zero amount', () => {
      expect(() =>
        validatePaymentRequest({
          ...validPayload,
          amount: 0,
        }),
      ).toThrow();
    });

    it('should reject request with negative amount', () => {
      expect(() =>
        validatePaymentRequest({
          ...validPayload,
          amount: -100,
        }),
      ).toThrow();
    });

    it('should reject request missing currency', () => {
      const { currency, ...payload } = validPayload;
      expect(() => validatePaymentRequest(payload)).toThrow();
    });

    it('should reject request with same sender and receiver', () => {
      expect(() =>
        validatePaymentRequest({
          ...validPayload,
          receiver_id: 'user_001',
        }),
      ).toThrow();
    });

    it('should reject request with extra fields', () => {
      expect(() =>
        validatePaymentRequest({
          ...validPayload,
          extra_field: 'should_fail',
        }),
      ).toThrow();
    });
  });
});
