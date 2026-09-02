# Performance and Observability

SwiftPay is designed for a simple distributed event-driven architecture where:

- the gateway validates and publishes payment intent events,
- the ledger service performs atomic settlement,
- the analytics worker consumes completion events for reporting.

## Key metrics to watch

- Gateway p95 latency
- Kafka lag per topic
- Redis cache hit rate for balance metadata
- PostgreSQL lock wait time during settlement
- Payment completion rate and failure rate

## Benchmark guidance

- Use load runs to tune batch sizes and Kafka producer acks.
- Keep Redis TTL short and deterministic for idempotent balance refreshes.
- Favor resource isolation for Postgres and Kafka in larger deployments.
