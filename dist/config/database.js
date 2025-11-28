"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = exports.database = exports.Database = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
// Ensure dotenv is loaded
dotenv_1.default.config();
// Default database configuration
const defaultConfig = {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app',
    options: {
        // Connection options - OPTIMIZED FOR PRODUCTION PERFORMANCE
        maxPoolSize: 100, // Maintain up to 100 socket connections (increased from 10)
        minPoolSize: 10, // Always maintain 10 connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
        compressors: ['zlib'], // Enable wire protocol compression
        retryWrites: true, // Retry write operations
        retryReads: true, // Retry read operations
        maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
        // Deprecated options removed in mongoose 7+
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
        // useFindAndModify: false,
        // useCreateIndex: true,
    }
};
// Database connection class
class Database {
    constructor() {
        this.isConnected = false;
    }
    // Singleton pattern
    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    // Connect to MongoDB
    async connect(config = defaultConfig) {
        try {
            if (this.isConnected) {
                console.log('Database already connected');
                return;
            }
            // Add database name to options if specified in environment
            const dbName = process.env.DB_NAME || 'rez-app';
            const connectOptions = { ...config.options, dbName };
            // Connect to MongoDB
            await mongoose_1.default.connect(config.uri, connectOptions);
            this.isConnected = true;
            console.log(`✅ MongoDB connected successfully to database: ${dbName}`);
            // Set up connection event listeners
            this.setupEventListeners();
        }
        catch (error) {
            console.error('❌ MongoDB connection error:', error);
            process.exit(1);
        }
    }
    // Disconnect from MongoDB
    async disconnect() {
        try {
            if (!this.isConnected) {
                console.log('Database not connected');
                return;
            }
            await mongoose_1.default.disconnect();
            this.isConnected = false;
            console.log('📤 MongoDB disconnected');
        }
        catch (error) {
            console.error('❌ MongoDB disconnection error:', error);
        }
    }
    // Check connection status
    getConnectionStatus() {
        return this.isConnected && mongoose_1.default.connection.readyState === 1;
    }
    // Get connection statistics
    getConnectionStats() {
        const connection = mongoose_1.default.connection;
        return {
            readyState: this.getReadyStateText(connection.readyState),
            host: connection.host,
            port: connection.port,
            name: connection.name,
            collections: Object.keys(connection.collections).length,
            models: Object.keys(mongoose_1.default.models).length
        };
    }
    // Setup event listeners for connection monitoring
    setupEventListeners() {
        const connection = mongoose_1.default.connection;
        connection.on('connected', () => {
            console.log('🔗 Mongoose connected to MongoDB');
        });
        connection.on('error', (error) => {
            console.error('❌ Mongoose connection error:', error);
        });
        connection.on('disconnected', () => {
            console.log('📤 Mongoose disconnected from MongoDB');
            this.isConnected = false;
        });
        connection.on('reconnected', () => {
            console.log('🔄 Mongoose reconnected to MongoDB');
            this.isConnected = true;
        });
        // Handle application termination
        process.on('SIGINT', async () => {
            console.log('\n🛑 Received SIGINT. Gracefully closing MongoDB connection...');
            await this.disconnect();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.log('\n🛑 Received SIGTERM. Gracefully closing MongoDB connection...');
            await this.disconnect();
            process.exit(0);
        });
    }
    // Convert readyState number to text
    getReadyStateText(state) {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting',
            99: 'uninitialized'
        };
        return states[state] || 'unknown';
    }
    // Create database indexes (for production optimization)
    async createIndexes() {
        try {
            console.log('🔍 Creating database indexes...');
            // This would typically be done automatically by Mongoose,
            // but we can force index creation here for production deployments
            const collections = await mongoose_1.default.connection.db?.collections() || [];
            for (const collection of collections) {
                try {
                    await collection.createIndexes([]);
                    console.log(`✅ Indexes created for ${collection.collectionName}`);
                }
                catch (indexError) {
                    console.warn(`⚠️ Index creation warning for ${collection.collectionName}:`, indexError);
                }
            }
            console.log('✅ Database indexes creation completed');
        }
        catch (error) {
            console.error('❌ Error creating database indexes:', error);
        }
    }
    // Database health check
    async healthCheck() {
        try {
            const connection = mongoose_1.default.connection;
            if (connection.readyState !== 1) {
                return {
                    status: 'unhealthy',
                    details: {
                        readyState: this.getReadyStateText(connection.readyState),
                        error: 'Not connected to database'
                    }
                };
            }
            // Test database operation
            const testResult = await connection.db?.admin().ping();
            return {
                status: 'healthy',
                details: {
                    readyState: this.getReadyStateText(connection.readyState),
                    host: connection.host,
                    port: connection.port,
                    database: connection.name,
                    collections: Object.keys(connection.collections).length,
                    models: Object.keys(mongoose_1.default.models).length,
                    ping: testResult
                }
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    readyState: mongoose_1.default.connection.readyState
                }
            };
        }
    }
    // Clear all collections (for testing/development)
    async clearDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Cannot clear database in production environment');
        }
        try {
            const collections = await mongoose_1.default.connection.db?.collections() || [];
            for (const collection of collections) {
                await collection.deleteMany({});
                console.log(`🗑️ Cleared collection: ${collection.collectionName}`);
            }
            console.log('✅ Database cleared successfully');
        }
        catch (error) {
            console.error('❌ Error clearing database:', error);
            throw error;
        }
    }
    // Seed database with initial data (for development/testing)
    async seedDatabase() {
        try {
            console.log('🌱 Seeding database with initial data...');
            // Import models (this ensures they're registered)
            await Promise.resolve().then(() => __importStar(require('../models')));
            // Here you would add your seed data logic
            // This is just a placeholder for now
            console.log('✅ Database seeded successfully');
        }
        catch (error) {
            console.error('❌ Error seeding database:', error);
            throw error;
        }
    }
}
exports.Database = Database;
// Export singleton instance
exports.database = Database.getInstance();
// Export connection function for convenience
const connectDatabase = async (config) => {
    return exports.database.connect(config);
};
exports.connectDatabase = connectDatabase;
// Export disconnect function for convenience
const disconnectDatabase = async () => {
    return exports.database.disconnect();
};
exports.disconnectDatabase = disconnectDatabase;
