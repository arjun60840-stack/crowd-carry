import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let redis: Redis | null = null;
let isRedisConnected = false;

// Fallback in-memory cache
const memoryCache = new Map<string, { value: string; expiry: number | null }>();

try {
  logger.info(`Initializing Redis client connecting to: ${REDIS_URL}`);
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    retryStrategy(times) {
      // Limit retries so we don't spam logs or hang the server startup
      if (times > 3) {
        logger.warn('Redis connection failed too many times. Continuing with Memory Cache Fallback.');
        return null; // Stop retrying
      }
      return Math.min(times * 100, 2000);
    }
  });

  redis.on('connect', () => {
    isRedisConnected = true;
    logger.info('✅ Redis connected successfully.');
  });

  redis.on('error', (err) => {
    isRedisConnected = false;
    logger.warn(`⚠️ Redis error: ${err.message}. Using In-Memory Cache Fallback.`);
  });
} catch (err: any) {
  logger.error('Failed to create Redis instance:', err);
}

/**
 * Cache GET operation with fallback
 */
export async function cacheGet(key: string): Promise<string | null> {
  if (isRedisConnected && redis) {
    try {
      return await redis.get(key);
    } catch (err) {
      logger.warn(`Redis GET failed for key ${key}:`, err);
    }
  }

  // Memory fallback
  const cached = memoryCache.get(key);
  if (!cached) return null;

  // Check TTL
  if (cached.expiry && cached.expiry < Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return cached.value;
}

/**
 * Cache SET operation with fallback and TTL in seconds
 */
export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (isRedisConnected && redis) {
    try {
      if (ttlSeconds) {
        await redis.set(key, value, 'EX', ttlSeconds);
      } else {
        await redis.set(key, value);
      }
      return;
    } catch (err) {
      logger.warn(`Redis SET failed for key ${key}:`, err);
    }
  }

  // Memory fallback
  const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  memoryCache.set(key, { value, expiry });
}

/**
 * Cache DELETE operation with fallback
 */
export async function cacheDel(key: string): Promise<void> {
  if (isRedisConnected && redis) {
    try {
      await redis.del(key);
      return;
    } catch (err) {
      logger.warn(`Redis DEL failed for key ${key}:`, err);
    }
  }

  memoryCache.delete(key);
}

/**
 * Cache FLUSH operation (clear all)
 */
export async function cacheFlush(): Promise<void> {
  if (isRedisConnected && redis) {
    try {
      await redis.flushall();
      return;
    } catch (err) {
      logger.warn('Redis FLUSHALL failed:', err);
    }
  }

  memoryCache.clear();
}
