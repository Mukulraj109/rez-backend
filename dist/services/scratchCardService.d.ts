/**
 * Create a new scratch card session
 */
export declare function createScratchCard(userId: string): Promise<any>;
/**
 * Scratch a cell
 */
export declare function scratchCell(sessionId: string, cellIndex: number): Promise<any>;
/**
 * Claim scratch card (reveal all cells)
 */
export declare function claimScratchCard(sessionId: string): Promise<any>;
/**
 * Get scratch card history
 */
export declare function getScratchCardHistory(userId: string, limit?: number): Promise<any[]>;
/**
 * Get scratch card statistics
 */
export declare function getScratchCardStats(userId: string): Promise<any>;
declare const _default: {
    createScratchCard: typeof createScratchCard;
    scratchCell: typeof scratchCell;
    claimScratchCard: typeof claimScratchCard;
    getScratchCardHistory: typeof getScratchCardHistory;
    getScratchCardStats: typeof getScratchCardStats;
};
export default _default;
