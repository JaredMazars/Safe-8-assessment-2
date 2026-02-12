/**
 * Simple in-memory cache fallback when Redis is not available
 * Provides same API as Redis cache but stores data in memory
 * Warning: Data is lost on server restart and not shared across instances
 */

import logger from '../utils/logger.js';

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    logger.info('Using in-memory cache (fallback mode)');
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      const item = this.cache.get(key);
      if (item) {
        logger.debug('Memory cache hit', { key });
        return item.value;
      }
      logger.debug('Memory cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Memory cache get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = 300) {
    try {
      // Clear existing timer if any
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }

      this.cache.set(key, { value, createdAt: Date.now() });
      
      // Set expiration timer
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
        logger.debug('Memory cache expired', { key });
      }, ttl * 1000);
      
      this.timers.set(key, timer);
      logger.debug('Memory cache set', { key, ttl });
      return true;
    } catch (error) {
      logger.error('Memory cache set error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async del(key) {
    try {
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      const deleted = this.cache.delete(key);
      if (deleted) {
        logger.debug('Memory cache deleted', { key });
      }
      return deleted;
    } catch (error) {
      logger.error('Memory cache delete error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   * @returns {Promise<number>}
   */
  async delPattern(pattern) {
    try {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      let count = 0;
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          await this.del(key);
          count++;
        }
      }
      
      logger.debug('Memory cache pattern deleted', { pattern, count });
      return count;
    } catch (error) {
      logger.error('Memory cache pattern delete error', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    return this.cache.has(key);
  }

  /**
   * Increment counter
   * @param {string} key - Cache key
   * @param {number} amount - Amount to increment
   * @returns {Promise<number>}
   */
  async incr(key, amount = 1) {
    try {
      const current = this.cache.get(key);
      const value = (current?.value || 0) + amount;
      this.cache.set(key, { value, createdAt: Date.now() });
      return value;
    } catch (error) {
      logger.error('Memory cache increment error', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Set expiration on key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async expire(key, ttl) {
    try {
      const item = this.cache.get(key);
      if (!item) return false;
      
      // Re-set with new TTL
      await this.set(key, item.value, ttl);
      return true;
    } catch (error) {
      logger.error('Memory cache expire error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    return {
      connected: true,
      type: 'memory',
      dbsize: this.cache.size,
      info: {
        keys: this.cache.size,
        timers: this.timers.size,
        memoryUsage: process.memoryUsage().heapUsed
      }
    };
  }

  /**
   * Clear all cache
   */
  async flushAll() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
    logger.info('Memory cache flushed');
  }
}

export default MemoryCache;
