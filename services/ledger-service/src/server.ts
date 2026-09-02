import { createApp } from './app';
import { config, validateConfig } from './config/env';
import {
  initializeKafkaConsumer,
  initializeKafkaProducer,
  disconnectKafkaConsumer,
  disconnectKafkaProducer,
} from './config/kafka';
import { logger } from './middleware/logger';
import { getPaymentConsumer } from './kafka/consumer';

const startServer = async (): Promise<void> => {
  try {
    // Validate configuration
    validateConfig();

    // Initialize Kafka
    logger.info('Initializing Kafka consumer...');
    await initializeKafkaConsumer();

    logger.info('Initializing Kafka producer...');
    await initializeKafkaProducer();

    // Subscribe to payment initiated events
    const paymentConsumer = getPaymentConsumer();
    await paymentConsumer.subscribe();

    // Start processing Kafka messages in background
    paymentConsumer.processMessages().catch((err) => {
      logger.error({ error: err }, 'Kafka consumer error');
      process.exit(1);
    });

    // Create Express app
    const app = createApp();

    // Start HTTP server
    const port = config.node.port;
    app.listen(port, () => {
      logger.info(`Ledger Service started on port ${port}`);
      logger.info(`Environment: ${config.node.env}`);
      logger.info(`API documentation available at http://localhost:${port}/api-docs`);
      logger.info('Consuming PaymentInitiated events from Kafka...');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await disconnectKafkaConsumer();
        await disconnectKafkaProducer();
        logger.info('All connections closed');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during graceful shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start Ledger Service');
    process.exit(1);
  }
};

startServer();
