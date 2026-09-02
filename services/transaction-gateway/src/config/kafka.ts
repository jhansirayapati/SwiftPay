import { Kafka, Producer, logLevel } from 'kafkajs';
import { config } from './env';
import { logger } from '../middleware/logger';

let producer: Producer | null = null;

export const initializeKafkaProducer = async (): Promise<Producer> => {
  if (producer) {
    return producer;
  }

  const kafka = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers,
    logLevel: config.logging.level === 'debug' ? logLevel.DEBUG : logLevel.INFO,
  });

  producer = kafka.producer();

  producer.on('producer.connect', () => {
    logger.info('Kafka producer connected');
  });

  producer.on('producer.disconnect', () => {
    logger.warn('Kafka producer disconnected');
  });

  producer.on('producer.network.request_timeout', () => {
    logger.error('Kafka producer network request timeout');
  });

  await producer.connect();

  return producer;
};

export const getKafkaProducer = (): Producer => {
  if (!producer) {
    throw new Error('Kafka producer not initialized');
  }
  return producer;
};

export const disconnectKafkaProducer = async (): Promise<void> => {
  if (producer) {
    await producer.disconnect();
    producer = null;
    logger.info('Kafka producer disconnected');
  }
};
