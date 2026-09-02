# Load Testing with k6

Use k6 to simulate concurrent payment submission volume against the transaction gateway.

## Quick start

```bash
k6 run scripts/load-test.js
```

## Notes

- Keep the test environment isolated from production data.
- Start with low concurrency and gradually increase to observe ledger saturation.
- Track latency, Kafka lag, and PostgreSQL lock contention while increasing load.
