import dotenv from 'dotenv';

dotenv.config();

export const config = {
  node: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.LEDGER_SERVICE_PORT || '3002', 10),
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://swiftpay:swiftpay123@localhost:5432/swiftpay',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'ledger-service',
    groupId: process.env.KAFKA_GROUP_ID || 'swiftpay-ledger-service',
    retryAttempts: Number(process.env.KAFKA_RETRY_ATTEMPTS || '5'),
    retryInitialDelayMs: Number(process.env.KAFKA_RETRY_INITIAL_DELAY_MS || '1000'),
    retryMaxDelayMs: Number(process.env.KAFKA_RETRY_MAX_DELAY_MS || '30000'),
    dlqTopic: process.env.KAFKA_DLQ_TOPIC || 'swiftpay.payment.initiated.dlq',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export const validateConfig = (): void => {
  const required = ['DATABASE_URL', 'KAFKA_BROKERS'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
};
