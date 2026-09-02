import { createClient, type RedisClientType } from 'redis';
import { config } from '../config/env';
import { logger } from '../middleware/logger';

let redisClient: RedisClientType | null = null;

const BALANCE_CACHE_TTL_SECONDS = Number(process.env.BALANCE_CACHE_TTL_SECONDS || '60');

export const initializeRedis = async (): Promise<RedisClientType> => {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 5) {
          logger.warn('Redis reconnect limit reached; continuing without Redis cache');
          return new Error('Redis reconnect limit reached');
        }
        return retries * 200;
      },
    },
  });

  redisClient.on('connect', () => logger.info('Redis connected for ledger cache'));
  redisClient.on('error', (err: Error) => logger.error({ error: err.message }, 'Redis error while using balance cache'));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting for ledger cache'));

  await redisClient.connect();
  return redisClient;
};

export const getRedisClient = (): RedisClientType | null => redisClient;

export const getBalanceCacheKey = (userId: string): string => `user:balance:${userId}`;

export const getCachedBalance = async (userId: string): Promise<string | null> => {
  try {
    const client = getRedisClient();
    if (!client) return null;
    return await client.get(getBalanceCacheKey(userId));
  } catch (error) {
    logger.warn({ userId, error }, 'Redis balance cache unavailable; falling back to PostgreSQL');
    return null;
  }
};

export const setCachedBalance = async (userId: string, amount: string): Promise<void> => {
  try {
    const client = getRedisClient();
    if (!client) return;
    await client.set(getBalanceCacheKey(userId), amount, { EX: BALANCE_CACHE_TTL_SECONDS });
  } catch (error) {
    logger.warn({ userId, error }, 'Redis balance cache update failed; PostgreSQL remains source of truth');
  }
};

export const invalidateUserBalanceCache = async (userId: string): Promise<void> => {
  try {
    const client = getRedisClient();
    if (!client) return;
    await client.del(getBalanceCacheKey(userId));
    logger.info({ userId }, 'Invalidated user balance cache after successful commit');
  } catch (error) {
    logger.warn({ userId, error }, 'Redis cache invalidation failed after successful commit');
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
    logger.info('Redis disconnected');
  }
};
