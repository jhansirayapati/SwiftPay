import { Kafka, Consumer, Producer, logLevel } from 'kafkajs';
import { config } from './env';
import { logger } from '../middleware/logger';

let consumer: Consumer | null = null;
let producer: Producer | null = null;

export const initializeKafkaConsumer = async (): Promise<Consumer> => {
  if (consumer) return consumer;

  const kafka = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers,
    logLevel: config.logging.level === 'debug' ? logLevel.DEBUG : logLevel.INFO,
  });

  consumer = kafka.consumer({ groupId: config.kafka.groupId });
  consumer.on('consumer.connect', () => logger.info('Analytics Kafka consumer connected'));
  consumer.on('consumer.disconnect', () => logger.warn('Analytics Kafka consumer disconnected'));
  await consumer.connect();
  return consumer;
};

export const initializeKafkaProducer = async (): Promise<Producer> => {
  if (producer) return producer;

  const kafka = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers,
    logLevel: config.logging.level === 'debug' ? logLevel.DEBUG : logLevel.INFO,
  });

  producer = kafka.producer();
  producer.on('producer.connect', () => logger.info('Analytics Kafka producer connected'));
  producer.on('producer.disconnect', () => logger.warn('Analytics Kafka producer disconnected'));
  await producer.connect();
  return producer;
};

export const getKafkaConsumer = (): Consumer => {
  if (!consumer) throw new Error('Analytics Kafka consumer not initialized');
  return consumer;
};

export const getKafkaProducer = (): Producer => {
  if (!producer) throw new Error('Analytics Kafka producer not initialized');
  return producer;
};

export const disconnectKafkaConsumer = async (): Promise<void> => {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    logger.info('Analytics Kafka consumer disconnected');
  }
};

export const disconnectKafkaProducer = async (): Promise<void> => {
  if (producer) {
    await producer.disconnect();
    producer = null;
    logger.info('Analytics Kafka producer disconnected');
  }
};
