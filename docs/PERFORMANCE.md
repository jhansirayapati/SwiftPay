# SwiftPay Performance Report

## 1. Overview

SwiftPay was performance tested using **k6** against the Transaction Gateway payment endpoint.

The primary benchmark target was **250 TPS** with a latency target of **p95 < 500 ms** and zero dropped iterations.

The performance test validates the ability of the gateway to sustain a constant incoming request rate while maintaining predictable response latency.

---

## 2. Test Environment

| Component        | Configuration        |
| ---------------- | -------------------- |
| Load Generator   | k6 v2.2.0            |
| Runtime          | Node.js              |
| API              | Express / TypeScript |
| Database         | PostgreSQL           |
| Messaging        | Apache Kafka         |
| Cache            | Redis                |
| Containerization | Docker Compose       |
| Gateway Port     | 3001                 |
| Ledger Port      | 3002                 |
| Analytics Port   | 3003                 |

### Infrastructure

```text
swiftpay-gateway
swiftpay-ledger
swiftpay-analytics
swiftpay-postgres
swiftpay-kafka
swiftpay-zookeeper
swiftpay-redis
```

---

## 3. Benchmark Configuration

The k6 test uses a constant-arrival-rate executor.

| Parameter              |      Value |
| ---------------------- | ---------: |
| Target throughput      |    250 TPS |
| Test duration          | 60 seconds |
| Expected requests      |    ~15,000 |
| Pre-allocated VUs      |        100 |
| Maximum VUs            |        500 |
| Request timeout        | 10 seconds |
| p95 latency target     |   < 500 ms |
| HTTP failure threshold |       < 1% |
| Dropped iterations     |          0 |

Load-test script:

```text
scripts/load-test.js
```

Command:

```powershell
& "C:\Program Files\k6\k6.exe" run scripts/load-test.js
```

---

# 4. Latest 250 TPS Benchmark

The latest load test successfully generated approximately the configured 250 TPS arrival rate.

### Results

| Metric              |         Result |
| ------------------- | -------------: |
| Total requests      |     **15,001** |
| Achieved throughput | **249.98 TPS** |
| Dropped iterations  |          **0** |
| Minimum latency     |    **2.64 ms** |
| Average latency     |   **17.37 ms** |
| Median latency      |    **8.49 ms** |
| p90 latency         |   **41.26 ms** |
| p95 latency         |   **55.98 ms** |
| p99 latency         |  **102.83 ms** |
| Maximum latency     |  **279.11 ms** |
| HTTP failure rate   |       **100%** |

---

# 5. Result Analysis

The load generator successfully sustained the target arrival rate:

```text
Target:    250 TPS
Achieved:  249.98 TPS
```

No iterations were dropped:

```text
Dropped iterations: 0
```

The observed p95 latency was:

```text
55.98 ms
```

which is below the configured target of:

```text
500 ms
```

However, the latest test returned:

```text
HTTP 402 - INSUFFICIENT_FUNDS
```

because the sender test account exhausted its available balance during the benchmark.

Therefore, this run demonstrates **250 TPS gateway throughput and low-latency handling of the rejection path**.

It should **not** be represented as a successful-payment settlement benchmark.

---

# 6. Successful Payment Load Test

An earlier load test was executed using valid test accounts while payment processing was active.

Results:

| Metric              |      Result |
| ------------------- | ----------: |
| Total requests      |      14,754 |
| Achieved throughput |  237.38 TPS |
| HTTP failure rate   |          0% |
| Dropped iterations  |         251 |
| p95 latency         |   755.54 ms |
| p99 latency         | 2,133.70 ms |
| Maximum latency     | 2,541.79 ms |

This test demonstrated successful HTTP processing but did not meet the configured 250 TPS and p95 latency acceptance criteria.

The result also demonstrates that the successful payment path performs more work than the insufficient-funds rejection path because it involves asynchronous settlement and database operations.

---

# 7. Acceptance Criteria

| Requirement                     |   Target |   Latest Result | Status |
| ------------------------------- | -------: | --------------: | ------ |
| Throughput                      |  250 TPS |      249.98 TPS | ✅      |
| Dropped iterations              |        0 |               0 | ✅      |
| p95 latency                     | < 500 ms |        55.98 ms | ✅      |
| HTTP failure rate               |     < 1% |            100% | ❌      |
| Successful payment benchmark    | Required | Not established | ⚠️     |
| 1,000,000 transaction benchmark | Required |    Not executed | ⚠️     |

---

# 8. Payment Endpoint

The benchmark targets:

```text
POST http://localhost:3001/v1/payments
```

Example request:

```json
{
  "transaction_id": "loadtest-unique-id",
  "sender_id": "user_001",
  "receiver_id": "user_002",
  "amount": 25.5,
  "currency": "INR"
}
```

A successfully accepted payment returns:

```text
HTTP 202 Accepted
```

Example:

```json
{
  "transactionId": "loadtest-unique-id",
  "status": "PENDING"
}
```

The `202 Accepted` response indicates that the Transaction Gateway accepted the payment and queued it for asynchronous settlement. It does not indicate that ledger settlement has already completed.

---

# 9. Architecture Under Test

```text
k6
 │
 │ POST /v1/payments
 ▼
Transaction Gateway
 │
 ├── Request validation
 ├── Idempotency check
 ├── Sender/receiver validation
 ├── Balance validation
 └── Create PENDING transaction
 │
 ▼
Kafka
 │
 │ PaymentInitiated
 ▼
Ledger Service
 │
 ├── Load transaction
 ├── BEGIN database transaction
 ├── Lock sender row
 ├── Verify balance
 ├── Debit sender
 ├── Credit receiver
 ├── Mark transaction COMPLETED
 └── COMMIT
 │
 ▼
PostgreSQL
```

Redis supports idempotency handling and Kafka provides asynchronous event-driven communication.

---

# 10. Performance and Observability

SwiftPay uses an event-driven architecture separating payment acceptance, settlement, and analytics processing.

The main areas monitored during performance testing include:

* Gateway throughput
* Gateway request latency
* p90/p95/p99 latency
* HTTP failure rate
* Dropped iterations
* Payment acceptance and rejection behavior
* Service logs
* Kafka event flow
* PostgreSQL transaction processing

Structured application logging is implemented using Pino with transaction context.

For larger deployments, additional monitoring can be introduced for:

* Kafka consumer lag
* PostgreSQL lock contention
* PostgreSQL connection pools
* Redis latency
* Node.js CPU and memory utilization
* Container resource utilization
* Distributed tracing

---

# 11. 1,000,000 Transaction Benchmark

The full 1,000,000 transaction benchmark was **not executed in the current measured test results**.

At a constant rate of 250 TPS:

```text
1,000,000 / 250
= 4,000 seconds
= 66 minutes 40 seconds
```

A complete 1M benchmark should be executed separately using sufficient test-account balance and its actual results should be recorded.

No estimated 1M performance numbers are reported here.

---

# 12. Conclusion

The SwiftPay performance test infrastructure is operational.

The latest 250 TPS benchmark achieved:

```text
249.98 TPS
0 dropped iterations
55.98 ms p95 latency
102.83 ms p99 latency
279.11 ms maximum latency
```

The latest run exercised the insufficient-funds rejection path because the sender account exhausted its test balance.

The benchmark therefore confirms that the gateway can sustain approximately **250 TPS at low response latency on the tested rejection path**, while a successful-payment benchmark at the same target requires sufficient test data balance and separate validation.

The full 1,000,000 transaction benchmark remains an additional test and has not been claimed as completed.
