/**
 * Redis Service
 *
 * Singleton service for Redis connection management and caching operations.
 * Provides graceful degradation if Redis is unavailable.
 */

import { createClient, RedisClientType } from 'redis';
import crypto from 'crypto';
import { getRedisConfig, RedisConfig, CACHE_VERSION } from '../config/redis';

/**
 * Redis Service Class
 * Manages Redis connection and provides caching methods
 */
class RedisService {
  private static instance: RedisService;
  private client: RedisClientType | null = null;
  private config: RedisConfig;
  private isConnected: boolean = false;
  private isEnabled: boolean = true;

  private constructor() {
    this.config = getRedisConfig();
    this.isEnabled = this.config.enabled;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Connect to Redis server
   */
  public async connect(): Promise<void> {
    if (!this.isEnabled) {
      console.log('📦 Redis caching is disabled');
      return;
    }

    if (this.isConnected && this.client) {
      console.log('✅ Redis already connected');
      return;
    }

    try {
      console.log('🔄 Connecting to Redis...');
      console.log(`📍 Redis URL: ${this.config.url.replace(/\/\/.*@/, '//***@')}`);

      this.client = createClient({
        url: this.config.url,
        password: this.config.password,
        socket: {
          connectTimeout: this.config.connectTimeout,
          reconnectStrategy: (retries: number) => {
            if (retries > this.config.maxRetries) {
              console.error(`❌ Redis connection failed after ${retries} retries`);
              this.isEnabled = false;
              return new Error('Redis max retries reached');
            }
            console.log(`🔄 Redis reconnecting... Attempt ${retries}/${this.config.maxRetries}`);
            return this.config.retryDelay;
          },
        },
      }) as RedisClientType;

      // Set up event listeners
      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔌 Redis client connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis client ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis client reconnecting...');
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('🔌 Redis connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
      this.isConnected = true;
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error instanceof Error ? error.message : error);
      console.log('⚠️ Application will continue without caching');
      this.isEnabled = false;
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Disconnect from Redis server
   */
  public async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        console.log('✅ Redis disconnected successfully');
      } catch (error) {
        console.error('❌ Error disconnecting Redis:', error);
      } finally {
        this.client = null;
        this.isConnected = false;
      }
    }
  }

