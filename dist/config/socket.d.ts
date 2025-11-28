import { Server as SocketIOServer } from 'socket.io';
/**
 * Initialize Socket.IO instance
 * Called once during server startup
 */
export declare const initializeSocket: (socketInstance: SocketIOServer) => void;
/**
 * Get Socket.IO instance
 * Returns the initialized Socket.IO server
 * @throws Error if Socket.IO is not initialized
 */
export declare const getIO: () => SocketIOServer;
/**
 * Check if Socket.IO is initialized
 */
export declare const isSocketInitialized: () => boolean;
