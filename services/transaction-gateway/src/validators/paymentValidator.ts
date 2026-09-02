import { z } from 'zod';
import { PaymentRequest } from '../types';

export const paymentRequestSchema = z
  .object({
    transaction_id: z.string().min(1, 'transaction_id is required'),
    sender_id: z.string().min(1, 'sender_id is required'),
    receiver_id: z.string().min(1, 'receiver_id is required'),
    amount: z.number().positive('amount must be greater than 0'),
    currency: z.string().min(1, 'currency is required'),
  })
  .strict()
  .refine(
    (data) => data.sender_id !== data.receiver_id,
    'sender_id and receiver_id cannot be the same',
  );

export const validatePaymentRequest = (data: unknown): PaymentRequest => {
  return paymentRequestSchema.parse(data);
};
