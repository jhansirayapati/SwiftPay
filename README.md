# SwiftPay Real-Time Payment Ledger - Phase 1

A distributed, event-driven payment processing system built with Node.js, TypeScript, Express, PostgreSQL, Kafka, and Redis.

**Financial Correctness First**: This system prioritizes financial safety and consistency over premature optimization. All money transfers are atomic, idempotent, and double-spend safe.

## Features

- ✅ **Idempotent Payments**: Duplicate requests with same transaction ID return cached results
- ✅ **Atomic Transfers**: Debit and credit operations are guaranteed atomic
- ✅ **Payload Verification**: Detects and rejects conflicting transaction IDs
- ✅ **Event-Driven**: Kafka-based asynchronous payment settlement
- ✅ **Kafka Idempotency**: Consumer ignores duplicate events
- ✅ **Safe Money**: Uses Decimal arithmetic, never floating-point
- ✅ **Row-Level Locking**: PostgreSQL FOR UPDATE prevents race conditions
- ✅ **Clean Architecture**: Business logic separated from routes
- ✅ **Structured Logging**: Pino logging with transaction context
- ✅ **API Documentation**: Swagger/OpenAPI docs at `/api-docs`

## Project Structure

```
swiftpay/
├── services/
│   ├── transaction-gateway/     # Payment request processing
│   └── ledger-service/          # Payment settlement and history
├── prisma/                      # Database schema and migrations
├── docker-compose.yml           # Local development infrastructure
├── ARCHITECTURE.md              # Detailed system design
└── README.md                    # This file
```

## Prerequisites

- Node.js 18+
- npm 9+
- Docker & Docker Compose
- PostgreSQL 16+ (or use Docker)
- Redis (or use Docker)
- Apache Kafka (or use Docker)

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install service dependencies
npm install --workspaces

# Generate Prisma client
npm run prisma:generate
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, Redis, Kafka in Docker
npm run docker:up

# View logs
npm run docker:logs
```

### 3. Set Up Database

```bash
# Copy environment variables
cp .env.example .env

# Run migrations
npm run prisma:migrate

# Seed database with test users
npm run prisma:seed
```

### 4. Start Services

#### Terminal 1 - Transaction Gateway
```bash
cd services/transaction-gateway
npm run dev
```

The gateway will start on `http://localhost:3001`
- API documentation: `http://localhost:3001/api-docs`
- Health check: `http://localhost:3001/health`

#### Terminal 2 - Ledger Service
```bash
cd services/ledger-service
npm run dev
```

The ledger service will start on `http://localhost:3002`
- API documentation: `http://localhost:3002/api-docs`
- Health check: `http://localhost:3002/health`

## Test Accounts

After seeding, you have three test users with INR balances:

```
user_001 - Alice Johnson - ₹100,000.00
user_002 - Bob Smith - ₹50,000.00
user_003 - Charlie Brown - ₹25,000.00
```

## API Examples

### Initiate Payment

```bash
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_001",
    "sender_id": "user_001",
    "receiver_id": "user_002",
    "amount": 500,
    "currency": "INR"
  }'
```

**Response (HTTP 202 Accepted):**
```json
{
  "transactionId": "txn_001",
  "status": "PENDING",
  "senderId": "user_001",
  "receiverId": "user_002",
  "amount": "500.00",
  "currency": "INR",
  "createdAt": "2026-08-31T12:00:00.000Z"
}
```

The payment is now queued for settlement. The Ledger Service will consume the `PaymentInitiated` event and process the transfer.

### Get Transaction History

```bash
curl -X GET 'http://localhost:3002/v1/users/user_001/transactions?page=1&limit=10'
```

**Response (HTTP 200):**
```json
{
  "data": [
    {
      "id": "clk1...",
      "transactionId": "txn_001",
      "senderId": "user_001",
      "receiverId": "user_002",
      "amount": "500.00",
      "currency": "INR",
      "status": "COMPLETED",
      "failureReason": null,
      "createdAt": "2026-08-31T12:00:00.000Z",
      "completedAt": "2026-08-31T12:00:01.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

### Duplicate Payment (Idempotency)

Send the same transaction ID with identical payload - returns cached result:

```bash
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_001",
    "sender_id": "user_001",
    "receiver_id": "user_002",
    "amount": 500,
    "currency": "INR"
  }'
```

Returns: Same transaction (no double processing)

### Conflicting Duplicate (Payload Mismatch)

Send the same transaction ID with different payload:

```bash
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_001",
    "sender_id": "user_001",
    "receiver_id": "user_003",
    "amount": 800,
    "currency": "INR"
  }'
```

**Response (HTTP 409 Conflict):**
```json
{
  "error": {
    "code": "DUPLICATE_TRANSACTION_CONFLICT",
    "message": "Transaction ID already exists with different payload",
    "details": null,
    "timestamp": "2026-08-31T12:00:00.000Z"
  }
}
```

### Insufficient Funds

```bash
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_insufficient",
    "sender_id": "user_002",
    "receiver_id": "user_001",
    "amount": 100000,
    "currency": "INR"
  }'
```

**Response (HTTP 402 Payment Required):**
```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Insufficient balance",
    "details": null,
    "timestamp": "2026-08-31T12:00:00.000Z"
  }
}
```

## Data Flow

### Payment Processing Flow

```
1. Client → POST /v1/payments
   ↓
2. Transaction Gateway
   ├─ Validate request (Zod)
   ├─ Check idempotency (Redis)
   ├─ Verify users exist
   ├─ Check balance
   └─ Create PENDING transaction in PostgreSQL
   ↓
3. Publish PaymentInitiated → Kafka
   ↓
