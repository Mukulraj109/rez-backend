"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreFollowers = getStoreFollowers;
exports.getStoreFollowerCount = getStoreFollowerCount;
exports.notifyFollowers = notifyFollowers;
exports.notifyNewOffer = notifyNewOffer;
exports.notifyNewProduct = notifyNewProduct;
exports.notifyPriceDrop = notifyPriceDrop;
exports.notifyBackInStock = notifyBackInStock;
exports.notifyNewMenuItem = notifyNewMenuItem;
exports.notifyStoreUpdate = notifyStoreUpdate;
exports.notifyMultipleStoreFollowers = notifyMultipleStoreFollowers;
const Wishlist_1 = require("../models/Wishlist");
const Store_1 = require("../models/Store");
const notificationService_1 = require("./notificationService");
/**
 * Get all followers of a store
 * @param storeId - Store ID
 * @returns Array of user IDs who follow the store
 */
async function getStoreFollowers(storeId) {
    try {
        const wishlists = await Wishlist_1.Wishlist.find({
            'items': {
                $elemMatch: {
                    itemType: 'Store',
                    itemId: storeId
                }
            }
        }).select('user');
        // Get unique user IDs
        const userIdSet = new Set();
        wishlists.forEach(w => userIdSet.add(w.user.toString()));
        const followerIds = Array.from(userIdSet);
        console.log(`📢 [FOLLOWER SERVICE] Store ${storeId} has ${followerIds.length} followers`);
        return followerIds;
    }
    catch (error) {
        console.error(`❌ [FOLLOWER SERVICE] Error getting followers for store ${storeId}:`, error);
        return [];
    }
}
/**
 * Get follower count for a store
 * @param storeId - Store ID
 * @returns Number of followers
 */
async function getStoreFollowerCount(storeId) {
    try {
        const count = await Wishlist_1.Wishlist.countDocuments({
            'items': {
                $elemMatch: {
                    itemType: 'Store',
                    itemId: storeId
                }
            }
        });
        return count;
    }
    catch (error) {
        console.error(`❌ [FOLLOWER SERVICE] Error getting follower count:`, error);
        return 0;
    }
}
/**
 * Send notification to all followers of a store
 * @param storeId - Store ID
 * @param notification - Notification payload
 * @returns Result with sent/failed counts
 */
async function notifyFollowers(storeId, notification) {
    const followerIds = await getStoreFollowers(storeId);
    if (followerIds.length === 0) {
        console.log(`📢 [FOLLOWER SERVICE] No followers to notify for store ${storeId}`);
        return { sent: 0, failed: 0, totalFollowers: 0 };
    }
    let sent = 0;
    let failed = 0;
    console.log(`📢 [FOLLOWER SERVICE] Sending notifications to ${followerIds.length} followers`);
    // Send notifications to all followers
    for (const userId of followerIds) {
        try {
            await notificationService_1.NotificationService.createNotification({
                userId,
                title: notification.title,
                message: notification.message,
                type: 'promotional',
                category: 'promotional',
                priority: 'medium',
                data: {
                    storeId: storeId.toString(),
                    imageUrl: notification.imageUrl,
                    deepLink: notification.deepLink,
                    ...notification.data,
                    actionButton: notification.deepLink ? {
                        text: 'View Details',
                        action: 'navigate',
                        target: notification.deepLink
                    } : undefined
                },
                deliveryChannels: ['push', 'in_app'],
                source: 'automated'
            });
            sent++;
        }
        catch (error) {
            console.error(`❌ [FOLLOWER SERVICE] Failed to notify user ${userId}:`, error);
            failed++;
        }
    }
    console.log(`✅ [FOLLOWER SERVICE] Notification sent: ${sent}/${followerIds.length} (${failed} failed)`);
    return { sent, failed, totalFollowers: followerIds.length };
}
/**
 * Notify followers about a new offer
 * @param storeId - Store ID
 * @param offer - Offer details
 * @returns Result with sent/failed counts
 */
async function notifyNewOffer(storeId, offer) {
    try {
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            throw new Error('Store not found');
        }
        const discountText = offer.discount ? `${offer.discount}% off` : 'Special offer';
        return notifyFollowers(storeId, {
            title: `🎉 New offer from ${store.name}!`,
            message: offer.title || `${discountText} - Don't miss out!`,
            type: 'new_offer',
            imageUrl: offer.imageUrl,
            deepLink: `/stores/${store.slug}/offers/${offer._id}`,
            data: {
                offerId: offer._id.toString(),
                storeSlug: store.slug,
                offerTitle: offer.title
            }
        });
    }
    catch (error) {
        console.error(`❌ [FOLLOWER SERVICE] Error notifying new offer:`, error);
        return { sent: 0, failed: 0, totalFollowers: 0 };
    }
}
/**
 * Notify followers about a new product
 * @param storeId - Store ID
 * @param product - Product details
 * @returns Result with sent/failed counts
 */
