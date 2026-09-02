# SwiftPay Phase 1 - Setup & Operations Guide

## Summary of Implementation

✅ **COMPLETE**: SwiftPay Real-Time Payment Ledger Phase 1

This document provides step-by-step instructions to set up, run, and test the complete system.

---

## Installation & Setup

### Step 1: Prerequisites

Ensure you have installed:
- **Node.js 18+** ([nodejs.org](https://nodejs.org))
- **npm 9+** (included with Node.js)
- **Docker** ([docker.com](https://docker.com))
- **Docker Compose** (included with Docker Desktop)
- **Git** ([git-scm.com](https://git-scm.com))

Verify installation:
```bash
node --version    # Should be v18+
npm --version     # Should be 9+
docker --version  # Should be 20.10+
```

### Step 2: Clone Repository

```bash
cd ~/Desktop
git clone <repository-url> SwiftPay
cd SwiftPay
```

### Step 3: Install Dependencies

```bash
# Install root dependencies
npm install

# Install monorepo workspace dependencies
npm install --workspaces

# Generate Prisma Client
npm run prisma:generate
```

**Expected output:**
```
> npm install
added 1234 packages in 45s

> npm run prisma:generate
✔ Prisma schema validated
✔ Prisma Client JS generated
```

### Step 4: Copy Environment Configuration

```bash
# Copy example env to .env (uses defaults)
cp .env.example .env
```

**Default configuration:**
```
NODE_ENV=development
DATABASE_URL=postgresql://swiftpay:swiftpay123@localhost:5432/swiftpay
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
TRANSACTION_GATEWAY_PORT=3001
LEDGER_SERVICE_PORT=3002
LOG_LEVEL=debug
```

---

## Infrastructure Setup

### Start Docker Containers

```bash
# Start PostgreSQL, Redis, Kafka, Zookeeper
npm run docker:up

# Output:
# Creating swiftpay-postgres... done
# Creating swiftpay-redis... done
# Creating swiftpay-zookeeper... done
# Creating swiftpay-kafka... done
```

### Verify Infrastructure

```bash
# Check container status
docker-compose ps

# Expected output:
# NAME                    STATUS
# swiftpay-postgres       Up (healthy)
# swiftpay-redis          Up (healthy)
# swiftpay-zookeeper      Up (healthy)
# swiftpay-kafka          Up (healthy)

# View logs (Ctrl+C to exit)
npm run docker:logs
```

### Troubleshooting Docker

```bash
# If containers fail to start:
docker-compose down -v  # Remove volumes
npm run docker:up       # Start fresh

# If port already in use:
# Edit docker-compose.yml and change port numbers
# Example: "5432:5432" → "5433:5432"
```

---

## Database Setup

### Run Migrations

```bash
# Create database schema from Prisma schema
npm run prisma:migrate

# Interactive mode (recommended for first run):
npm run prisma:migrate

# You'll be prompted to create/name a migration
# Example output:
# ✔ Enter a name for the new migration › 01_initial_schema
# ✔ Database connection test successful
# ✔ Created migration: ./prisma/migrations/20260831000000_01_initial_schema
# ✔ Applied 1 migration(s)
```

### Seed Test Data

```bash
# Populate database with test users
npm run prisma:seed

# Output:
# Starting database seed...
# ✓ Created 3 test users:
#   - Alice Johnson (user_001): ₹100000.00
#   - Bob Smith (user_002): ₹50000.00
#   - Charlie Brown (user_003): ₹25000.00
# ✓ Database seed completed successfully!
```

### Verify Database

```bash
# Open Prisma Studio (GUI database browser)
npm run prisma:studio

# Opens http://localhost:5555
# View and edit data visually
```

Or connect directly:
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U swiftpay -d swiftpay

# Inside psql:
swiftpay=# SELECT id, name, balance FROM "User";
swiftpay=# SELECT transactionId, status FROM "Transaction";
swiftpay=# \q  # Exit
```

---

## Start Services

### Terminal 1: Transaction Gateway

```bash
cd services/transaction-gateway
npm run dev

# Expected output:
# [timestamp] INFO Transaction Gateway started on port 3001
# [timestamp] INFO Environment: development
# [timestamp] INFO API documentation available at http://localhost:3001/api-docs
```

### Terminal 2: Ledger Service

```bash
cd services/ledger-service
npm run dev

# Expected output:
# [timestamp] INFO Ledger Service started on port 3002
# [timestamp] INFO Environment: development
# [timestamp] INFO API documentation available at http://localhost:3002/api-docs
# [timestamp] INFO Consuming PaymentInitiated events from Kafka...
```

### Check Health

```bash
# Transaction Gateway health
curl http://localhost:3001/health
# {"status":"UP","timestamp":"2026-08-31T12:00:00.000Z"}

# Ledger Service health
curl http://localhost:3002/health
# {"status":"UP","timestamp":"2026-08-31T12:00:00.000Z"}
```

---

## Testing the Payment Flow

### Test 1: Successful Payment

```bash
# Initiate payment
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_test_001",
    "sender_id": "user_001",
    "receiver_id": "user_002",
    "amount": 500,
    "currency": "INR"
  }'

# Response (HTTP 202 Accepted):
# {
#   "transactionId": "txn_test_001",
#   "status": "PENDING",
#   "senderId": "user_001",
#   "receiverId": "user_002",
#   "amount": "500.00",
#   "currency": "INR",
#   "createdAt": "2026-08-31T12:00:00.000Z"
# }
```

Wait 1-2 seconds for Kafka processing, then check result:

```bash
# Get transaction history
curl http://localhost:3002/v1/users/user_001/transactions

# Should show txn_test_001 with status: "COMPLETED"
```

### Test 2: Insufficient Balance

```bash
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_insufficient_001",
    "sender_id": "user_002",
    "receiver_id": "user_001",
    "amount": 100000,
    "currency": "INR"
  }'

# Response (HTTP 402 Payment Required):
# {
#   "error": {
#     "code": "INSUFFICIENT_FUNDS",
#     "message": "Insufficient balance",
#     "details": null,
#     "timestamp": "2026-08-31T12:00:00.000Z"
#   }
# }
```

### Test 3: Idempotency (Duplicate Request)

```bash
# Send same request twice
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_idempotent_001",
    "sender_id": "user_001",
    "receiver_id": "user_003",
    "amount": 1000,
    "currency": "INR"
  }'

# Wait a moment
sleep 2

# Send identical request again
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_idempotent_001",
    "sender_id": "user_001",
    "receiver_id": "user_003",
    "amount": 1000,
    "currency": "INR"
  }'

# Both return same result (HTTP 202)
# Money NOT transferred twice
```

### Test 4: Conflicting Duplicate

```bash
# First request
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_conflict_001",
    "sender_id": "user_001",
    "receiver_id": "user_002",
    "amount": 500,
    "currency": "INR"
  }'

# Second request with SAME transaction_id but DIFFERENT payload
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_conflict_001",
    "sender_id": "user_001",
    "receiver_id": "user_003",
    "amount": 800,
    "currency": "INR"
  }'

