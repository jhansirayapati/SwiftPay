# SwiftPay Deployment Checklist

Complete this checklist to run SwiftPay Phase 1.

---

## Prerequisites ✓

- [ ] Node.js 18+ installed
- [ ] npm 9+ installed
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] 8GB RAM available
- [ ] Ports 5432, 6379, 2181, 9092, 3001, 3002 available
- [ ] Git (optional, for version control)

**Verify:**
```bash
node --version
npm --version
docker --version
docker-compose --version
```

---

## Installation Phase

### 1. Dependencies
- [ ] Clone/navigate to SwiftPay directory
- [ ] `npm install --workspaces`
- [ ] `npm run prisma:generate`

**Verify:**
```bash
ls -la node_modules | grep -E "express|prisma|kafkajs|redis"
```

### 2. Environment Setup
- [ ] Copy `.env.example` to `.env` (or use `.env.local`)
- [ ] Verify database credentials: `swiftpay:swiftpay123`
- [ ] Verify Kafka broker: `localhost:9092`
- [ ] Verify Redis URL: `redis://localhost:6379`

**Verify:**
```bash
cat .env
# Should show all variables with correct values
```

---

## Infrastructure Phase

### 3. Docker Startup
- [ ] `npm run docker:up`
- [ ] Wait for "PostgreSQL is healthy"
- [ ] Wait for "Redis is healthy"
- [ ] Wait for "Kafka is healthy"

**Verify in separate terminal:**
```bash
docker-compose ps
# All services should show "Up" and "healthy"
```

### 4. Database Initialization
- [ ] `npm run prisma:migrate`
- [ ] `npm run prisma:seed`
- [ ] Verify seed completed

**Verify:**
```bash
docker-compose exec postgres psql -U swiftpay -d swiftpay -c "SELECT COUNT(*) FROM \"User\";"
# Should show: 3 (Alice, Bob, Charlie)
```

---

## Services Phase

### 5. Transaction Gateway
- [ ] Open new terminal
- [ ] `cd services/transaction-gateway`
- [ ] `npm run dev`
- [ ] Wait for "Server running on port 3001"
- [ ] Verify no errors in logs

**In another terminal, verify:**
```bash
curl http://localhost:3001/health
# Should return: {"status":"UP"}
```

### 6. Ledger Service
- [ ] Open another new terminal
- [ ] `cd services/ledger-service`
- [ ] `npm run dev`
- [ ] Wait for "Server running on port 3002"
- [ ] Wait for "Consuming PaymentInitiated events..."
- [ ] Verify no errors in logs

**In another terminal, verify:**
```bash
curl http://localhost:3002/health
# Should return: {"status":"UP"}
```

---

## Verification Phase

### 7. Health Checks
- [ ] `curl http://localhost:3001/health` → `{"status":"UP"}`
- [ ] `curl http://localhost:3002/health` → `{"status":"UP"}`

### 8. Swagger Documentation
- [ ] Visit http://localhost:3001/api-docs → Page loads
- [ ] Visit http://localhost:3002/api-docs → Page loads
- [ ] Can see all endpoints documented

### 9. Payment Flow Test
- [ ] Send test payment to `/v1/payments`
- [ ] Verify response: HTTP 202 Accepted
- [ ] Verify response includes: transactionId, status="PENDING"
- [ ] Wait 2 seconds
- [ ] Query `/v1/users/user_001/transactions`
- [ ] Verify status changed to "COMPLETED"

**Test commands:**
```bash
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_verify_001",
    "sender_id": "user_001",
    "receiver_id": "user_002",
    "amount": 100,
    "currency": "INR"
  }'

sleep 2

curl http://localhost:3002/v1/users/user_001/transactions
```

### 10. Database Verification
- [ ] Balances updated correctly
- [ ] Transaction status changed to COMPLETED
- [ ] No error logs in service terminals

**Check:**
```bash
docker-compose exec postgres psql -U swiftpay -d swiftpay -c \
  "SELECT transactionId, status, amount FROM \"Transaction\" ORDER BY createdAt DESC LIMIT 1;"
# Should show: txn_verify_001 | COMPLETED | 100.00
```

---

## Test Scenarios Phase

### 11. Idempotency Test
- [ ] Send same transaction twice
- [ ] Verify second request returns same result (HTTP 200)
- [ ] Verify balance didn't double-debit

**Commands:**
```bash
# First request
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_idempotent_test",
    "sender_id": "user_001",
    "receiver_id": "user_003",
    "amount": 50,
    "currency": "INR"
  }'

# Second request (same transaction_id)
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_idempotent_test",
    "sender_id": "user_001",
    "receiver_id": "user_003",
    "amount": 50,
    "currency": "INR"
  }'
```

