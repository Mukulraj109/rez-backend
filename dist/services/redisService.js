"use strict";
/**
 * Redis Service
 *
 * Singleton service for Redis connection management and caching operations.
 * Provides graceful degradation if Redis is unavailable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = exports.decr = exports.incr = exports.expire = exports.exists = exports.setMultiple = exports.getMultiple = exports.flush = exports.delPattern = exports.del = exports.set = exports.get = exports.isReady = exports.disconnect = exports.connect = void 0;
const redis_1 = require("redis");
const redis_2 = require("../config/redis");
/**
 * Redis Service Class
 * Manages Redis connection and provides caching methods
 */
class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.isEnabled = true;
        this.config = (0, redis_2.getRedisConfig)();
        this.isEnabled = this.config.enabled;
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }
    /**
     * Connect to Redis server
     */
    async connect() {
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
            this.client = (0, redis_1.createClient)({
                url: this.config.url,
                password: this.config.password,
                socket: {
                    connectTimeout: this.config.connectTimeout,
                    reconnectStrategy: (retries) => {
                        if (retries > this.config.maxRetries) {
                            console.error(`❌ Redis connection failed after ${retries} retries`);
                            this.isEnabled = false;
                            return new Error('Redis max retries reached');
                        }
                        console.log(`🔄 Redis reconnecting... Attempt ${retries}/${this.config.maxRetries}`);
                        return this.config.retryDelay;
                    },
                },
            });
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
        }
        catch (error) {
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
    async disconnect() {
        if (this.client && this.isConnected) {
            try {
                await this.client.quit();
                console.log('✅ Redis disconnected successfully');
            }
            catch (error) {
                console.error('❌ Error disconnecting Redis:', error);
            }
            finally {
                this.client = null;
                this.isConnected = false;
            }
        }
    }
    /**
     * Check if Redis is enabled and connected
     */
    isReady() {
        return this.isEnabled && this.isConnected && this.client !== null;
    }
    /**
     * Get a value from cache
     * @param key - Cache key
     * @returns Cached value or null
     */
    async get(key) {
        if (!this.isReady()) {
            return null;
        }
        try {
            const prefixedKey = this.getPrefixedKey(key);
            const value = await this.client.get(prefixedKey);
            if (value) {
                console.log(`📦 Cache HIT: ${key}`);
                return JSON.parse(value);
            }
            console.log(`📦 Cache MISS: ${key}`);
            return null;
        }
        catch (error) {
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
    async set(key, value, ttl) {
        if (!this.isReady()) {
            return false;
        }
        try {
            const prefixedKey = this.getPrefixedKey(key);
            const serializedValue = JSON.stringify(value);
            if (ttl) {
                await this.client.setEx(prefixedKey, ttl, serializedValue);
            }
            else {
                await this.client.set(prefixedKey, serializedValue);
            }
            console.log(`💾 Cache SET: ${key} (TTL: ${ttl || 'none'}s)`);
            return true;
        }
        catch (error) {
            console.error(`❌ Redis SET error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Delete a key from cache
     * @param key - Cache key
     */
    async del(key) {
        if (!this.isReady()) {
            return false;
        }
        try {
            const prefixedKey = this.getPrefixedKey(key);
            await this.client.del(prefixedKey);
            console.log(`🗑️ Cache DEL: ${key}`);
            return true;
        }
        catch (error) {
            console.error(`❌ Redis DEL error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Delete multiple keys matching a pattern
     * @param pattern - Key pattern (e.g., "product:*")
     */
    async delPattern(pattern) {
        if (!this.isReady()) {
            return 0;
        }
        try {
            const prefixedPattern = this.getPrefixedKey(pattern);
            const keys = await this.client.keys(prefixedPattern);
            if (keys.length === 0) {
                return 0;
            }
            await this.client.del(keys);
            console.log(`🗑️ Cache DEL pattern: ${pattern} (${keys.length} keys)`);
            return keys.length;
        }
        catch (error) {
            console.error(`❌ Redis DEL pattern error for ${pattern}:`, error);
            return 0;
        }
    }
    /**
     * Flush all cache data
     */
    async flush() {
        if (!this.isReady()) {
            return false;
        }
        try {
            await this.client.flushAll();
            console.log('🗑️ Cache FLUSHED');
            return true;
        }
        catch (error) {
            console.error('❌ Redis FLUSH error:', error);
            return false;
        }
    }
    /**
     * Get multiple values from cache
     * @param keys - Array of cache keys
     * @returns Object with key-value pairs
     */
    async getMultiple(keys) {
        if (!this.isReady() || keys.length === 0) {
            return {};
        }
        try {
            const prefixedKeys = keys.map((key) => this.getPrefixedKey(key));
            const values = await this.client.mGet(prefixedKeys);
            const result = {};
            keys.forEach((key, index) => {
                const value = values[index];
                result[key] = value ? JSON.parse(value) : null;
            });
            const hits = Object.values(result).filter((v) => v !== null).length;
            console.log(`📦 Cache MGET: ${hits}/${keys.length} hits`);
            return result;
        }
        catch (error) {
            console.error('❌ Redis MGET error:', error);
            return {};
        }
    }
    /**
     * Set multiple key-value pairs
     * @param entries - Object with key-value pairs
     * @param ttl - Time to live in seconds (optional, applies to all)
     */
    async setMultiple(entries, ttl) {
        if (!this.isReady() || Object.keys(entries).length === 0) {
            return false;
        }
        try {
            // Use pipeline for batch operations
            const pipeline = this.client.multi();
            Object.entries(entries).forEach(([key, value]) => {
                const prefixedKey = this.getPrefixedKey(key);
                const serializedValue = JSON.stringify(value);
                if (ttl) {
                    pipeline.setEx(prefixedKey, ttl, serializedValue);
                }
                else {
                    pipeline.set(prefixedKey, serializedValue);
                }
            });
            await pipeline.exec();
            console.log(`💾 Cache MSET: ${Object.keys(entries).length} keys (TTL: ${ttl || 'none'}s)`);
            return true;
        }
        catch (error) {
            console.error('❌ Redis MSET error:', error);
            return false;
        }
    }
    /**
     * Check if a key exists in cache
     * @param key - Cache key
     */
    async exists(key) {
        if (!this.isReady()) {
            return false;
        }
        try {
            const prefixedKey = this.getPrefixedKey(key);
            const exists = await this.client.exists(prefixedKey);
            return exists === 1;
        }
        catch (error) {
            console.error(`❌ Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Set expiration time for a key
     * @param key - Cache key
     * @param ttl - Time to live in seconds
     */
    async expire(key, ttl) {
        if (!this.isReady()) {
            return false;
        }
        try {
            const prefixedKey = this.getPrefixedKey(key);
            await this.client.expire(prefixedKey, ttl);
            console.log(`⏰ Cache EXPIRE: ${key} (TTL: ${ttl}s)`);
            return true;
        }
        catch (error) {
            console.error(`❌ Redis EXPIRE error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Increment a numeric value in cache
     * @param key - Cache key
     * @param amount - Amount to increment (default: 1)
     */
    async incr(key, amount = 1) {
        if (!this.isReady()) {
            return null;
        }
        try {
            const prefixedKey = this.getPrefixedKey(key);
            const result = await this.client.incrBy(prefixedKey, amount);
            return result;
        }
        catch (error) {
            console.error(`❌ Redis INCR error for key ${key}:`, error);
            return null;
        }
    }
    /**
     * Decrement a numeric value in cache
     * @param key - Cache key
     * @param amount - Amount to decrement (default: 1)
     */
    async decr(key, amount = 1) {
        if (!this.isReady()) {
            return null;
        }
        try {
            const prefixedKey = this.getPrefixedKey(key);
            const result = await this.client.decrBy(prefixedKey, amount);
            return result;
        }
        catch (error) {
            console.error(`❌ Redis DECR error for key ${key}:`, error);
            return null;
        }
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        if (!this.isReady()) {
            return {
                enabled: false,
                connected: false,
                message: 'Redis not available',
            };
        }
        try {
            const info = await this.client.info();
            const dbSize = await this.client.dbSize();
            return {
                enabled: true,
                connected: true,
                dbSize,
                info: this.parseRedisInfo(info),
            };
        }
        catch (error) {
            console.error('❌ Redis STATS error:', error);
            return {
                enabled: true,
                connected: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Get prefixed key
     * @param key - Original key
     * @returns Prefixed key
     */
    getPrefixedKey(key) {
        return `${this.config.keyPrefix}${key}`;
    }
    /**
     * Parse Redis INFO command output
     * @param info - INFO command output
     * @returns Parsed info object
     */
    parseRedisInfo(info) {
        const parsed = {};
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
exports.default = redisService;
// Export individual methods for convenience
exports.connect = redisService.connect, exports.disconnect = redisService.disconnect, exports.isReady = redisService.isReady, exports.get = redisService.get, exports.set = redisService.set, exports.del = redisService.del, exports.delPattern = redisService.delPattern, exports.flush = redisService.flush, exports.getMultiple = redisService.getMultiple, exports.setMultiple = redisService.setMultiple, exports.exists = redisService.exists, exports.expire = redisService.expire, exports.incr = redisService.incr, exports.decr = redisService.decr, exports.getStats = redisService.getStats;
