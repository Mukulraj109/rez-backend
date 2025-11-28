import { Request, Response } from 'express';
import { getHomepageData } from '../services/homepageService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendInternalError } from '../utils/response';

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
 */
export const getHomepage = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Parse query parameters
    const { sections, limit, location } = req.query;
    const userId = (req as any).userId; // From optionalAuth middleware

    // Parse sections if provided
    let requestedSections: string[] | undefined;
    if (sections && typeof sections === 'string') {
      requestedSections = sections.split(',').map(s => s.trim());
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
      sections: requestedSections?.join(', ') || 'all',
      limit: limitNumber || 'default',
      location: locationCoords ? `${locationCoords.lat},${locationCoords.lng}` : 'none'
    });

    // Fetch homepage data
    const result = await getHomepageData({
      userId,
      sections: requestedSections,
      limit: limitNumber,
      location: locationCoords
    });

    const duration = Date.now() - startTime;

    // Set cache headers (5 minutes)
    res.set({
      'Cache-Control': 'public, max-age=300',
      'X-Response-Time': `${duration}ms`
    });

    console.log(`✅ [Homepage Controller] Response sent in ${duration}ms`);
    console.log(`   Sections returned: ${Object.keys(result.data).length}`);
    console.log(`   Total items: ${Object.values(result.data).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0)}`);

    // Send response
    sendSuccess(res, {
      ...result.data,
      _metadata: result.metadata,
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
