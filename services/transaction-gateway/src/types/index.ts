export interface PaymentRequest {
  transaction_id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  currency: string;
}

export interface PaymentResponse {
  transactionId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  senderId: string;
  receiverId: string;
  amount: string;
  currency: string;
  createdAt: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown> | null;
    timestamp: string;
  };
}

export interface PaymentInitiatedEvent {
  eventId: string;
  eventType: 'PaymentInitiated';
  transactionId: string;
  senderId: string;
  receiverId: string;
  amount: string;
  currency: string;
  timestamp: string;
  retryCount?: number;
  originalEventId?: string;
}

export interface PaymentCompletedEvent {
  eventId: string;
  eventType: 'PaymentCompleted';
  transactionId: string;
  senderId: string;
  receiverId: string;
  amount: string;
  currency: string;
  timestamp: string;
}

export interface PaymentFailedEvent {
  eventId: string;
  eventType: 'PaymentFailed';
  transactionId: string;
  senderId?: string;
  receiverId?: string;
  amount?: string;
  currency?: string;
  reason: string;
  timestamp: string;
}

export type KafkaEvent = PaymentInitiatedEvent | PaymentCompletedEvent | PaymentFailedEvent;
