# SwiftPay Real-Time Payment Ledger - Phase 1

A distributed, event-driven payment processing system built with Node.js, TypeScript, Express, PostgreSQL, Kafka, and Redis.

**Financial Correctness First**: This system prioritizes financial safety and consistency over premature optimization. All money transfers are # SwiftPay Real-Time Payment Ledger

A distributed, event-driven real-time payment processing system built with **Node.js, TypeScript, Express, PostgreSQL, Apache Kafka, Redis, and Prisma**.

> **Financial Correctness First:** SwiftPay prioritizes financial safety and consistency over premature optimization. Payment transfers are designed to be atomic, idempotent, concurrency-safe, and protected against double spending.

---

## Features

* ✅ **Idempotent Payments** — Duplicate requests using the same transaction ID are safely handled.
* ✅ **Atomic Transfers** — Debit and credit operations execute inside a PostgreSQL ACID transaction.
* ✅ **Payload Verification** — Conflicting requests using an existing transaction ID are rejected.
* ✅ **Event-Driven Processing** — Kafka is used for asynchronous payment settlement.
* ✅ **Kafka Idempotency** — Duplicate payment events are safely handled.
* ✅ **Safe Money Handling** — Decimal arithmetic is used instead of JavaScript floating-point calculations.
* ✅ **Row-Level Locking** — PostgreSQL `FOR UPDATE` protects against concurrent balance updates.
* ✅ **Clean Architecture** — Business logic is separated from HTTP routes.
* ✅ **Structured Logging** — Pino provides structured logging with transaction context.
* ✅ **API Documentation** — Swagger/OpenAPI documentation is available.
* ✅ **Health Checks** — Services expose health endpoints.
* ✅ **Dockerized Infrastructure** — PostgreSQL, Kafka, Redis, and supporting infrastructure run through Docker Compose.
* ✅ **Automated Testing** — Jest tests cover critical payment behavior.
* ✅ **CI Validation** — GitHub Actions validates the project.
* ✅ **Performance Testing** — k6 load testing is implemented for 250 TPS benchmarking.

---

# Architecture

```text
                         ┌─────────────────┐
                         │      Client     │
                         └────────┬────────┘
                                  │
                                  │ POST /v1/payments
                                  ▼
                    ┌──────────────────────────┐
                    │   Transaction Gateway    │
                    │        Port 3001         │
                    │                          │
                    │ • Validation             │
                    │ • Idempotency            │
                    │ • User verification      │
                    │ • Balance validation     │
                    │ • Transaction creation   │
                    └────────────┬─────────────┘
                                 │
                                 │ PaymentInitiated
                                 ▼
                         ┌───────────────┐
                         │     Kafka     │
                         └───────┬───────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │      Ledger Service      │
                    │        Port 3002         │
                    │                          │
                    │ • Row-level locking      │
                    │ • Atomic settlement      │
                    │ • Debit / credit         │
                    │ • Transaction history    │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │  PostgreSQL   │
                         │ Source of     │
                         │ Truth         │
                         └───────────────┘

                         ┌───────────────┐
                         │     Redis     │
                         │ Idempotency   │
                         └───────────────┘

                         ┌───────────────┐
                         │   Analytics   │
                         │    Service    │
                         │    Port 3003  │
                         └───────────────┘
```

---

# Technology Stack

| Component         | Technology              |
| ----------------- | ----------------------- |
| Runtime           | Node.js                 |
| Language          | TypeScript              |
| API               | Express.js              |
| ORM               | Prisma                  |
| Database          | PostgreSQL              |
| Messaging         | Apache Kafka            |
| Cache             | Redis                   |
| Validation        | Zod                     |
| Logging           | Pino                    |
| API Documentation | Swagger/OpenAPI         |
| Testing           | Jest                    |
| Load Testing      | k6                      |
| Containers        | Docker / Docker Compose |
| CI                | GitHub Actions          |

---

# Project Structure

```text
swiftpay/
├── services/
│   ├── transaction-gateway/
│   ├── ledger-service/
│   └── analytics-service/
│
├── prisma/
├── scripts/
│   └── load-test.js
├── tests/
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── ARCHITECTURE.md
├── performance-report.md
└── README.md
```

---

# Prerequisites

* Node.js 18+
* npm 9+
* Docker Desktop
* Docker Compose
* k6 for performance testing

---

# Quick Start

## 1. Install Dependencies

```bash
npm install
npm install --workspaces
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

---

## 2. Configure Environment

Copy the environment file:

```bash
cp .env.example .env
```

Example:

```env
TRANSACTION_GATEWAY_PORT=3001
LEDGER_SERVICE_PORT=3002

DATABASE_URL=postgresql://swiftpay:swiftpay123@localhost:5434/swiftpay

REDIS_URL=redis://localhost:6379

KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=swiftpay-client
KAFKA_GROUP_ID=swiftpay-group

