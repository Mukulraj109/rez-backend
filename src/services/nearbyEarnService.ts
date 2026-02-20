import { Store } from '../models/Store';
import BonusCampaign from '../models/BonusCampaign';
import mongoose from 'mongoose';

interface EarningOpportunity {
  campaignId: string;
  title: string;
  subtitle: string;
  campaignType: string;
  reward: {
    type: string;
    value: number;
    coinType: string;
  };
  display: {
    icon: string;
    badgeText?: string;
    backgroundColor?: string;
  };
  endTime: Date;
}

interface NearbyStoreWithEarnings {
  store: any;
  distance: number; // in kilometers
  earningOpportunities: EarningOpportunity[];
  baseCashbackPercent: number;
}

class NearbyEarnService {
  /**
   * Find stores near a location with earning opportunities.
   * Uses MongoDB $geoNear on Store's location.coordinates (2dsphere index).
   * For each store found, queries active BonusCampaigns where the store
   * matches eligibility.storeIds or eligibility.merchantCategories includes
   * the store's category.
   */
  async getStoresNearby(
    lat: number,
    lng: number,
    radiusKm: number = 10,
    limit: number = 20
  ): Promise<NearbyStoreWithEarnings[]> {
    try {
      // Use $geoNear aggregation to find nearby active stores with distance
      const nearbyStores = await Store.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [lng, lat], // GeoJSON: [longitude, latitude]
            },
            distanceField: 'distance', // in meters
            maxDistance: radiusKm * 1000, // convert km to meters
            spherical: true,
            query: { isActive: true },
          },
        },
        { $limit: limit },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryDoc',
          },
        },
        { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            logo: 1,
            image: 1,
            description: 1,
            category: 1,
            'categoryDoc.slug': 1,
            'categoryDoc.parentCategory': 1,
            location: 1,
            ratings: 1,
            tags: 1,
            isVerified: 1,
            isFeatured: 1,
            'offers.cashback': 1,
            'offers.isPartner': 1,
            'offers.partnerLevel': 1,
            'rewardRules.baseCashbackPercent': 1,
            distance: 1,
          },
        },
      ]);

      if (!nearbyStores.length) {
        return [];
      }

      // Collect all store IDs and category slugs for campaign matching
      const storeIds = nearbyStores.map((s: any) => s._id);
      const categorySlugSet = new Set<string>();

      for (const store of nearbyStores) {
        if (store.categoryDoc?.slug) {
          categorySlugSet.add(store.categoryDoc.slug);
        }
      }

      const categorySlugs = Array.from(categorySlugSet);

      // Fetch active bonus campaigns that could apply to these stores
      const now = new Date();
      const activeCampaigns = await BonusCampaign.find({
        status: 'active',
        startTime: { $lte: now },
        endTime: { $gte: now },
        $or: [
          { 'eligibility.storeIds': { $in: storeIds } },
          ...(categorySlugs.length > 0
            ? [{ 'eligibility.merchantCategories': { $in: categorySlugs } }]
            : []),
          // Campaigns with no store/category restrictions (apply to all)
          {
            'eligibility.storeIds': { $exists: true, $size: 0 },
            'eligibility.merchantCategories': { $exists: true, $size: 0 },
          },
        ],
      }).lean();

      // Build a lookup: storeId -> matching campaigns
      // Also index campaigns by merchantCategory
      const campaignsByStoreId = new Map<string, typeof activeCampaigns>();
      const campaignsByCategory = new Map<string, typeof activeCampaigns>();
      const universalCampaigns: typeof activeCampaigns = [];

      for (const campaign of activeCampaigns) {
        const eligibility = campaign.eligibility || {};

        const hasStoreIds = eligibility.storeIds && eligibility.storeIds.length > 0;
        const hasMerchantCategories =
          eligibility.merchantCategories && eligibility.merchantCategories.length > 0;

        if (!hasStoreIds && !hasMerchantCategories) {
          // Universal campaign — applies to all stores
          universalCampaigns.push(campaign);
          continue;
        }

        if (hasStoreIds) {
          for (const sid of eligibility.storeIds!) {
            const key = sid.toString();
            if (!campaignsByStoreId.has(key)) {
              campaignsByStoreId.set(key, []);
            }
            campaignsByStoreId.get(key)!.push(campaign);
          }
        }

        if (hasMerchantCategories) {
          for (const cat of eligibility.merchantCategories!) {
            if (!campaignsByCategory.has(cat)) {
              campaignsByCategory.set(cat, []);
            }
            campaignsByCategory.get(cat)!.push(campaign);
          }
        }
      }

      // Map stores to result format with earning opportunities
      const results: NearbyStoreWithEarnings[] = nearbyStores.map((store: any) => {
        const storeIdStr = store._id.toString();
        const storeCategorySlug = store.categoryDoc?.slug || '';

        // Collect matching campaigns (deduplicate by campaign ID)
        const matchedCampaignMap = new Map<string, (typeof activeCampaigns)[0]>();

        // Direct store ID match
        const storeMatches = campaignsByStoreId.get(storeIdStr) || [];
        for (const c of storeMatches) {
          matchedCampaignMap.set(c._id.toString(), c);
        }

        // Category match
        const catMatches = campaignsByCategory.get(storeCategorySlug) || [];
        for (const c of catMatches) {
          matchedCampaignMap.set(c._id.toString(), c);
        }

        // Universal campaigns
        for (const c of universalCampaigns) {
          matchedCampaignMap.set(c._id.toString(), c);
        }

        // Build earning opportunities
        const earningOpportunities: EarningOpportunity[] = Array.from(
          matchedCampaignMap.values()
        ).map((campaign) => ({
          campaignId: campaign._id.toString(),
          title: campaign.title,
          subtitle: campaign.subtitle,
          campaignType: campaign.campaignType,
          reward: {
            type: campaign.reward.type,
            value: campaign.reward.value,
            coinType: campaign.reward.coinType,
          },
          display: {
            icon: campaign.display?.icon || '',
            badgeText: campaign.display?.badgeText,
            backgroundColor: campaign.display?.backgroundColor,
          },
          endTime: campaign.endTime,
        }));

        // Distance in km (geoNear returns meters)
        const distanceKm = Math.round((store.distance / 1000) * 100) / 100;

        return {
          store: {
            _id: store._id,
            name: store.name,
            slug: store.slug,
            logo: store.logo,
            image: store.image,
            description: store.description,
            category: store.category,
            categorySlug: storeCategorySlug,
            location: store.location,
            ratings: store.ratings,
            tags: store.tags,
            isVerified: store.isVerified,
            isFeatured: store.isFeatured,
            isPartner: store.offers?.isPartner || false,
            partnerLevel: store.offers?.partnerLevel,
          },
          distance: distanceKm,
          earningOpportunities,
          baseCashbackPercent: store.rewardRules?.baseCashbackPercent || store.offers?.cashback || 0,
        };
      });

      return results;
    } catch (error) {
      console.error('[NearbyEarnService] getStoresNearby error:', error);
      throw error;
    }
  }
}

export default new NearbyEarnService();
