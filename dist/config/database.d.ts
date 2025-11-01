import mongoose from 'mongoose';
export interface DatabaseConfig {
    uri: string;
    options: mongoose.ConnectOptions;
}
export declare class Database {
    private static instance;
    private isConnected;
    private constructor();
    static getInstance(): Database;
    connect(config?: DatabaseConfig): Promise<void>;
    disconnect(): Promise<void>;
    getConnectionStatus(): boolean;
    getConnectionStats(): {
        readyState: string;
        host: any;
        port: any;
        name: any;
        collections: number;
        models: number;
    };
    private setupEventListeners;
    private getReadyStateText;
    createIndexes(): Promise<void>;
    healthCheck(): Promise<{
        status: string;
        details: any;
    }>;
    clearDatabase(): Promise<void>;
    seedDatabase(): Promise<void>;
}
export declare const database: Database;
export declare const connectDatabase: (config?: DatabaseConfig) => Promise<void>;
export declare const disconnectDatabase: () => Promise<void>;
