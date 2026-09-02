import { createApp } from './app';
import { config, validateConfig } from './config/env';
import { initializeKafkaProducer, disconnectKafkaProducer } from './config/kafka';
import { initializeRedis, disconnectRedis } from './config/redis';
import { logger } from './middleware/logger';

const startServer = async (): Promise<void> => {
  try {
    // Validate configuration
    validateConfig();

    // Initialize connections
    logger.info('Initializing Redis...');
    await initializeRedis();

    logger.info('Initializing Kafka producer...');
    await initializeKafkaProducer();

    // Create Express app
    const app = createApp();

    // Start server
    const port = config.node.port;
    app.listen(port, () => {
      logger.info(`Transaction Gateway started on port ${port}`);
      logger.info(`Environment: ${config.node.env}`);
      logger.info(`API documentation available at http://localhost:${port}/api-docs`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await disconnectRedis();
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
    logger.error({ error }, 'Failed to start Transaction Gateway');
    process.exit(1);
  }
};

startServer();
