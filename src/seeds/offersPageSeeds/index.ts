/**
 * Offers Page Seeds - Main Export
 *
 * This file exports all seed data for the offers page
 */

// Store seeds
export { storeSeeds, storeIds, getStoreInfo } from './storeSeeds';

// Offer seeds
export { offerSeeds } from './offerSeeds';

// Hotspot seeds
export { hotspotSeeds } from './hotspotSeeds';

// Campaign seeds
export { doubleCashbackSeeds } from './doubleCashbackSeeds';
export { coinDropSeeds } from './coinDropSeeds';

// Store-related seeds
export { uploadBillStoreSeeds } from './uploadBillStoreSeeds';
export { bankOfferSeeds } from './bankOfferSeeds';

// Exclusive zone seeds
export { exclusiveZoneSeeds } from './exclusiveZoneSeeds';
export { specialProfileSeeds } from './specialProfileSeeds';

// Loyalty seeds
export { loyaltyMilestoneSeeds } from './loyaltyMilestoneSeeds';

// Re-export all for convenience
// Note: All exports are named exports above. Default export removed to avoid TypeScript private name issues.
