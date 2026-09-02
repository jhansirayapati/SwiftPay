import dotenv from 'dotenv';

dotenv.config();

export const config = {
  node: {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.ANALYTICS_WORKER_PORT || '3003'),
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://swiftpay:swiftpay123@localhost:5432/swiftpay',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'analytics-worker',
    groupId: process.env.KAFKA_GROUP_ID || 'swiftpay-analytics-group',
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
