/**
 * Comprehensive UGC Video Seeding Script
 * - Links videos to existing products (doesn't modify product data)
 * - Uses merchant users as creators
 * - Links videos to stores
 * - Creates shoppable video content
 */
declare function seedUGCVideos(): Promise<void>;
export { seedUGCVideos };
