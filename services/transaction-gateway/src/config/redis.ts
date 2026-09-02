import { createClient, type RedisClientType } from 'redis';
import { config } from './env';
import { logger } from '../middleware/logger';

let redisClient: RedisClientType | null = null;

export const initializeRedis = async (): Promise<RedisClientType> => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnection failed after 10 retries');
          return new Error('Redis reconnection failed');
        }
        return retries * 100;
      },
    },
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected');
  });

  redisClient.on('error', (err: Error) => {
    logger.error('Redis error:', err);
  });

  redisClient.on('reconnecting', () => {
    logger.warn('Redis reconnecting...');
  });

  await redisClient.connect();

  return redisClient;
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
    logger.info('Redis disconnected');
  }
};