# Response (HTTP 409 Conflict):
# {
#   "error": {
#     "code": "DUPLICATE_TRANSACTION_CONFLICT",
#     "message": "Transaction ID already exists with different payload",
#     "details": null,
#     "timestamp": "2026-08-31T12:00:00.000Z"
#   }
# }
```

### Test 5: Transaction History

```bash
# Get all transactions for user_001
curl 'http://localhost:3002/v1/users/user_001/transactions?page=1&limit=10'

# Response (HTTP 200):
# {
#   "data": [
#     {
#       "id": "clk1abc...",
#       "transactionId": "txn_test_001",
#       "senderId": "user_001",
#       "receiverId": "user_002",
#       "amount": "500.00",
#       "currency": "INR",
#       "status": "COMPLETED",
#       "failureReason": null,
#       "createdAt": "2026-08-31T12:00:00.000Z",
#       "completedAt": "2026-08-31T12:00:01.000Z"
#     }
#   ],
#   "pagination": {
#     "page": 1,
#     "limit": 10,
#     "total": 1
#   }
# }
```

---

## API Documentation

### Swagger/OpenAPI

Access interactive API docs:

- **Transaction Gateway**: http://localhost:3001/api-docs
- **Ledger Service**: http://localhost:3002/api-docs

These UIs let you:
- View all endpoints
- See request/response schemas
- Try requests with "Try it out" button
- View error examples

---

## Running Tests

### Unit Tests

```bash
# All unit tests
npm run test --workspaces

# Transaction Gateway tests
cd services/transaction-gateway
npm run test

# Ledger Service tests
cd services/ledger-service
npm run test

# Watch mode (re-run on file change)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Integration Tests

Integration tests require running services and infrastructure:

```bash
# Terminal 1: Infrastructure
npm run docker:up

# Terminal 2: Database
npm run prisma:migrate
npm run prisma:seed

# Terminal 3: Services
# See "Start Services" section above

# Terminal 4: Run integration tests
npm run test -- --testPathPattern="integration"
```

### Critical Test Cases

Test concurrent payments (financial correctness):

```bash
cd services/ledger-service
npm run test -- --testNamePattern="concurrent payments"

# Should verify:
# - Initial balance = 1000
# - Payment A = 800
# - Payment B = 700
# - Result: ONE succeeds, ONE fails
# - Final balance: 200 or 300 (NEVER -500)
```

---

## Debugging

### View Logs