async function notifyNewProduct(storeId, product) {
    try {
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            throw new Error('Store not found');
        }
        const priceText = product.pricing?.selling ? ` - ₹${product.pricing.selling}` : '';
        const imageUrl = product.images?.[0]?.url;
        return notifyFollowers(storeId, {
            title: `✨ New arrival at ${store.name}`,
            message: `${product.name}${priceText}`,
            type: 'new_product',
            imageUrl,
            deepLink: `/product/${product.slug || product._id}`,
            data: {
                productId: product._id.toString(),
                productName: product.name,
                storeSlug: store.slug
            }
        });
    }
    catch (error) {
        console.error(`❌ [FOLLOWER SERVICE] Error notifying new product:`, error);
        return { sent: 0, failed: 0, totalFollowers: 0 };
    }
}
/**
 * Notify followers about a price drop
 * @param storeId - Store ID
 * @param product - Product details
 * @param oldPrice - Previous price
 * @param newPrice - New price
 * @returns Result with sent/failed counts
 */
async function notifyPriceDrop(storeId, product, oldPrice, newPrice) {
    try {
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            throw new Error('Store not found');
        }
        const discount = Math.round((1 - newPrice / oldPrice) * 100);
        const imageUrl = product.images?.[0]?.url;
        return notifyFollowers(storeId, {
            title: `💰 Price drop at ${store.name}!`,
            message: `${product.name} is now ${discount}% off - ₹${oldPrice} → ₹${newPrice}`,
            type: 'price_drop',
            imageUrl,
            deepLink: `/product/${product.slug || product._id}`,
            data: {
                productId: product._id.toString(),
                productName: product.name,
                oldPrice,
                newPrice,
                discount,
                storeSlug: store.slug
            }
        });
    }
    catch (error) {
        console.error(`❌ [FOLLOWER SERVICE] Error notifying price drop:`, error);
        return { sent: 0, failed: 0, totalFollowers: 0 };
    }
}
/**
 * Notify followers about back in stock product
 * @param storeId - Store ID
 * @param product - Product details
 * @returns Result with sent/failed counts
 */
async function notifyBackInStock(storeId, product) {
    try {
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            throw new Error('Store not found');
        }
        const imageUrl = product.images?.[0]?.url;
        return notifyFollowers(storeId, {
            title: `📦 Back in stock at ${store.name}!`,
            message: `${product.name} is now available again`,
            type: 'back_in_stock',
            imageUrl,
            deepLink: `/product/${product.slug || product._id}`,
            data: {
                productId: product._id.toString(),
                productName: product.name,
                storeSlug: store.slug
            }
        });
    }
    catch (error) {
        console.error(`❌ [FOLLOWER SERVICE] Error notifying back in stock:`, error);
        return { sent: 0, failed: 0, totalFollowers: 0 };
    }
}
/**
 * Notify followers about a new menu item (for restaurants)
 * @param storeId - Store ID
 * @param menuItem - Menu item details
 * @returns Result with sent/failed counts
 */
async function notifyNewMenuItem(storeId, menuItem) {
    try {
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            throw new Error('Store not found');
        }
        const priceText = menuItem.price ? ` - ₹${menuItem.price}` : '';
        return notifyFollowers(storeId, {
            title: `🍽️ New on the menu at ${store.name}`,
            message: `Try our new ${menuItem.name}${priceText}`,
            type: 'new_menu_item',
            imageUrl: menuItem.image,
            deepLink: `/stores/${store.slug}/menu`,
            data: {
                menuItemId: menuItem._id.toString(),
                menuItemName: menuItem.name,
                storeSlug: store.slug
            }
        });
    }
    catch (error) {
        console.error(`❌ [FOLLOWER SERVICE] Error notifying new menu item:`, error);
        return { sent: 0, failed: 0, totalFollowers: 0 };
    }
}
/**
 * Notify followers about a store update/announcement
 * @param storeId - Store ID
 * @param announcement - Announcement details
 * @returns Result with sent/failed counts
 */
async function notifyStoreUpdate(storeId, announcement) {
    try {
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            throw new Error('Store not found');
        }
        return notifyFollowers(storeId, {
            title: announcement.title,
            message: announcement.message,
            type: 'store_update',
            imageUrl: announcement.imageUrl,
            deepLink: `/stores/${store.slug}`,
            data: {
                storeSlug: store.slug,
                storeName: store.name
            }
        });
    }
    catch (error) {
        console.error(`❌ [FOLLOWER SERVICE] Error notifying store update:`, error);
        return { sent: 0, failed: 0, totalFollowers: 0 };
    }
}
/**
 * Send bulk notifications to multiple stores' followers
 * @param notifications - Array of store IDs with their notifications
 * @returns Array of results
 */
async function notifyMultipleStoreFollowers(notifications) {
    const results = [];
    for (const { storeId, notification } of notifications) {
        const result = await notifyFollowers(storeId, notification);
        results.push(result);
    }
    return results;
}
exports.default = {
    getStoreFollowers,
    getStoreFollowerCount,
    notifyFollowers,
    notifyNewOffer,
    notifyNewProduct,
    notifyPriceDrop,
    notifyBackInStock,
    notifyNewMenuItem,
    notifyStoreUpdate,
    notifyMultipleStoreFollowers
};
