/**
 * In-Memory Cache Utility
 *
 * Simple TTL-based cache for expensive database queries.
 * Uses Map with automatic expiration.
 *
 * Usage:
 *   const cache = require('./utils/cache');
 *
 *   // Get or set with async function
 *   const data = await cache.getOrSet('homepage:series', async () => {
 *     return await Series.find().lean();
 *   }, 300); // 5 minutes TTL
 *
 *   // Manual operations
 *   cache.set('key', value, ttlSeconds);
 *   cache.get('key');
 *   cache.del('key');
 *   cache.clear(); // Clear all
 *   cache.invalidatePattern('homepage:*'); // Clear matching keys
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();

    // Default TTL: 5 minutes
    this.defaultTTL = 300;

    // Stats for monitoring
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const item = this.cache.get(key);
    if (item !== undefined) {
      this.stats.hits++;
      return item;
    }
    this.stats.misses++;
    return undefined;
  }

  /**
   * Set a value in cache with TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 300)
   */
  set(key, value, ttl = this.defaultTTL) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store the value
    this.cache.set(key, value);
    this.stats.sets++;

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl * 1000);

    // Don't let the timer prevent process exit
    timer.unref();

    this.timers.set(key, timer);
  }

  /**
   * Get cached value or compute and cache it
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to compute value if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<*>} Cached or computed value
   */
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  del(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Invalidate all keys matching a pattern
   * @param {string} pattern - Pattern with * wildcard (e.g., 'homepage:*')
   */
  invalidatePattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.del(key);
    }

    return keysToDelete.length;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) + '%'
        : 'N/A'
    };
  }

  /**
   * Get all cache keys (for debugging)
   * @returns {string[]}
   */
  keys() {
    return Array.from(this.cache.keys());
  }
}

// Export singleton instance
module.exports = new MemoryCache();
