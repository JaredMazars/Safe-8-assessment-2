import Redis from 'ioredis';
import logger from '../utils/logger.js';
import MemoryCache from './memoryCache.js';

/**
 * Redis Cache Configuration
 * Implements caching layer for improved performance and scalability
 * Falls back to in-memory cache if Redis is unavailable
 */

// Check if Redis should be used
const useRedis = process.env.USE_REDIS !== 'false' && 
                 process.env.REDIS_HOST !== undefined;

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    // Stop retrying after 3 attempts and fall back to memory cache
    if (times > 3) {
      logger.warn('Redis connection failed after 3 attempts, using memory cache');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  connectTimeout: 5000,
};

// Create Redis client or memory cache fallback
let redis;
let usingMemoryCache = false;

if (useRedis) {
  redis = new Redis(redisConfig);
} else {
  logger.info('Redis disabled, using in-memory cache');
  redis = new MemoryCache();
  usingMemoryCache = true;
}

// Connection event handlers (only for Redis, not memory cache)
if (!usingMemoryCache) {
  redis.on('connect', () => {
    logger.info('Redis client connecting');
  });

  redis.on('ready', () => {
    logger.info('Redis client ready');
    usingMemoryCache = false;
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
    // Don't log repeatedly for connection errors
  });

  redis.on('close', () => {
    if (!usingMemoryCache) {
      logger.warn('Redis connection closed, falling back to memory cache');
      // Switch to memory cache on connection close
      redis = new MemoryCache();
      usingMemoryCache = true;
    }
  });

  redis.on('reconnecting', () => {
    logger.debug('Redis client reconnecting');
  });
}

/**
 * Connect to Redis (or use memory cache)
 * @returns {Promise<void>}
 */
export const connectRedis = async () => {
  if (usingMemoryCache) {
    logger.info('Using in-memory cache (no Redis connection needed)');
    return;
  }

  try {
    await redis.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.warn('Failed to connect to Redis, falling back to memory cache', { error: error.message });
    // Fall back to memory cache
    redis = new MemoryCache();
    usingMemoryCache = true;
  }
};

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      if (usingMemoryCache) {
        return await redis.get(key);
      }
      
      const value = await redis.get(key);
      if (value) {
        logger.debug('Cache hit', { key, source: usingMemoryCache ? 'memory' : 'redis' });
        return JSON.parse(value);
      }
      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null; // Fail gracefully
    }
  },

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = 300) {
    try {
      if (usingMemoryCache) {
        return await redis.set(key, value, ttl);
      }
      
      await redis.setex(key, ttl, JSON.stringify(value));
      logger.debug('Cache set', { key, ttl, source: 'redis' });
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  },

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async del(key) {
    try {
      await redis.del(key);
      logger.debug('Cache deleted', { key });
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  },

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Pattern to match (e.g., 'assessments:*')
   * @returns {Promise<number>}
   */
  async delPattern(pattern) {
    try {
      if (usingMemoryCache) {
        return await redis.delPattern(pattern);
      }

      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug('Cache pattern deleted', { pattern, count: keys.length });
        return keys.length;
      }
      return 0;
    } catch (error) {
      logger.error('Cache pattern delete error', { pattern, error: error.message });
      return 0;
    }
  },

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      if (usingMemoryCache) {
        return await redis.exists(key);
      }
      
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error: error.message });
      return false;
    }
  },

  /**
   * Increment counter
   * @param {string} key - Cache key
   * @param {number} amount - Amount to increment (default: 1)
   * @returns {Promise<number>}
   */
  async incr(key, amount = 1) {
    try {
      if (usingMemoryCache) {
        return await redis.incr(key, amount);
      }

      const result = await redis.incrby(key, amount);
      return result;
    } catch (error) {
      logger.error('Cache increment error', { key, error: error.message });
      return 0;
    }
  },

  /**
   * Set expiration on key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async expire(key, ttl) {
    try {
      if (usingMemoryCache) {
        return await redis.expire(key, ttl);
      }

      await redis.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Cache expire error', { key, error: error.message });
      return false;
    }
  },

  /**
   * Get cache statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      if (usingMemoryCache) {
        return await redis.getStats();
      }
      
      const info = await redis.info('stats');
      const dbsize = await redis.dbsize();
      return {
        connected: redis.status === 'ready',
        type: 'redis',
        dbsize,
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Cache stats error', { error: error.message });
      return { connected: false };
    }
  }
};

/**
 * Get cache type and status
 * @returns {Object}
 */
export const getCacheInfo = () => {
  return {
    type: usingMemoryCache ? 'memory' : 'redis',
    status: usingMemoryCache ? 'ready' : redis.status,
    description: usingMemoryCache 
      ? 'In-memory cache (data lost on restart)'
      : 'Redis cache (persistent)'
  };
};

/**
 * Cache middleware for Express routes
 * @param {number} ttl - Time to live in seconds
 * @returns {Function} Express middleware
 */
export const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `route:${req.originalUrl}`;
    
    try {
      const cachedResponse = await cache.get(cacheKey);
      
      if (cachedResponse) {
        logger.info('Serving from cache', { url: req.originalUrl });
        return res.json(cachedResponse);
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = (body) => {
        cache.set(cacheKey, body, ttl).catch(err => 
          logger.error('Failed to cache response', { error: err.message })
        );
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next(); // Continue without caching
    }
  };
};

export default redis;
