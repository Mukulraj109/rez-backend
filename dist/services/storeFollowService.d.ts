/**
 * Store Follow Service
 * Manages the followers count for stores based on wishlist follows
 */
/**
 * Increment the followers count for a store
 * Called when a user adds a store to their wishlist
 */
export declare const incrementFollowers: (storeId: string) => Promise<void>;
/**
 * Decrement the followers count for a store
 * Called when a user removes a store from their wishlist
 * Ensures count doesn't go below 0
 */
export declare const decrementFollowers: (storeId: string) => Promise<void>;
/**
 * Recalculate the followers count for a store
 * Counts all wishlists that contain this store
 * Useful for fixing any discrepancies
 */
export declare const recalculateFollowers: (storeId: string) => Promise<number>;
/**
 * Get the current followers count for a store
 */
export declare const getFollowersCount: (storeId: string) => Promise<number>;
