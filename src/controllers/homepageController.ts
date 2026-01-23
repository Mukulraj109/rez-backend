import { Request, Response } from 'express';
import { getHomepageData } from '../services/homepageService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendInternalError } from '../utils/response';
import { modeService, ModeId } from '../services/modeService';
import { isValidRegion, RegionId, DEFAULT_REGION } from '../services/regionService';

/**
 * Homepage Controller
 * Handles homepage data requests with caching and error handling
 */

/**
 * @route   GET /api/homepage
 * @desc    Get all homepage data in a single batch request
 * @access  Public (optionalAuth)
 * @query   {string} sections - Comma-separated list of sections to fetch (optional)
 * @query   {number} limit - Limit for each section (optional, default varies by section)
 * @query   {string} location - User location as "lat,lng" (optional)
 * @query   {string} mode - Mode filter: 'near-u' | 'mall' | 'cash' | 'prive' (optional)
 */
export const getHomepage = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Parse query parameters
    const { sections, limit, location, mode, region: regionQuery } = req.query;
    const userId = (req as any).userId; // From optionalAuth middleware

    // Get region from X-Rez-Region header or query param
    const regionHeader = req.headers['x-rez-region'] as string;
    let region: RegionId | undefined;

    // Priority: header > query param > user preference
    if (regionHeader && isValidRegion(regionHeader)) {
      region = regionHeader as RegionId;
    } else if (regionQuery && typeof regionQuery === 'string' && isValidRegion(regionQuery)) {
      region = regionQuery as RegionId;
    } else if ((req as any).user?.preferences?.region && isValidRegion((req as any).user.preferences.region)) {
      region = (req as any).user.preferences.region;
    }

    // Parse and validate mode
    const activeMode: ModeId = modeService.getModeFromRequest(
      mode as string | undefined,
      (req as any).user?.preferences?.activeMode
    );

    // Parse sections if provided, or use mode-specific sections
    let requestedSections: string[] | undefined;
    if (sections && typeof sections === 'string') {
      requestedSections = sections.split(',').map(s => s.trim());
    } else {
      // Use mode-specific default sections
      requestedSections = modeService.getHomepageSections(activeMode);
    }

    // Parse location if provided
    let locationCoords: { lat: number; lng: number } | undefined;
    if (location && typeof location === 'string') {
      const [lat, lng] = location.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        locationCoords = { lat, lng };
      }
    }

    // Parse limit
    const limitNumber = limit ? parseInt(limit as string, 10) : undefined;

    console.log('🏠 [Homepage Controller] Request params:', {
      userId: userId || 'anonymous',
      mode: activeMode,
      region: region || 'none',
      regionHeader: regionHeader || 'NOT_RECEIVED',
      regionQuery: regionQuery || 'none',
      sections: requestedSections?.join(', ') || 'all',
      limit: limitNumber || 'default',
      location: locationCoords ? `${locationCoords.lat},${locationCoords.lng}` : 'none',
      allHeaders: JSON.stringify(req.headers)
    });

    // Fetch homepage data with mode and region filtering
    const result = await getHomepageData({
      userId,
      sections: requestedSections,
      limit: limitNumber,
      location: locationCoords,
      mode: activeMode,
      region, // Pass region to service for filtering
    });

    const duration = Date.now() - startTime;

    // Set cache headers - use private cache since response varies by region header
    // Browser should not cache this publicly as it depends on X-Rez-Region header
    res.set({
      'Cache-Control': 'private, max-age=60',
      'Vary': 'X-Rez-Region',
      'X-Response-Time': `${duration}ms`
    });

    console.log(`✅ [Homepage Controller] Response sent in ${duration}ms`);
    console.log(`   Sections returned: ${Object.keys(result.data).length}`);
    console.log(`   Total items: ${Object.values(result.data).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0)}`);

    // Send response with mode and region info
    sendSuccess(res, {
      ...result.data,
      _metadata: {
        ...result.metadata,
        mode: activeMode,
        region: region || null,
      },
      _errors: result.errors
    }, 'Homepage data retrieved successfully');

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Homepage Controller] Error after ${duration}ms:`, error);

    sendInternalError(res, 'Failed to fetch homepage data');
  }
});

/**
 * @route   GET /api/homepage/sections
 * @desc    Get available sections for homepage
 * @access  Public
 */
export const getAvailableSections = asyncHandler(async (req: Request, res: Response) => {
  const sections = [
    {
      name: 'featuredProducts',
      description: 'Featured products highlighted on homepage',
      defaultLimit: 10
    },
    {
      name: 'newArrivals',
      description: 'Recently added products (last 30 days)',
      defaultLimit: 10
    },
    {
      name: 'featuredStores',
      description: 'Featured stores with high ratings',
      defaultLimit: 8
    },
    {
      name: 'trendingStores',
      description: 'Stores with most orders and engagement',
      defaultLimit: 8
    },
    {
      name: 'upcomingEvents',
      description: 'Upcoming events sorted by date',
      defaultLimit: 6
    },
    {
      name: 'megaOffers',
      description: 'Mega offers and deals',
      defaultLimit: 5
    },
    {
      name: 'studentOffers',
      description: 'Special offers for students',
      defaultLimit: 5
    },
    {
      name: 'categories',
      description: 'All product categories',
      defaultLimit: 12
    },
    {
      name: 'trendingVideos',
      description: 'Most viewed videos',
      defaultLimit: 6
    },
    {
      name: 'latestArticles',
      description: 'Recently published articles',
      defaultLimit: 4
    }
  ];

  sendSuccess(res, { sections }, 'Available homepage sections');
});
