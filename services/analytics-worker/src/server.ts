import { createApp } from './app';
import { config, validateConfig } from './config/env';
import { initializeKafkaConsumer, disconnectKafkaConsumer, disconnectKafkaProducer, initializeKafkaProducer } from './config/kafka';
import { startAnalyticsConsumer } from './kafka/consumer';
import { logger } from './middleware/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const startServer = async (): Promise<void> => {
  try {
    validateConfig();
    await initializeKafkaProducer();
    await initializeKafkaConsumer();
    await startAnalyticsConsumer();

    const app = createApp();
    const port = config.node.port;
    const server = app.listen(port, () => {
      logger.info(`Analytics Worker started on port ${port}`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
        await disconnectKafkaConsumer();
        await disconnectKafkaProducer();
        await prisma.$disconnect();
        logger.info('Analytics shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during analytics shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start Analytics Worker');
    process.exit(1);
  }
};

startServer();
