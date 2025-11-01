/**
 * Get user's current coin balance
 */
export declare function getCoinBalance(userId: string): Promise<number>;
/**
 * Get user's coin transaction history
 */
export declare function getCoinTransactions(userId: string, options?: {
    type?: string;
    source?: string;
    limit?: number;
    offset?: number;
}): Promise<{
    transactions: any[];
    total: number;
    balance: number;
}>;
/**
 * Award coins to user
 */
export declare function awardCoins(userId: string, amount: number, source: string, description: string, metadata?: any): Promise<any>;
/**
 * Deduct coins from user
 */
export declare function deductCoins(userId: string, amount: number, source: string, description: string, metadata?: any): Promise<any>;
/**
 * Transfer coins between users (e.g., for gifting)
 */
export declare function transferCoins(fromUserId: string, toUserId: string, amount: number, description?: string): Promise<{
    fromTransaction: any;
    toTransaction: any;
}>;
/**
 * Get coin statistics for user
 */
export declare function getCoinStats(userId: string): Promise<any>;
/**
 * Get leaderboard of top coin earners
 */
export declare function getCoinLeaderboard(period?: 'daily' | 'weekly' | 'monthly' | 'all-time', limit?: number): Promise<any[]>;
/**
 * Expire old coins (FIFO basis)
 */
export declare function expireOldCoins(userId: string, daysToExpire?: number): Promise<number>;
/**
 * Get user's rank in coin leaderboard
 */
export declare function getUserCoinRank(userId: string, period?: 'daily' | 'weekly' | 'monthly' | 'all-time'): Promise<any>;
declare const _default: {
    getCoinBalance: typeof getCoinBalance;
    getCoinTransactions: typeof getCoinTransactions;
    awardCoins: typeof awardCoins;
    deductCoins: typeof deductCoins;
    transferCoins: typeof transferCoins;
    getCoinStats: typeof getCoinStats;
    getCoinLeaderboard: typeof getCoinLeaderboard;
    getUserCoinRank: typeof getUserCoinRank;
    expireOldCoins: typeof expireOldCoins;
};
export default _default;
