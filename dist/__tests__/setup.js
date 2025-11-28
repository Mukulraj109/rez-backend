"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
let mongoServer;
// Setup before all tests
beforeAll(async () => {
    try {
        mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose_1.default.connect(mongoUri);
        console.log('✅ Test database connected');
    }
    catch (error) {
        console.error('❌ Test database connection failed:', error);
        throw error;
    }
});
// Cleanup after each test
afterEach(async () => {
    try {
        const collections = mongoose_1.default.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    }
    catch (error) {
        console.error('❌ Test cleanup failed:', error);
    }
});
// Cleanup after all tests
afterAll(async () => {
    try {
        await mongoose_1.default.disconnect();
        await mongoServer.stop();
        console.log('✅ Test database disconnected');
    }
    catch (error) {
        console.error('❌ Test database disconnection failed:', error);
    }
});
// Global test timeout
jest.setTimeout(30000);
