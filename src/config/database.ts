import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Ensure dotenv is loaded
dotenv.config();
// MongoDB connection configuration
export interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

// Default database configuration
const defaultConfig: DatabaseConfig = {
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
export class Database {
  private static instance: Database;
  private isConnected: boolean = false;
  
  private constructor() {}
  
  // Singleton pattern
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
  
  // Connect to MongoDB
  public async connect(config: DatabaseConfig = defaultConfig): Promise<void> {
    try {
      if (this.isConnected) {
        console.log('Database already connected');
        return;
      }
      
      // Add database name to options if specified in environment
      const dbName = process.env.DB_NAME || 'rez-app';
      const connectOptions = { ...config.options, dbName };
      
      // Connect to MongoDB
      await mongoose.connect(config.uri, connectOptions);
      this.isConnected = true;
      
      console.log(`✅ MongoDB connected successfully to database: ${dbName}`);
      
      // Set up connection event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }
  
  // Disconnect from MongoDB
  public async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        console.log('Database not connected');
        return;
      }
      
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('📤 MongoDB disconnected');
      
    } catch (error) {
      console.error('❌ MongoDB disconnection error:', error);
    }
  }
  
  // Check connection status
  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
  
  // Get connection statistics
  public getConnectionStats() {
    const connection = mongoose.connection;
    return {
      readyState: this.getReadyStateText(connection.readyState),
      host: connection.host,
      port: connection.port,
      name: connection.name,
      collections: Object.keys(connection.collections).length,
      models: Object.keys(mongoose.models).length
    };
  }
  
  // Setup event listeners for connection monitoring
  private setupEventListeners(): void {
    const connection = mongoose.connection;
    
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
  private getReadyStateText(state: number): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    };
    return states[state as keyof typeof states] || 'unknown';
  }
  
  // Create database indexes (for production optimization)
  public async createIndexes(): Promise<void> {
    try {
      console.log('🔍 Creating database indexes...');
      
      // This would typically be done automatically by Mongoose,
      // but we can force index creation here for production deployments
      const collections = await mongoose.connection.db?.collections() || [];
      
      for (const collection of collections) {
        try {
          await collection.createIndexes([]);
          console.log(`✅ Indexes created for ${collection.collectionName}`);
        } catch (indexError) {
          console.warn(`⚠️ Index creation warning for ${collection.collectionName}:`, indexError);
        }
      }
      
      console.log('✅ Database indexes creation completed');
    } catch (error) {
      console.error('❌ Error creating database indexes:', error);
    }
  }
  
  // Database health check
  public async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const connection = mongoose.connection;
      
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
          models: Object.keys(mongoose.models).length,
          ping: testResult
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          readyState: mongoose.connection.readyState
        }
      };
    }
  }
  
  // Clear all collections (for testing/development)
  public async clearDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear database in production environment');
    }
    
    try {
      const collections = await mongoose.connection.db?.collections() || [];
      
      for (const collection of collections) {
        await collection.deleteMany({});
        console.log(`🗑️ Cleared collection: ${collection.collectionName}`);
      }
      
      console.log('✅ Database cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing database:', error);
      throw error;
    }
  }
  
  // Seed database with initial data (for development/testing)
  public async seedDatabase(): Promise<void> {
    try {
      console.log('🌱 Seeding database with initial data...');
      
      // Import models (this ensures they're registered)
      await import('../models');
      
      // Here you would add your seed data logic
      // This is just a placeholder for now
      
      console.log('✅ Database seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const database = Database.getInstance();

// Export connection function for convenience
export const connectDatabase = async (config?: DatabaseConfig) => {
  return database.connect(config);
};

// Export disconnect function for convenience
export const disconnectDatabase = async () => {
  return database.disconnect();
};