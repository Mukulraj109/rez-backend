#!/usr/bin/env ts-node
/**
 * Merchant-User Data Sync Script
 *
 * This script syncs data between merchant-side and user-side:
 * 1. Creates stores for all merchants that don't have stores yet
 * 2. Creates user-side products for all merchant products
 *
 * Usage:
 * - npm run sync:all - Full sync of merchants and products
 * - npm run sync:merchants - Sync merchants to stores only
 * - npm run sync:products - Sync merchant products to user products only
 * - npm run sync:status - Show sync status
 */
declare function main(): Promise<void>;
export { main as syncMerchantUserData };
