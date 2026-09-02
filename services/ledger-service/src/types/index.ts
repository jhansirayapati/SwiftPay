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
  originalEventId?: string;
  retryCount?: number;
  originalPayload?: Record<string, unknown>;
  error?: string;
}

export interface TransactionHistoryResponse {
  data: Array<{
    id: string;
    transactionId: string;
    senderId: string;
    receiverId: string;
    amount: string;
    currency: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    failureReason: string | null;
    createdAt: string;
    completedAt: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown> | null;
    timestamp: string;
  };
}
