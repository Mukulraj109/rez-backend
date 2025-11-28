"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSocketInitialized = exports.getIO = exports.initializeSocket = void 0;
let io = null;
/**
 * Initialize Socket.IO instance
 * Called once during server startup
 */
const initializeSocket = (socketInstance) => {
    io = socketInstance;
    console.log('✅ Socket.IO instance initialized');
};
exports.initializeSocket = initializeSocket;
/**
 * Get Socket.IO instance
 * Returns the initialized Socket.IO server
 * @throws Error if Socket.IO is not initialized
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initializeSocket first.');
    }
    return io;
};
exports.getIO = getIO;
/**
 * Check if Socket.IO is initialized
 */
const isSocketInitialized = () => {
    return io !== null;
};
exports.isSocketInitialized = isSocketInitialized;
