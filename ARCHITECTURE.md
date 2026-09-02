# SwiftPay Real-Time Payment Ledger - Phase 1 Architecture

## Project Overview
SwiftPay is a distributed, event-driven payment processing system designed for financial correctness and safety against duplicate processing.

---

## 1. DIRECTORY STRUCTURE

```
swiftpay/
├── services/
│   ├── transaction-gateway/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── env.ts
│   │   │   │   ├── kafka.ts
│   │   │   │   └── redis.ts
│   │   │   ├── controllers/
│   │   │   │   └── paymentController.ts
│   │   │   ├── routes/
│   │   │   │   └── payments.ts
│   │   │   ├── services/
│   │   │   │   └── paymentService.ts
│   │   │   ├── repositories/
│   │   │   │   ├── userRepository.ts
│   │   │   │   └── transactionRepository.ts
│   │   │   ├── middleware/
│   │   │   │   ├── errorHandler.ts
│   │   │   │   └── logger.ts
│   │   │   ├── validators/
│   │   │   │   └── paymentValidator.ts
│   │   │   ├── kafka/
│   │   │   │   └── producer.ts
│   │   │   ├── redis/
│   │   │   │   └── client.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   └── errorResponse.ts
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ledger-service/
│       ├── src/
│       │   ├── config/
│       │   │   ├── env.ts
│       │   │   └── kafka.ts
│       │   ├── controllers/
│       │   │   └── transactionController.ts
│       │   ├── routes/
│       │   │   └── transactions.ts
│       │   ├── services/
│       │   │   ├── ledgerService.ts
│       │   │   └── paymentConsumer.ts
│       │   ├── repositories/
│       │   │   ├── userRepository.ts
│       │   │   └── transactionRepository.ts
│       │   ├── middleware/
│       │   │   ├── errorHandler.ts
│       │   │   └── logger.ts
│       │   ├── kafka/
│       │   │   ├── consumer.ts
│       │   │   └── producer.ts
│       │   ├── types/
│       │   │   └── index.ts
│       │   ├── utils/
│       │   │   ├── errorResponse.ts
│       │   │   └── asyncHandler.ts
│       │   ├── app.ts
│       │   └── server.ts
│       ├── tests/
│       │   ├── unit/
│       │   ├── integration/
│       │   └── fixtures/
│       ├── package.json
│       └── tsconfig.json
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── shared/
│   ├── types/
│   │   └── events.ts
│   └── utils/
│       └── logger.ts
│
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
├── ARCHITECTURE.md
└── PHASE1.md
```

---

## 2. DATABASE SCHEMA (ER Diagram)

```
┌─────────────────────┐
│      User           │
├─────────────────────┤
│ id (PK) String      │
│ name String         │
│ email String        │
│ currency String     │
│ balance Decimal     │ ◄─────┐
│ createdAt DateTime  │       │
│ updatedAt DateTime  │       │
└─────────────────────┘       │
        │                     │
        │                     │
        │ 1:N (sender)        │
        │                     │
        └────────────────┐    │
                         ▼    │
    ┌─────────────────────────────────────────┐
    │         Transaction                     │
    ├─────────────────────────────────────────┤
    │ id (PK) String                          │
    │ transactionId String (UNIQUE)           │
    │ senderId String (FK) ────────────────────┤──→ User
    │ receiverId String (FK) ──────────────────┤──→ User
    │ amount Decimal                          │
    │ currency String                         │
    │ status String (PENDING|COMPLETED|FAILED)│
    │ failureReason String?                   │
    │ createdAt DateTime                      │
    │ updatedAt DateTime                      │
    │ completedAt DateTime?                   │
    └─────────────────────────────────────────┘
           ▲
           │
    Indexes:
    - transactionId (unique)
    - senderId
    - receiverId
    - status
    - createdAt
```

---

## 3. REQUEST/RESPONSE FLOW

### Payment Initiation Flow:

```
1. Client sends POST /v1/payments
   │
   ├─ Input Validation (Zod)
   │  └─ If invalid → HTTP 400
   │
   ├─ Redis Idempotency Check
   │  ├─ If exists with same payload → Return cached result
   │  └─ If exists with DIFFERENT payload → Return error (409 Conflict)
   │
   ├─ Database Checks
   │  ├─ Verify sender exists
   │  ├─ Verify receiver exists
   │  ├─ Check sender balance
   │  └─ If insufficient → Return error (402 Payment Required)
   │
   ├─ Create Transaction (PENDING)
   │  └─ Store in PostgreSQL
   │
   ├─ Publish PaymentInitiated event
   │  └─ Send to Kafka topic: swiftpay.payment.initiated
   │
   └─ Return HTTP 202 (Accepted)
      └─ Include transaction ID
```

### Payment Processing Flow (Ledger Service):

```
1. Kafka Consumer receives PaymentInitiated event
   │
   ├─ Load transaction from PostgreSQL
   │
   ├─ Verify transaction is PENDING
   │
   ├─ BEGIN DATABASE TRANSACTION
   │  │
   │  ├─ Load sender balance (with row-level lock)
   │  │
   │  ├─ Verify sufficient funds
   │  │  └─ If insufficient:
   │  │      ├─ Update transaction status → FAILED
   │  │      ├─ Store failure reason
   │  │      ├─ Commit transaction
   │  │      ├─ Publish PaymentFailed event
   │  │      └─ Return
   │  │
   │  ├─ Debit sender
   │  │
   │  ├─ Credit receiver
   │  │
   │  ├─ Update transaction → COMPLETED
   │  │
   │  ├─ Set completedAt timestamp
   │  │
   │  └─ COMMIT
   │
   └─ Publish PaymentCompleted event
```

---

## 4. KAFKA TOPICS & EVENTS

### Topic: `swiftpay.payment.initiated`

**Event Structure:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "PaymentInitiated",
  "transactionId": "txn_12345",
  "senderId": "user_001",
  "receiverId": "user_002",
  "amount": "500",
  "currency": "INR",
  "timestamp": "2026-08-31T12:00:00.000Z"
}
```

### Topic: `swiftpay.payment.completed`

**Event Structure:**
```json
{
  "eventId": "660e8400-e29b-41d4-a716-446655440001",
  "eventType": "PaymentCompleted",
  "transactionId": "txn_12345",
  "timestamp": "2026-08-31T12:00:05.000Z"
}
```

### Topic: `swiftpay.payment.failed`

**Event Structure:**
```json
{
  "eventId": "770e8400-e29b-41d4-a716-446655440002",
  "eventType": "PaymentFailed",
  "transactionId": "txn_12345",
  "reason": "INSUFFICIENT_FUNDS",
  "timestamp": "2026-08-31T12:00:05.000Z"
}
```

---

## 5. CONCURRENCY & LOCKING STRATEGY

### Problem
Two concurrent payments from the same sender with insufficient balance:
```
Initial balance: ₹1000
Payment A: ₹800
Payment B: ₹700
```

### Solution

1. **Row-Level Locking in PostgreSQL:**
   - Use `SELECT ... FOR UPDATE` to acquire exclusive lock on User row
   - Prevents race conditions during balance check

2. **Atomic Database Transaction:**
   - All debit/credit operations within a single `BEGIN ... COMMIT` block
   - If any operation fails, entire transaction rolls back
   - Balance is NEVER partially updated

3. **No Balance Caching in Phase 1:**
   - Read directly from PostgreSQL for authoritative state
   - Redis caching will be added in Phase 2

### Example SQL (Prisma equivalent):
```prisma
// Pseudo-code using Prisma $transaction
await prisma.$transaction(async (tx) => {
  // Lock user row
  const user = await tx.$queryRaw`
    SELECT * FROM "User" WHERE id = $1 FOR UPDATE
  `;
  
  // Verify balance
  if (user.balance < amount) {
    // Update transaction status to FAILED
    // Throw error to rollback
  }
  
  // Debit sender
  await tx.user.update({
    where: { id: senderId },
    data: { balance: { decrement: amount } }
  });
  
  // Credit receiver
  await tx.user.update({
    where: { id: receiverId },
    data: { balance: { increment: amount } }
  });
  
  // Mark transaction COMPLETED
  await tx.transaction.update({
    where: { id: transactionId },
    data: { status: 'COMPLETED' }
  });
});
```

---

## 6. IDEMPOTENCY STRATEGY

### Redis Idempotency Key
```
payment:idempotency:{transaction_id}
```

### Payload Hash
Store hash of request payload to detect mismatches:
```
payment:idempotency:{transaction_id}:payload = SHA256(request)
```

### Logic

1. **First Request:**
   ```
   SET payment:idempotency:txn_123 <result> NX EX 86400
   SET payment:idempotency:txn_123:payload <hash> NX EX 86400
   → Proceeds with payment processing
   ```

2. **Duplicate Request (Same Payload):**
   ```
   GET payment:idempotency:txn_123
   → Returns cached result (no processing)
   ```

3. **Conflicting Request (Different Payload):**
   ```
   GET payment:idempotency:txn_123:payload
   COMPARE hash with new request
   → Returns error: "Transaction ID already exists with different payload"
   ```

### Kafka Idempotency (Ledger Service)

- Check transaction status before processing
- If already COMPLETED or FAILED → ignore event
- Only process PENDING transactions
- Update status atomically within database transaction

---

## 7. ERROR HANDLING

Standard error response format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "timestamp": "2026-08-31T12:00:00.000Z"
  }
}
```

