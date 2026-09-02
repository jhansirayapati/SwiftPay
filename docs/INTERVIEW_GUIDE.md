# SwiftPay Interview Guide

## Core architecture story

SwiftPay is an event-driven payment ledger built around an atomic settlement pattern. The transaction gateway validates requests and enforces idempotency before publishing a `PaymentInitiated` event. The ledger service owns the PostgreSQL transaction state and performs atomic sender debit + receiver credit operations under row locks. Kafka fans out completion and failure events to downstream consumers, and the analytics worker stores completed payment summaries for reporting.

## Financial correctness principles

- PostgreSQL is the source of truth.
- Redis is only a cache and never the ledger authority.
- The ledger update is atomic under a single database transaction.
- The user balance cache is invalidated only after successful commit.
- Kafka processing includes retry logic with a dead-letter queue after retry exhaustion.

## Expected questions and answers

### How do you prevent duplicate payments?
Use a request-level idempotency key keyed by `transaction_id` and verify payload hashes before processing a new payment.

### What happens if Kafka retries fail repeatedly?
The ledger consumer retries with exponential backoff and then publishes the event to the configured DLQ topic after the retry budget is exhausted.

### What is the role of Redis?
Redis caches user balance metadata and helps avoid repeated reads, but the actual balance state remains in PostgreSQL.

### Why is PostgreSQL locking important?
Row-level locking guarantees no concurrent transfers can overspend the same account while settlement is happening.
