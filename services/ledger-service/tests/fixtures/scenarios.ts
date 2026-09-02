/**
 * Integration Test Fixtures
 * 
 * This file documents the key integration test scenarios
 * that verify financial correctness and system safety.
 */

export const testScenarios = {
  payment: {
    valid: {
      description: 'Valid payment request',
      payload: {
        transaction_id: 'txn_valid_001',
        sender_id: 'user_001',
        receiver_id: 'user_002',
        amount: 500,
        currency: 'INR',
      },
      expectedStatus: 202,
      expectedTransactionStatus: 'PENDING',
    },

    insufficientBalance: {
      description: 'Sender has insufficient balance',
      payload: {
        transaction_id: 'txn_insufficient_001',
        sender_id: 'user_002', // Balance: 50000
        receiver_id: 'user_001',
        amount: 100000, // Request: 100000
        currency: 'INR',
      },
      expectedStatus: 402,
      expectedErrorCode: 'INSUFFICIENT_FUNDS',
    },

    senderNotFound: {
      description: 'Sender user does not exist',
      payload: {
        transaction_id: 'txn_notfound_001',
        sender_id: 'user_999',
        receiver_id: 'user_002',
        amount: 500,
        currency: 'INR',
      },
      expectedStatus: 404,
      expectedErrorCode: 'SENDER_NOT_FOUND',
    },

    receiverNotFound: {
      description: 'Receiver user does not exist',
      payload: {
        transaction_id: 'txn_notfound_002',
        sender_id: 'user_001',
        receiver_id: 'user_999',
        amount: 500,
        currency: 'INR',
      },
      expectedStatus: 404,
      expectedErrorCode: 'RECEIVER_NOT_FOUND',
    },

    sameSenderReceiver: {
      description: 'Sender and receiver are the same',
      payload: {
        transaction_id: 'txn_same_001',
        sender_id: 'user_001',
        receiver_id: 'user_001',
        amount: 500,
        currency: 'INR',
      },
      expectedStatus: 400,
      expectedErrorCode: 'VALIDATION_ERROR',
    },

    duplicateIdempotent: {
      description: 'Duplicate request with same payload returns cached result',
      transactionId: 'txn_duplicate_001',
      payload: {
        transaction_id: 'txn_duplicate_001',
        sender_id: 'user_001',
        receiver_id: 'user_002',
        amount: 500,
        currency: 'INR',
      },
      expectedStatus: 202,
      behavior: 'First request creates, second returns cached result',
    },

    duplicateConflict: {
      description: 'Duplicate transaction ID with different payload',
      transactionId: 'txn_conflict_001',
      payload1: {
        transaction_id: 'txn_conflict_001',
        sender_id: 'user_001',
        receiver_id: 'user_002',
        amount: 500,
        currency: 'INR',
      },
      payload2: {
        transaction_id: 'txn_conflict_001',
        sender_id: 'user_001',
        receiver_id: 'user_003', // Different receiver
        amount: 500,
        currency: 'INR',
      },
      expectedStatus: 409,
      expectedErrorCode: 'DUPLICATE_TRANSACTION_CONFLICT',
    },
  },

  concurrency: {
    doubleSending: {
      description:
        'Two concurrent payments from same sender, only one succeeds',
      scenario: `
        Initial balance: 1000 INR
        Payment A: 800 INR
        Payment B: 700 INR
        
        Expected result:
        - One succeeds (COMPLETED)
        - One fails (INSUFFICIENT_FUNDS)
        - Final balance: Either 200 or 300 (never -500)
      `,
      testCase: {
        sender: 'user_001',
        initialBalance: 1000,
        payments: [
          {
            transactionId: 'txn_concurrent_a',
            amount: 800,
            receiver: 'user_002',
          },
          {
            transactionId: 'txn_concurrent_b',
            amount: 700,
            receiver: 'user_003',
          },
        ],
        expectedOutcomes: [
          {
            transactionId: 'txn_concurrent_a',
            status: 'COMPLETED',
            finalBalance: 200,
          },
          {
            transactionId: 'txn_concurrent_b',
            status: 'FAILED',
          },
        ],
      },
    },
  },

  ledger: {
    atomicTransfer: {
      description: 'Atomic transfer: sender debited and receiver credited together',
      scenario: `
        If ANY operation fails, entire transaction rolls back.
        Never allow: sender debited but receiver not credited.
      `,
      verification: [
        'Sender balance decreased by exact amount',
        'Receiver balance increased by exact amount',
        'Transaction status is COMPLETED',
        'No partial transfers',
      ],
    },

    insufficientFundsRollback: {
      description: 'Failed transfer due to insufficient balance rolls back completely',
      scenario: `
        Transaction detects insufficient balance during settlement.
        Status: PENDING → FAILED
        Balances: UNCHANGED
      `,
      verification: [
        'Transaction status changed to FAILED',
        'Failure reason recorded',
        'Sender balance unchanged',
        'Receiver balance unchanged',
      ],
    },

    kafkaIdempotency: {
      description:
        'Duplicate Kafka events are ignored (idempotent consumption)',
      scenario: `
        PaymentInitiated event delivered twice (network retry, consumer rebalance).
        
        First event: PENDING → COMPLETED (balance transfer)
        Second event: COMPLETED → (ignored)
        
        Money never transferred twice.
      `,
      verification: [
        'First event processes normally',
        'Second event detected as already processed',
        'No double debit/credit',
      ],
    },
  },

  transactionHistory: {
    userTransactions: {
      description: 'Get all transactions where user is sender or receiver',
      query: '/v1/users/:userId/transactions?page=1&limit=20',
      expectedFields: [
        'id',
        'transactionId',
        'senderId',
        'receiverId',
        'amount',
        'currency',
        'status',
        'createdAt',
        'completedAt',
      ],
    },

    filterByStatus: {
      description: 'Filter transactions by status',
      query: '/v1/users/:userId/transactions?status=COMPLETED&page=1&limit=20',
      expectedFilter: 'Only COMPLETED transactions',
    },

    pagination: {
      description: 'Paginate through transaction history',
      query: '/v1/users/:userId/transactions?page=2&limit=10',
      expectedBehavior: 'Returns items 11-20',
    },
  },
};

/**
 * Test Data: Seed Users
 * 
 * These users are created during database seeding
 */
export const seedUsers = [
  {
    id: 'user_001',
    name: 'Alice Johnson',
    email: 'alice@swiftpay.com',
    currency: 'INR',
    balance: '100000.00',
  },
  {
    id: 'user_002',
    name: 'Bob Smith',
    email: 'bob@swiftpay.com',
    currency: 'INR',
    balance: '50000.00',
  },
  {
    id: 'user_003',
    name: 'Charlie Brown',
    email: 'charlie@swiftpay.com',
    currency: 'INR',
    balance: '25000.00',
  },
];

/**
 * Key Test Invariants
 * 
 * These invariants must ALWAYS hold after any operation:
 */
export const invariants = {
  financialConsistency: [
    'Total money in system = sum of all user balances',
    'No balance is negative',
    'Every debit has a matching credit',
  ],

  idempotency: [
    'Duplicate request with same payload returns same result',
    'Duplicate Kafka events do not cause duplicate transfers',
    'Payment completion is monotonic (PENDING → {COMPLETED|FAILED})',
  ],

  transactionIntegrity: [
    'Transaction ID is globally unique',
    'Transaction status reflects actual balance changes',
    'Timestamps are accurate and consistent',
  ],
};