4. Ledger Service (Kafka Consumer)
   ├─ Receive PaymentInitiated event
   ├─ Load transaction (verify PENDING)
   ├─ BEGIN DATABASE TRANSACTION
   ├─ Lock sender row (FOR UPDATE)
   ├─ Verify sufficient funds
   ├─ Debit sender
   ├─ Credit receiver
   ├─ Mark COMPLETED
   └─ COMMIT
   ↓
5. Publish PaymentCompleted or PaymentFailed → Kafka
```

### Database Transaction (Atomic)

All balance transfers happen in a single ACID transaction:

```sql
BEGIN;

-- Lock sender for atomicity
SELECT * FROM "User" WHERE id = 'user_001' FOR UPDATE;

-- Verify sufficient funds
IF balance < amount THEN
  UPDATE "Transaction" SET status = 'FAILED';
  ROLLBACK;
END IF;

-- Debit sender
UPDATE "User" SET balance = balance - amount WHERE id = 'user_001';

-- Credit receiver
UPDATE "User" SET balance = balance + amount WHERE id = 'user_002';

-- Mark transaction complete
UPDATE "Transaction" SET status = 'COMPLETED';

COMMIT;
```

## Testing

### Run Tests

```bash
# All tests
npm run test --workspaces

# Specific service
cd services/transaction-gateway
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Scenarios

Key test cases are included for:

1. **Validation** - Invalid requests, missing fields
2. **Payment Processing** - Success, insufficient balance
3. **Idempotency** - Duplicate requests with same/different payloads
4. **Concurrency** - Two simultaneous payments from same sender
5. **Atomic Transfers** - Verify balance consistency
6. **Kafka Idempotency** - Duplicate events ignored

### Running Concurrent Payment Test

```bash
# This tests financial consistency
npm run test -- --testNamePattern="concurrent payments"
```

Expected behavior:
- Initial balance: ₹1000
- Payment A: ₹800
- Payment B: ₹700
- Only ONE succeeds (either A or B, not both)
- Final balance: ₹200 or ₹300 (never -500)

## Environment Configuration

Edit `.env` to configure:

```env
# Service ports
TRANSACTION_GATEWAY_PORT=3001
LEDGER_SERVICE_PORT=3002

# Database (PostgreSQL)
DATABASE_URL=postgresql://swiftpay:swiftpay123@localhost:5432/swiftpay

# Cache (Redis)
REDIS_URL=redis://localhost:6379

# Messaging (Kafka)
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=swiftpay-client
KAFKA_GROUP_ID=swiftpay-group

# Logging
LOG_LEVEL=debug  # debug, info, warn, error
```

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| VALIDATION_ERROR | 400 | Invalid request format |
| SENDER_NOT_FOUND | 404 | Sender user doesn't exist |
| RECEIVER_NOT_FOUND | 404 | Receiver user doesn't exist |
| INSUFFICIENT_FUNDS | 402 | Sender balance too low |
| DUPLICATE_TRANSACTION_CONFLICT | 409 | Same transaction ID, different payload |
| USER_NOT_FOUND | 404 | User doesn't exist (for history) |
| INTERNAL_SERVER_ERROR | 500 | Unexpected error |

## Debugging

### View Logs

```bash
# All services
npm run docker:logs

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f kafka
```

### Inspect Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U swiftpay -d swiftpay

# View users
SELECT id, name, balance FROM "User";

# View transactions
SELECT transactionId, senderId, receiverId, amount, status FROM "Transaction";
```

### Kafka Topics

```bash
# List topics
docker-compose exec kafka kafka-topics \
  --bootstrap-server localhost:9092 \
  --list

# View messages in topic
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic swiftpay.payment.initiated \
  --from-beginning
```

## Stopping Services

```bash
# Stop all Docker services
npm run docker:down

# Kill Node servers (Ctrl+C in terminal windows)
```

## Financial Safety Rules

These rules are ENFORCED in code:

1. ✅ PostgreSQL is the single source of truth
2. ✅ No floating-point arithmetic for money (use Decimal)
3. ✅ Debit and credit operations are ATOMIC
4. ✅ Sender balance NEVER becomes negative
5. ✅ Duplicate requests with same payload are idempotent
6. ✅ Duplicate Kafka events are idempotent
7. ✅ Business logic separated from routes
8. ✅ No unsafe `any` TypeScript types
9. ✅ No hard-coded secrets
10. ✅ All errors are logged and handled

## Phase 1 vs Phase 2

### Phase 1 (Current) ✅
- Core payment flow
- Idempotency
- Atomic transfers
- Kafka event streaming
- Transaction history
- Basic logging
- Local dev infrastructure

### Phase 2 (Future)
- Kubernetes manifests
- GitHub Actions CI/CD
- Advanced Redis caching
- Monitoring & alerting
- Distributed tracing
- k6 performance tests
- 1M+ TPS optimization

## Architecture Decisions

### Why Prisma?
- Type-safe ORM with excellent TypeScript support
- Automatic migrations
- Decimal support for money

### Why Kafka?
- Decouples payment processing from settlement
- Enables async payment confirmation
- Natural fit for event-driven architecture
- Handles backpressure gracefully

### Why Redis?
- Fast idempotency checks (24-hour TTL)
- In-memory for sub-millisecond latency
- Perfect for request deduplication

### Why PostgreSQL?
- ACID transactions guarantee consistency
- Row-level locking (FOR UPDATE) prevents race conditions
- Reliable source of truth

## Next Steps (Phase 2)

- [ ] Kubernetes deployment manifests
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Monitoring and alerting
- [ ] Advanced Redis caching strategies
- [ ] Performance optimization
- [ ] Distributed tracing

## License

Confidential - SwiftPay Payment Systems

## Support

For issues or questions, refer to [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design documentation.