### HTTP Status Codes

| Status | Scenario |
|--------|----------|
| 200 | Success |
| 202 | Payment accepted (async) |
| 400 | Validation error |
| 402 | Insufficient funds |
| 404 | User/Transaction not found |
| 409 | Duplicate transaction (conflicting payload) |
| 500 | Server error |
| 503 | Service unavailable (Kafka/Redis down) |

---

## 8. LOGGING STRATEGY

Using **Pino** for structured logging.

### Log Levels
- `DEBUG` - Development details
- `INFO` - Major operation milestones
- `WARN` - Recoverable issues
- `ERROR` - Failures requiring attention

### Context Includes
```json
{
  "timestamp": "2026-08-31T12:00:00.000Z",
  "service": "transaction-gateway",
  "level": "info",
  "transactionId": "txn_12345",
  "senderId": "user_001",
  "receiverId": "user_002",
  "amount": "500",
  "message": "Payment initiated"
}
```

---

## 9. SAFE MONEY REPRESENTATION

### Decimal Handling
- Use PostgreSQL `NUMERIC` type (unlimited precision)
- Use Prisma `Decimal` type
- NEVER use JavaScript `number` (floating-point)
- Always store/transfer as `Decimal.toString()` in Kafka events

### Example:
```typescript
const amount = new Decimal("500.50"); // ✓ Safe
const amount = 500.50;                // ✗ Unsafe
```

---

## 10. DEPLOYMENT TARGETS

### Phase 1 (Local Development)
- Docker Compose for PostgreSQL, Redis, Kafka
- Node.js dev servers (no containerization yet)

### Phase 2+ (Production)
- Kubernetes
- GitHub Actions CI/CD
- Monitoring/observability
- Performance testing (k6)

---

## 11. TESTING STRATEGY

### Unit Tests
- Input validation
- Payload hash logic
- Error handling

### Integration Tests
- Full payment flow (gateway → Kafka → ledger)
- Concurrent payment scenarios
- Insufficient balance handling
- Duplicate transaction handling
- Duplicate Kafka event handling

### Critical Test Cases
1. Single payment success
2. Payment with insufficient funds
3. Duplicate transaction ID (same payload)
4. Duplicate transaction ID (different payload)
5. Concurrent payments from same sender
6. Database transaction rollback
7. Kafka consumer idempotency

---

## Key Financial Rules (ENFORCED IN CODE)

1. ✓ PostgreSQL is the single source of truth
2. ✓ No floating-point arithmetic for money
3. ✓ Debit and credit are atomic
4. ✓ Sender balance NEVER becomes negative
5. ✓ Duplicate requests are idempotent
6. ✓ Duplicate Kafka events are idempotent
7. ✓ Business logic separated from routes
8. ✓ No unsafe `any` types
9. ✓ No hard-coded secrets
10. ✓ All errors logged and handled

---

## Next Steps

1. Initialize monorepo structure
2. Set up Prisma schema
3. Implement Transaction Gateway
4. Implement Ledger Service
5. Create comprehensive tests
6. Document run commands
