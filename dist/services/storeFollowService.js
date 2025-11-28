"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFollowersCount = exports.recalculateFollowers = exports.decrementFollowers = exports.incrementFollowers = void 0;
const Store_1 = require("../models/Store");
const Wishlist_1 = require("../models/Wishlist");
/**
 * Store Follow Service
 * Manages the followers count for stores based on wishlist follows
 */
/**
 * Increment the followers count for a store
 * Called when a user adds a store to their wishlist
 */
const incrementFollowers = async (storeId) => {
    try {
        console.log(`[StoreFollowService] Incrementing followers count for store: ${storeId}`);
        const store = await Store_1.Store.findByIdAndUpdate(storeId, { $inc: { 'analytics.followersCount': 1 } }, { new: true });
        if (!store) {
            console.error(`[StoreFollowService] Store not found: ${storeId}`);
            throw new Error('Store not found');
        }
        console.log(`[StoreFollowService] Store ${storeId} followers count incremented to: ${store.analytics.followersCount}`);
    }
    catch (error) {
        console.error(`[StoreFollowService] Error incrementing followers for store ${storeId}:`, error);
        throw error;
    }
};
exports.incrementFollowers = incrementFollowers;
/**
 * Decrement the followers count for a store
 * Called when a user removes a store from their wishlist
 * Ensures count doesn't go below 0
 */
const decrementFollowers = async (storeId) => {
    try {
        console.log(`[StoreFollowService] Decrementing followers count for store: ${storeId}`);
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            console.error(`[StoreFollowService] Store not found: ${storeId}`);
            throw new Error('Store not found');
        }
        // Only decrement if count is greater than 0
        if (store.analytics.followersCount > 0) {
            store.analytics.followersCount -= 1;
            await store.save();
            console.log(`[StoreFollowService] Store ${storeId} followers count decremented to: ${store.analytics.followersCount}`);
        }
        else {
            console.warn(`[StoreFollowService] Store ${storeId} followers count already at 0, skipping decrement`);
        }
    }
    catch (error) {
        console.error(`[StoreFollowService] Error decrementing followers for store ${storeId}:`, error);
        throw error;
    }
};
exports.decrementFollowers = decrementFollowers;
/**
 * Recalculate the followers count for a store
 * Counts all wishlists that contain this store
 * Useful for fixing any discrepancies
 */
const recalculateFollowers = async (storeId) => {
    try {
        console.log(`[StoreFollowService] Recalculating followers count for store: ${storeId}`);
        // Count all wishlists that have this store
        const count = await Wishlist_1.Wishlist.countDocuments({
            'items.itemType': 'Store',
            'items.itemId': storeId
        });
        console.log(`[StoreFollowService] Found ${count} followers for store ${storeId}`);
        // Update the store with the accurate count
        const store = await Store_1.Store.findByIdAndUpdate(storeId, { $set: { 'analytics.followersCount': count } }, { new: true });
        if (!store) {
            console.error(`[StoreFollowService] Store not found: ${storeId}`);
            throw new Error('Store not found');
        }
        console.log(`[StoreFollowService] Store ${storeId} followers count updated to: ${store.analytics.followersCount}`);
        return count;
    }
    catch (error) {
        console.error(`[StoreFollowService] Error recalculating followers for store ${storeId}:`, error);
        throw error;
    }
};
exports.recalculateFollowers = recalculateFollowers;
/**
 * Get the current followers count for a store
 */
const getFollowersCount = async (storeId) => {
    try {
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            console.error(`[StoreFollowService] Store not found: ${storeId}`);
            throw new Error('Store not found');
        }
        return store.analytics.followersCount;
    }
    catch (error) {
        console.error(`[StoreFollowService] Error getting followers count for store ${storeId}:`, error);
        throw error;
    }
};
exports.getFollowersCount = getFollowersCount;
