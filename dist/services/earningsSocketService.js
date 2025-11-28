"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EarningsSocketService {
    constructor() {
        this.io = null;
    }
    static getInstance() {
        if (!EarningsSocketService.instance) {
            EarningsSocketService.instance = new EarningsSocketService();
        }
        return EarningsSocketService.instance;
    }
    initialize(io) {
        this.io = io;
        console.log('✅ [EARNINGS SOCKET] Earnings socket service initialized');
        io.on('connection', (socket) => {
            console.log('🔌 [EARNINGS SOCKET] Client connected:', socket.id);
            // Join user's earnings room
            socket.on('join-earnings-room', (userId) => {
                socket.join(`earnings-${userId}`);
                console.log(`✅ [EARNINGS SOCKET] User ${userId} joined earnings room`);
            });
            // Leave user's earnings room
            socket.on('leave-earnings-room', (userId) => {
                socket.leave(`earnings-${userId}`);
                console.log(`✅ [EARNINGS SOCKET] User ${userId} left earnings room`);
            });
            socket.on('disconnect', () => {
                console.log('🔌 [EARNINGS SOCKET] Client disconnected:', socket.id);
            });
        });
    }
    /**
     * Emit balance update to user
     */
    emitBalanceUpdate(userId, balance, pendingBalance) {
        if (!this.io) {
            console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
            return;
        }
        this.io.to(`earnings-${userId}`).emit('balance-update', {
            balance,
            pendingBalance,
            timestamp: new Date().toISOString(),
        });
        console.log(`📤 [EARNINGS SOCKET] Balance update sent to user ${userId}`);
    }
    /**
     * Emit project status update to user
     */
    emitProjectStatusUpdate(userId, status) {
        if (!this.io) {
            console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
            return;
        }
        this.io.to(`earnings-${userId}`).emit('project-status-update', {
            status,
            timestamp: new Date().toISOString(),
        });
        console.log(`📤 [EARNINGS SOCKET] Project status update sent to user ${userId}`);
    }
    /**
     * Emit earnings update to user
     */
    emitEarningsUpdate(userId, earnings) {
        if (!this.io) {
            console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
            return;
        }
        this.io.to(`earnings-${userId}`).emit('earnings-update', {
            earnings,
            timestamp: new Date().toISOString(),
        });
        console.log(`📤 [EARNINGS SOCKET] Earnings update sent to user ${userId}`);
    }
    /**
     * Emit new transaction to user
     */
    emitNewTransaction(userId, transaction) {
        if (!this.io) {
            console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
            return;
        }
        this.io.to(`earnings-${userId}`).emit('new-transaction', {
            transaction,
            timestamp: new Date().toISOString(),
        });
        console.log(`📤 [EARNINGS SOCKET] New transaction sent to user ${userId}`);
    }
    /**
     * Emit notification to user
     */
    emitNotification(userId, notification) {
        if (!this.io) {
            console.warn('⚠️ [EARNINGS SOCKET] Socket.IO not initialized');
            return;
        }
        this.io.to(`earnings-${userId}`).emit('earnings-notification', {
            notification,
            timestamp: new Date().toISOString(),
        });
        console.log(`📤 [EARNINGS SOCKET] Notification sent to user ${userId}`);
    }
}
exports.default = EarningsSocketService.getInstance();
