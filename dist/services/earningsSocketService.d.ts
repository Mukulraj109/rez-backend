import { Server as SocketIOServer } from 'socket.io';
declare class EarningsSocketService {
    private io;
    private static instance;
    private constructor();
    static getInstance(): EarningsSocketService;
    initialize(io: SocketIOServer): void;
    /**
     * Emit balance update to user
     */
    emitBalanceUpdate(userId: string, balance: number, pendingBalance: number): void;
    /**
     * Emit project status update to user
     */
    emitProjectStatusUpdate(userId: string, status: {
        completeNow: number;
        inReview: number;
        completed: number;
    }): void;
    /**
     * Emit earnings update to user
     */
    emitEarningsUpdate(userId: string, earnings: {
        totalEarned: number;
        breakdown: {
            projects: number;
            referrals: number;
            shareAndEarn: number;
            spin: number;
        };
    }): void;
    /**
     * Emit new transaction to user
     */
    emitNewTransaction(userId: string, transaction: any): void;
    /**
     * Emit notification to user
     */
    emitNotification(userId: string, notification: any): void;
}
declare const _default: EarningsSocketService;
export default _default;
