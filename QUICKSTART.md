# SwiftPay Quick Start Guide

Get the entire payment system running in 5 minutes.

---

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org))
- Docker & Docker Compose ([download](https://docker.com))

Verify:
```bash
node --version && npm --version && docker --version
```

---

## 1. Install Dependencies (1 min)

```bash
npm install --workspaces
npm run prisma:generate
```

---

## 2. Start Infrastructure (1 min)

```bash
npm run docker:up
```

Wait for all containers to show `healthy`:
```bash
docker-compose ps
```

---

## 3. Setup Database (1 min)

```bash
npm run prisma:migrate
npm run prisma:seed
```

Verify seeding:
```bash
npm run prisma:studio
# Browse to http://localhost:5555
# View Users table - should show 3 users
# Close browser or press Ctrl+C
```

---

## 4. Start Services (1 min)

**Terminal 1 - Transaction Gateway:**
```bash
cd services/transaction-gateway
npm run dev
```

Wait for: `Transaction Gateway started on port 3001`

**Terminal 2 - Ledger Service:**
```bash
cd services/ledger-service
npm run dev
```

Wait for: `Ledger Service started on port 3002`

---

## 5. Test It! (1 min)

**Make a payment:**
```bash
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_test_001",
    "sender_id": "user_001",
    "receiver_id": "user_002",
    "amount": 500,
    "currency": "INR"
  }'
```

Response should be HTTP 202 with transaction status `PENDING`.

**Wait 2 seconds, then check settlement:**
```bash
curl http://localhost:3002/v1/users/user_001/transactions
```

Response should show transaction with status `COMPLETED`.

---

## 6. View APIs

- Transaction Gateway: http://localhost:3001/api-docs
- Ledger Service: http://localhost:3002/api-docs

Try "Try it out" buttons to execute requests!

---

## Common Tasks

### View Database
```bash
docker-compose exec postgres psql -U swiftpay -d swiftpay

# In psql:
SELECT id, name, balance FROM "User";
SELECT transactionId, status FROM "Transaction";
\q
```

### View Kafka Events
```bash
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic swiftpay.payment.initiated \
  --from-beginning
```

### Check Logs
```bash
npm run docker:logs       # All containers
docker-compose logs -f postgres
docker-compose logs -f kafka
```

### Run Tests
```bash
npm run test --workspaces
```

### Stop Everything
```bash
npm run docker:down
# Press Ctrl+C in both service terminals
```

---

## What Happens When You Send a Payment

```
1. POST /v1/payments (Gateway)
   ├─ Validates request
   ├─ Checks Redis for idempotency
   ├─ Verifies users exist
   ├─ Checks balance
   └─ Creates PENDING transaction + publishes Kafka event

2. Kafka: swiftpay.payment.initiated event

3. Ledger Service (Kafka Consumer)
   ├─ Receives event
   ├─ Loads transaction
   ├─ Begins database transaction
   ├─ Locks sender row
   ├─ Verifies balance
   ├─ Debits sender
   ├─ Credits receiver
   ├─ Commits (atomic!)
   └─ Publishes PaymentCompleted event

4. Status changes: PENDING → COMPLETED

5. GET /v1/users/user_001/transactions
   └─ Returns completed transaction
```

---

## Test Users

```
user_001 - Alice Johnson  - ₹100,000.00
user_002 - Bob Smith      - ₹50,000.00
user_003 - Charlie Brown  - ₹25,000.00
```

Try these scenarios:

**Success:**
```json
{
  "transaction_id": "txn_success",
  "sender_id": "user_001",
  "receiver_id": "user_002",
  "amount": 500,
  "currency": "INR"
}
```

**Insufficient Balance:**
```json
{
  "transaction_id": "txn_insufficient",
  "sender_id": "user_002",
  "receiver_id": "user_001",
  "amount": 100000,
  "currency": "INR"
}
```

**Idempotency (send twice):**
```json
{
  "transaction_id": "txn_idempotent",
  "sender_id": "user_001",
  "receiver_id": "user_003",
  "amount": 1000,
  "currency": "INR"
}
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port already in use | Kill process: `lsof -i :3001` then `kill -9 <PID>` |
| Docker containers not starting | `npm run docker:down -v` then `npm run docker:up` |
| Database migration errors | `npx prisma db push --force-reset` (data loss!) |
| Kafka not ready | Wait 30-60 seconds, check `docker-compose logs kafka` |
| Module not found errors | `rm -rf node_modules && npm install --workspaces` |

---

## Full Documentation

- **Setup Guide**: [PHASE1_SETUP.md](./PHASE1_SETUP.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Reference**: [README.md](./README.md)
- **Files Inventory**: [FILES.md](./FILES.md)

---

## Key Features

✅ **Atomic Payments** - Debit and credit together or not at all  
✅ **Idempotency** - Same request returns same result (24-hour TTL)  
✅ **No Double-Spending** - Row-level locking prevents race conditions  
✅ **Event-Driven** - Async settlement via Kafka  
✅ **Safe Money** - Decimal arithmetic, never floating-point  
✅ **Error Handling** - Clear error messages, standardized format  
✅ **Logging** - Structured logs with transaction context  
✅ **Documentation** - OpenAPI/Swagger at `/api-docs`  

---

## Next Steps

1. ✅ System running? Confirm all health checks pass
2. 📝 Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand design
3. 🧪 Run `npm run test --workspaces` to verify correctness
4. 🚀 Deploy to Kubernetes (Phase 2)

---

**Welcome to SwiftPay!** 🚀

Questions? Check [PHASE1_SETUP.md](./PHASE1_SETUP.md#troubleshooting) troubleshooting section.
