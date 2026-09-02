# Kubernetes Deployment Notes

SwiftPay is structured as a small event-driven deployment with three services:

- transaction-gateway on port 3001
- ledger-service on port 3002
- analytics-worker on port 3003

## Required dependencies

The workloads expect Postgres, Redis, and Kafka to be available in the cluster. In local Docker Compose, these are exposed as the service names `postgres`, `redis`, and `kafka`.

## Deploying the manifests

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/services.yaml
```

## Operational notes

- The ledger service uses PostgreSQL as the source of truth.
- Redis is treated as a cache only for user balance metadata and must be invalidated after successful settlement commits.
- Kafka is responsible for asynchronous communication between gateway, ledger, and analytics.
- A retry/DLQ policy is configured with exponential backoff on the ledger consumer.