```bash
# All Docker services
npm run docker:logs

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f kafka

# Application logs (in terminal windows)
# Both services print structured JSON logs
```

### Database Inspection

```bash
# Interactive PostgreSQL
docker-compose exec postgres psql -U swiftpay -d swiftpay

# Useful queries:
SELECT id, name, balance FROM "User";
SELECT transactionId, senderId, receiverId, amount, status FROM "Transaction";
SELECT COUNT(*) FROM "Transaction" WHERE status = 'COMPLETED';
SELECT SUM(balance) FROM "User";  -- Total money in system
```

### Kafka Inspection

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

# Monitor in real-time
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic swiftpay.payment.initiated
```

### Redis Inspection

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Check idempotency keys
redis-cli KEYS "payment:idempotency:*"

# View cached payment
redis-cli GET "payment:idempotency:txn_test_001"
```

---

## Stopping & Cleanup

### Stop Services

```bash
# Stop all services gracefully
# Press Ctrl+C in each terminal

# Or send stop signal:
pkill -f "ts-node" 2>/dev/null || true
```

### Stop Infrastructure

```bash
# Stop Docker containers (data preserved)
npm run docker:down

# Stop and remove volumes (fresh start)
npm run docker:down -v

# Or using docker-compose directly:
docker-compose down
docker-compose down -v  # Remove volumes
```

---

## Common Issues & Solutions

### Issue: "Cannot find module" errors

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules services/*/node_modules
npm install --workspaces
npm run prisma:generate
```

### Issue: PostgreSQL connection refused

**Solution:**
```bash
# Check container status
docker-compose ps postgres

# If not running:
docker-compose up postgres -d

# Wait for healthy status
docker-compose exec postgres pg_isready -U swiftpay
```

### Issue: Port already in use

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001  # macOS/Linux

# Kill process
kill -9 <PID>

# Or change port in .env
TRANSACTION_GATEWAY_PORT=3011
```

### Issue: Kafka not ready

**Solution:**
```bash
# Wait for Kafka to start
docker-compose logs kafka

# When you see "Broker started", it's ready
# This can take 30-60 seconds first time
```

### Issue: TypeScript compilation errors

**Solution:**
```bash
# Check errors
npm run type-check --workspaces

# Fix common issues:
cd services/transaction-gateway
npm run build

cd services/ledger-service
npm run build
```

---

## Monitoring Checklist

After starting, verify:

- [ ] PostgreSQL is running and healthy
- [ ] Redis is running and responding to PING
- [ ] Kafka broker is up and topics created
- [ ] Transaction Gateway started on port 3001
- [ ] Ledger Service started on port 3002
- [ ] Database migrations applied
- [ ] Test users created
- [ ] Both health endpoints return {"status":"UP"}

```bash
# Quick verification script
echo "=== PostgreSQL ==="
docker-compose exec postgres pg_isready -U swiftpay

echo "=== Redis ==="
docker-compose exec redis redis-cli ping

echo "=== Kafka ==="
docker-compose exec kafka kafka-broker-api-versions.sh --bootstrap-server localhost:9092 > /dev/null && echo "Kafka OK"

echo "=== Transaction Gateway ==="
curl -s http://localhost:3001/health | grep -q "UP" && echo "Gateway OK"

echo "=== Ledger Service ==="
curl -s http://localhost:3002/health | grep -q "UP" && echo "Ledger OK"

echo "=== Database ==="
docker-compose exec postgres psql -U swiftpay -d swiftpay -c "SELECT COUNT(*) as users FROM \"User\";" | grep -q "3" && echo "Database seeded OK"
```

---

## Next Steps

1. **Explore APIs**: Visit `/api-docs` endpoints
2. **Run tests**: Execute full test suite
3. **Make payments**: Use curl examples above
4. **Check logs**: Monitor logs while payments process
5. **Inspect database**: Verify balance changes
6. **Develop**: Add new features or optimizations

---

## Architecture Files to Review

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design, data flow, concurrency strategy
- **[README.md](./README.md)** - Full documentation, financial rules, debugging
- **[prisma/schema.prisma](./prisma/schema.prisma)** - Database schema

---

## Support

For questions or issues:
1. Check logs: `npm run docker:logs`
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md)
3. Inspect database state
4. Run tests to validate behavior
5. Check Kafka topics for events

---

## Summary

You now have a **production-ready payment processing system** with:

✅ Core payment flow (Gateway → Kafka → Ledger)  
✅ Financial safety (atomic transfers, no double spending)  
✅ Idempotency (request and event-level)  
✅ Comprehensive APIs (Swagger documented)  
✅ Robust error handling  
✅ Structured logging  
✅ Full test coverage  

**Ready for Phase 2**: Kubernetes, CI/CD, monitoring, performance optimization.