  /**
   * Check if Redis is enabled and connected
   */
  public isReady(): boolean {
    return this.isEnabled && this.isConnected && this.client !== null;
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or null
   */
  public async get<T>(key: string): Promise<T | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const value = await this.client!.get(prefixedKey);

      if (value) {
        console.log(`📦 Cache HIT: ${key}`);
        return JSON.parse(value) as T;
      }

      console.log(`📦 Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error(`❌ Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional)
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const serializedValue = JSON.stringify(value);

      if (ttl) {
        await this.client!.setEx(prefixedKey, ttl, serializedValue);
      } else {
        await this.client!.set(prefixedKey, serializedValue);
      }

      console.log(`💾 Cache SET: ${key} (TTL: ${ttl || 'none'}s)`);
      return true;
    } catch (error) {
      console.error(`❌ Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   * @param key - Cache key
   */
  public async del(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      await this.client!.del(prefixedKey);
      console.log(`🗑️ Cache DEL: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param pattern - Key pattern (e.g., "product:*")
   */
  public async delPattern(pattern: string): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    try {
      const prefixedPattern = this.getPrefixedKey(pattern);

      // Use SCAN instead of KEYS to avoid blocking Redis under high load
      const keys: string[] = [];
      let cursor = 0;
      do {
        const result = await this.client!.scan(cursor, {
          MATCH: prefixedPattern,
          COUNT: 100,
        });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);

      if (keys.length === 0) {
        return 0;
      }

      // Delete in batches of 100 to avoid blocking
      for (let i = 0; i < keys.length; i += 100) {
        const batch = keys.slice(i, i + 100);
        await this.client!.del(batch);
      }

      console.log(`🗑️ Cache DEL pattern: ${pattern} (${keys.length} keys)`);
      return keys.length;
    } catch (error) {
      console.error(`❌ Redis DEL pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Flush all cache data
   */
  public async flush(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.client!.flushAll();
      console.log('🗑️ Cache FLUSHED');
      return true;
    } catch (error) {
      console.error('❌ Redis FLUSH error:', error);
      return false;
    }
  }

  /**
   * Get multiple values from cache
   * @param keys - Array of cache keys
   * @returns Object with key-value pairs
   */
  public async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    if (!this.isReady() || keys.length === 0) {
      return {};
    }

    try {
      const prefixedKeys = keys.map((key) => this.getPrefixedKey(key));
      const values = await this.client!.mGet(prefixedKeys);

      const result: Record<string, T | null> = {};
      keys.forEach((key, index) => {
        const value = values[index];
        result[key] = value ? (JSON.parse(value) as T) : null;
      });

      const hits = Object.values(result).filter((v) => v !== null).length;
      console.log(`📦 Cache MGET: ${hits}/${keys.length} hits`);

      return result;
    } catch (error) {
      console.error('❌ Redis MGET error:', error);
      return {};
    }
  }

  /**
   * Set multiple key-value pairs
   * @param entries - Object with key-value pairs
   * @param ttl - Time to live in seconds (optional, applies to all)
   */
  public async setMultiple<T>(entries: Record<string, T>, ttl?: number): Promise<boolean> {
    if (!this.isReady() || Object.keys(entries).length === 0) {
      return false;
    }

    try {
      // Use pipeline for batch operations
      const pipeline = this.client!.multi();

      Object.entries(entries).forEach(([key, value]) => {
        const prefixedKey = this.getPrefixedKey(key);
        const serializedValue = JSON.stringify(value);

        if (ttl) {
          pipeline.setEx(prefixedKey, ttl, serializedValue);
        } else {
          pipeline.set(prefixedKey, serializedValue);
        }
      });

      await pipeline.exec();
      console.log(`💾 Cache MSET: ${Object.keys(entries).length} keys (TTL: ${ttl || 'none'}s)`);
      return true;
    } catch (error) {
      console.error('❌ Redis MSET error:', error);
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   * @param key - Cache key
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const exists = await this.client!.exists(prefixedKey);
      return exists === 1;
    } catch (error) {
      console.error(`❌ Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration time for a key
   * @param key - Cache key
   * @param ttl - Time to live in seconds
   */
  public async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      await this.client!.expire(prefixedKey, ttl);
      console.log(`⏰ Cache EXPIRE: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error(`❌ Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment a numeric value in cache
   * @param key - Cache key
   * @param amount - Amount to increment (default: 1)
   */
  public async incr(key: string, amount: number = 1): Promise<number | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const result = await this.client!.incrBy(prefixedKey, amount);
      return result;
    } catch (error) {
      console.error(`❌ Redis INCR error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Decrement a numeric value in cache
   * @param key - Cache key
   * @param amount - Amount to decrement (default: 1)
   */
  public async decr(key: string, amount: number = 1): Promise<number | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const result = await this.client!.decrBy(prefixedKey, amount);
      return result;
    } catch (error) {
      console.error(`❌ Redis DECR error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Atomic increment with TTL using Lua script.
   * Guarantees INCR + EXPIRE happen atomically (no race condition).
   * Returns the new counter value, or null if Redis is unavailable.
   */
  public async atomicIncr(key: string, ttlSeconds: number): Promise<number | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      // Lua script: INCR key, set EXPIRE only on first increment (count == 1)
      const luaScript = `
        local count = redis.call('INCR', KEYS[1])
        if count == 1 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        return count
      `;
      const result = await this.client!.eval(luaScript, {
        keys: [prefixedKey],
        arguments: [ttlSeconds.toString()],
      });
      return result as number;
    } catch (error) {
      console.error(`❌ Redis ATOMIC_INCR error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Acquire a distributed lock with owner verification (SET NX EX pattern).
   * Returns the lock owner token if acquired, or null if already held.
   * The token MUST be passed to releaseLock() to prevent releasing another instance's lock.
   * Falls back to a dummy token if Redis is unavailable (single-instance fallback).
   */
  public async acquireLock(key: string, ttlSeconds: number): Promise<string | null> {
    if (!this.isReady()) {
      return 'fallback'; // Allow execution if Redis is down (single-instance fallback)
    }

    try {
      const prefixedKey = this.getPrefixedKey(`lock:${key}`);
      const ownerToken = crypto.randomBytes(16).toString('hex');
      const result = await this.client!.set(prefixedKey, ownerToken, {
        NX: true,
        EX: ttlSeconds,
      });
      return result === 'OK' ? ownerToken : null;
    } catch (error) {
      console.error(`❌ Redis LOCK acquire error for ${key}:`, error);
      return 'fallback'; // Fail open for single-instance
    }
  }

  /**
   * Release a distributed lock only if we own it (prevents releasing another instance's lock).
   * Uses Lua script for atomic check-and-delete.
   */
  public async releaseLock(key: string, ownerToken?: string): Promise<void> {
    if (!this.isReady()) return;

    try {
      const prefixedKey = this.getPrefixedKey(`lock:${key}`);

      if (ownerToken && ownerToken !== 'fallback') {
        // Safe release: only delete if we own the lock
        const luaScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        await this.client!.eval(luaScript, {
          keys: [prefixedKey],
          arguments: [ownerToken],
        });
      } else {
        // Backward-compatible: unconditional delete (for callers that don't pass token)
        await this.client!.del(prefixedKey);
      }
    } catch (error) {
      console.error(`❌ Redis LOCK release error for ${key}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<any> {
    if (!this.isReady()) {
      return {
        enabled: false,
        connected: false,
        message: 'Redis not available',
      };
    }

    try {
      const info = await this.client!.info();
      const dbSize = await this.client!.dbSize();

      return {
        enabled: true,
        connected: true,
        dbSize,
        info: this.parseRedisInfo(info),
      };
    } catch (error) {
      console.error('❌ Redis STATS error:', error);
      return {
        enabled: true,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get prefixed key with version namespace (P-14: cache key versioning).
   * Format: "{keyPrefix}v{CACHE_VERSION}:{key}"
   * Bumping CACHE_VERSION in config/redis.ts automatically invalidates
   * all old-format cached data without needing a manual flush.
   *
   * @param key - Original key
   * @returns Prefixed + versioned key
   */
  private getPrefixedKey(key: string): string {
    return `${this.config.keyPrefix}v${CACHE_VERSION}:${key}`;
  }

  /**
   * Parse Redis INFO command output
   * @param info - INFO command output
   * @returns Parsed info object
   */
  private parseRedisInfo(info: string): Record<string, any> {
    const parsed: Record<string, any> = {};
    const sections = info.split('\r\n\r\n');

    sections.forEach((section) => {
      const lines = section.split('\r\n');
      const sectionName = lines[0].replace('# ', '');

      if (sectionName && sectionName !== '') {
        parsed[sectionName] = {};

        lines.slice(1).forEach((line) => {
          if (line && line.includes(':')) {
            const [key, value] = line.split(':');
            parsed[sectionName][key] = value;
          }
        });
      }
    });

    return parsed;
  }
}

// Export singleton instance
const redisService = RedisService.getInstance();
export default redisService;

// Export individual methods for convenience
export const {
  connect,
  disconnect,
  isReady,
  get,
  set,
  del,
  delPattern,
  flush,
  getMultiple,
  setMultiple,
  exists,
  expire,
  incr,
  decr,
  getStats,
} = redisService;