LOG_LEVEL=debug
```

---

## 3. Start Infrastructure

```bash
npm run docker:up
```

View Docker logs:

```bash
npm run docker:logs
```

Infrastructure includes:

```text
PostgreSQL
Kafka
ZooKeeper
Redis
```

---

## 4. Set Up Database

Run migrations:

```bash
npm run prisma:migrate
```

Synchronize the schema if required:

```bash
npx prisma db push
```

Seed test users:

```bash
npm run prisma:seed
```

---

# Services

## Transaction Gateway

```bash
cd services/transaction-gateway
npm run dev
```

Gateway:

```text
http://localhost:3001
```

Swagger:

```text
http://localhost:3001/api-docs
```

Health:

```text
http://localhost:3001/health
```

---

## Ledger Service

```bash
cd services/ledger-service
npm run dev
```

Ledger:

```text
http://localhost:3002
```

Swagger:

```text
http://localhost:3002/api-docs
```

Health:

```text
http://localhost:3002/health
```

---

## Analytics Service

The Analytics Service consumes payment events from Kafka for analytics processing.

```text
http://localhost:3003
```

---

# Test Accounts

After seeding:

```text
user_001 - Alice Johnson  - ₹100,000.00
user_002 - Bob Smith      - ₹50,000.00
user_003 - Charlie Brown - ₹25,000.00
```

These accounts are intended for local development and testing.

---

# API Examples

## Initiate Payment

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

Response:

```http
HTTP 202 Accepted
```

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

`202 Accepted` means the Transaction Gateway accepted the request and queued it for asynchronous settlement.

---

# Transaction History

```bash
curl "http://localhost:3002/v1/users/user_001/transactions?page=1&limit=10"
```

Example:

```json
{
  "data": [
    {
      "id": "clk1...",
      "transactionId": "txn_001",
      "senderId": "user_001",
      "receiverId": "user_002",
      "amount": "500.00",
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

---

# Idempotency

The same transaction ID and identical payload cannot create duplicate payment processing.

```text
Request 1
    ↓
Transaction created
    ↓
Request 2 with same transaction ID
    ↓
Existing result returned
```

---

# Conflicting Duplicate

If an existing transaction ID is submitted with a different payload:

```http
HTTP 409 Conflict
```

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

---

# Insufficient Funds

When the sender does not have sufficient balance:

```http
HTTP 402 Payment Required
```

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

---

# Payment Processing Flow

```text
1. Client
      │
      ▼
2. POST /v1/payments
      │
      ▼
3. Transaction Gateway
      │
      ├── Validate request
      ├── Check idempotency
      ├── Verify sender
      ├── Verify receiver
      ├── Check balance
      └── Create PENDING transaction
      │
      ▼
4. Kafka
      │
      │ PaymentInitiated
      ▼
5. Ledger Service
      │
      ├── Load transaction
      ├── BEGIN transaction
      ├── Lock sender row
      ├── Verify sufficient funds
      ├── Debit sender
      ├── Credit receiver
      ├── Mark COMPLETED
      └── COMMIT
      │
      ▼
6. Kafka
      │
      ├── PaymentCompleted
      └── PaymentFailed
```

---

# Financial Safety

SwiftPay enforces:

1. PostgreSQL as the source of truth.
2. Decimal arithmetic for monetary values.
3. Atomic debit and credit operations.
4. Protection against negative sender balances.
5. Idempotent payment requests.
6. Idempotent Kafka event processing.
7. PostgreSQL row-level locking during settlement.
8. Separation of business logic from routes.
9. Type-safe TypeScript implementation.
10. Structured error handling and logging.

---

# Database Atomicity

Settlement uses PostgreSQL transactions and row-level locking.

Conceptually:

```sql
BEGIN;

SELECT *
FROM "User"
WHERE id = 'user_001'
FOR UPDATE;

UPDATE "User"
SET balance = balance - amount
WHERE id = 'user_001';

UPDATE "User"
SET balance = balance + amount
WHERE id = 'user_002';

UPDATE "Transaction"
SET status = 'COMPLETED'
WHERE "transactionId" = 'txn_001';

COMMIT;
```

The sender row lock prevents concurrent payments from spending the same available balance.

---

# Testing

Run all workspace tests:

```bash
npm test --workspaces -- --runInBand
```

Run a specific service:

```bash
cd services/transaction-gateway
npm run test
```

Watch mode:

```bash
npm run test:watch
```

Coverage:

```bash
npm run test:coverage
```

Test coverage includes:

* Request validation
* Payment processing
* Insufficient funds
* Idempotency
* Conflicting transaction IDs
* Concurrent payments
* Atomic transfers
* Kafka event idempotency

---

# Performance Testing

SwiftPay includes a k6 performance test:

```text
scripts/load-test.js
```

Run:

```powershell
& "C:\Program Files\k6\k6.exe" run scripts/load-test.js
```

The benchmark targets:

```text
250 TPS
60 seconds
p95 < 500 ms
HTTP failure rate < 1%
0 dropped iterations
```

## Latest Measured Result

```text
Total requests:       15,001
Achieved throughput:  249.98 TPS
Dropped iterations:   0
p95 latency:           55.98 ms
p99 latency:          102.83 ms
Maximum latency:      279.11 ms
```

The latest run returned `402 INSUFFICIENT_FUNDS` because the sender test account exhausted its balance.

Therefore, these results represent **gateway throughput and rejection-path latency**, not successful payment settlement performance.

Detailed results are available in:

```text
performance-report.md
```

---

# Performance and Observability

SwiftPay uses a distributed event-driven architecture separating payment acceptance, settlement, and analytics processing.

### Key metrics

* Gateway throughput
* Gateway p95 latency
* p90/p95/p99 latency
* HTTP failure rate
* Dropped iterations
* Payment acceptance/rejection rate
* Kafka event processing
* PostgreSQL transaction behavior
* Application logs

Structured logging is implemented using Pino with transaction context.

For production-scale deployments, additional monitoring can be added for:

* Kafka consumer lag
* PostgreSQL lock wait time
* PostgreSQL connection pools
* Redis latency
* Node.js CPU and memory utilization
* Container resource utilization
* Distributed tracing
* Alerting

---

# PCAP Network Evidence

Network captures from performance testing can be stored alongside the benchmark documentation.

Recommended structure:

```text
performance/
├── performance-report.md
└── swiftpay-250-tps.pcapng
```

The `.pcapng` capture can be inspected using Wireshark.

---

# Kafka

List Kafka topics:

```bash
docker-compose exec kafka kafka-topics \
  --bootstrap-server localhost:9092 \
  --list
```

Consume payment events:

```bash
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic swiftpay.payment.initiated \
  --from-beginning
```

Kafka provides asynchronous communication between the payment processing services.

---

# Redis

Redis is used for payment idempotency handling.

It provides fast lookup of previously processed transaction IDs and helps prevent duplicate payment processing.

---

# Database Inspection

Connect to PostgreSQL:

```bash
docker-compose exec postgres psql -U swiftpay -d swiftpay
```

View users:

```sql
SELECT id, name, balance
FROM "User";
```

View transactions:

```sql
SELECT
  "transactionId",
  "senderId",
  "receiverId",
  amount,
  status
FROM "Transaction";
```

---

# Docker

Start infrastructure:

```bash
npm run docker:up
```

View logs:

```bash
npm run docker:logs
```

Stop infrastructure:

```bash
npm run docker:down
```

---

# CI

SwiftPay includes a GitHub Actions workflow for automated validation.

The CI pipeline installs dependencies and runs the automated test suite.

The current CI build has completed successfully.

---

# Current Implementation Status

## Completed

* ✅ Transaction Gateway
* ✅ Ledger Service
* ✅ Analytics Service
* ✅ PostgreSQL persistence
* ✅ Redis idempotency
* ✅ Kafka event processing
* ✅ Atomic money transfers
* ✅ PostgreSQL row-level locking
* ✅ Duplicate transaction protection
* ✅ Transaction history
* ✅ Structured logging
* ✅ Swagger/OpenAPI
* ✅ Docker Compose infrastructure
* ✅ Automated tests
* ✅ GitHub Actions CI
* ✅ k6 performance test
* ✅ 250 TPS load-test execution
* ✅ Performance report

## Additional Benchmark

* ⏳ Full 1,000,000 transaction benchmark

The 1M benchmark is intentionally not marked as completed because it was not executed and measured.

At 250 TPS, 1,000,000 transactions would require approximately:

```text
66 minutes 40 seconds
```

---

# Architecture Decisions

## Why Node.js?

Node.js provides an asynchronous runtime well suited to I/O-heavy APIs and event-driven services.

## Why TypeScript?

TypeScript provides compile-time type safety while retaining the Node.js ecosystem.

## Why PostgreSQL?

PostgreSQL provides:

* ACID transactions
* Strong consistency
* Row-level locking
* Reliable persistence
* Decimal numeric support

## Why Kafka?

Kafka decouples payment acceptance from settlement and provides reliable event-driven communication.

## Why Redis?

Redis provides low-latency idempotency lookups.

## Why Prisma?

Prisma provides:

* Type-safe database access
* TypeScript integration
* Database migrations
* Decimal support
* Clear database models

---

# Stopping Services

Stop Docker infrastructure:

```bash
npm run docker:down
```

Stop local Node.js services with:

```text
Ctrl + C
```

---

# Documentation

Detailed architecture:

```text
ARCHITECTURE.md
```

Performance results:

```text
performance-report.md
```

Load-test implementation:

```text
scripts/load-test.js
```

---

# License

Confidential — SwiftPay Payment Systems
atomic, idempotent, and double-spend safe.

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

# Sync database schema
npx prisma db push

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
DATABASE_URL=postgresql://swiftpay:swiftpay123@localhost:5434/swiftpay

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