### 12. Insufficient Balance Test
- [ ] Try to send more than balance
- [ ] Verify response: HTTP 402 Payment Required
- [ ] Verify transaction status: FAILED
- [ ] Verify sender balance unchanged

**Commands:**
```bash
curl -X POST http://localhost:3001/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_insufficient_test",
    "sender_id": "user_002",
    "receiver_id": "user_001",
    "amount": 1000000,
    "currency": "INR"
  }'
```

### 13. Validation Test
- [ ] Send invalid JSON → HTTP 400
- [ ] Send missing fields → HTTP 400
- [ ] Send negative amount → HTTP 400
- [ ] Send same sender/receiver → HTTP 400

### 14. Transaction History Test
- [ ] Query: `GET /v1/users/user_001/transactions`
- [ ] Verify returns array of transactions
- [ ] Verify includes pagination (page, limit, total)
- [ ] Try filtering: `?status=COMPLETED`
- [ ] Try pagination: `?page=1&limit=10`

---

## Performance Phase

### 15. Concurrent Payments
- [ ] Run tests: `npm run test --workspaces`
- [ ] Verify all tests pass
- [ ] Verify no race condition failures
- [ ] Check logs for concurrency handling

**Commands:**
```bash
npm run test --workspaces
# Should see: "all tests passed" or similar
```

---

## Cleanup & Monitoring

### 16. Log Review
- [ ] Check Transaction Gateway logs for errors
- [ ] Check Ledger Service logs for errors
- [ ] Check Docker logs: `npm run docker:logs`
- [ ] Verify no "FAILED" or "ERROR" in critical paths

### 17. Kafka Inspection (Optional)
- [ ] Verify events published: 
  ```bash
  docker-compose exec kafka kafka-console-consumer \
    --bootstrap-server localhost:9092 \
    --topic swiftpay.payment.initiated \
    --from-beginning \
    --max-messages 5
  ```
- [ ] Verify events consumed without errors

### 18. Database Inspection (Optional)
- [ ] Launch Prisma Studio: `npm run prisma:studio`
- [ ] Browse Users table → verify balances
- [ ] Browse Transactions table → verify status changes
- [ ] Close browser or Ctrl+C

---

## Going Live Checklist

- [ ] All health checks passing
- [ ] All test scenarios working
- [ ] No errors in service logs
- [ ] Database showing correct balances
- [ ] Kafka events flowing
- [ ] Response times acceptable (<100ms for idempotency)
- [ ] Error handling working for edge cases
- [ ] Documentation reviewed
- [ ] ARCHITECTURE.md understood
- [ ] README.md API examples work

---

## Troubleshooting Quick Reference

| Symptom | Solution |
|---------|----------|
| "Port already in use" | Kill process or use different port |
| "Docker container failed" | Check `docker-compose logs <service>` |
| "Database connection error" | Verify DATABASE_URL in .env |
| "Kafka not connecting" | Wait 30-60 seconds, Kafka is slow to start |
| "Transaction stays PENDING" | Check Ledger Service is running |
| "Idempotency not working" | Check Redis is running: `docker-compose logs redis` |
| "Balance incorrect" | Check no concurrent payments interfered |

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Payment creation | < 100ms | Gateway only |
| Settlement time | 1-2 seconds | Via Kafka |
| Idempotency check | < 10ms | Redis GET |
| Transaction history | < 50ms | Indexed query |
| Concurrent payments | ✅ Safe | Row-level locking |

---

## Success Criteria

✅ All health checks pass  
✅ Payment flow completes: 202 → COMPLETED  
✅ Idempotency works: duplicate requests return 200 OK  
✅ Balance verification: funds deducted and credited  
✅ Insufficient funds: transaction marked FAILED  
✅ Logs show no errors  
✅ All tests pass  
✅ API documentation complete  

---

## Next Steps After Verification

1. **Understand**: Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Explore**: Browse Swagger docs
3. **Optimize**: Run load tests (Phase 2)
4. **Deploy**: Configure for production (Phase 2)
5. **Monitor**: Set up observability (Phase 2)

---

## Support Resources

- **Setup Issues**: [PHASE1_SETUP.md](./PHASE1_SETUP.md#troubleshooting)
- **API Questions**: [README.md](./README.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Quick Start**: [QUICKSTART.md](./QUICKSTART.md)
- **File Guide**: [FILES.md](./FILES.md)

---

**Checklist Date**: [Fill in when you start]  
**Completion Date**: [Fill in when you finish]  
**Status**: [ ] PASS | [ ] FAIL

If FAIL, document issues above and in troubleshooting section.

---

**You're ready to go! 🚀**
