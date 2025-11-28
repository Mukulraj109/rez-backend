import { Product } from '../models/Product';
import { Store } from '../models/Store';
import Event from '../models/Event';
import Offer from '../models/Offer';
import { Category } from '../models/Category';
import { Video } from '../models/Video';
import { Article } from '../models/Article';

/**
 * Homepage Service
 * Aggregates data from multiple sources for the homepage
 * Uses parallel execution for optimal performance
 */

// Default limits for each section
const DEFAULT_LIMITS = {
  featuredProducts: 10,
  newArrivals: 10,
  featuredStores: 8,
  trendingStores: 8,
  upcomingEvents: 6,
  megaOffers: 5,
  studentOffers: 5,
  categories: 12,
  trendingVideos: 6,
  latestArticles: 4
};

interface HomepageQueryParams {
  userId?: string;
  sections?: string[];
  limit?: number;
  location?: {
    lat: number;
    lng: number;
  };
}

interface HomepageResponse {
  success: boolean;
  data: {
    [key: string]: any;
  };
  errors?: {
    [key: string]: string;
  };
  metadata: {
    timestamp: Date;
    requestedSections: string[];
    successfulSections: string[];
    failedSections: string[];
  };
}

/**
 * Fetch featured products
 */
async function fetchFeaturedProducts(limit: number): Promise<any[]> {
  const startTime = Date.now();
  try {
    const products: any = await (Product as any).find({
      isActive: true,
      isFeatured: true,
      'inventory.isAvailable': true
    })
      .populate('category', 'name slug')
      .populate('store', 'name slug logo')
      .select('name slug images pricing inventory ratings badges tags analytics')
      .sort({ 'analytics.views': -1, 'ratings.average': -1 })
      .limit(limit)
      .lean();

    const duration = Date.now() - startTime;
    console.log(`✅ [Homepage Service] Fetched ${products.length} featured products in ${duration}ms`);
    return products;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Homepage Service] Failed to fetch featured products in ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Fetch new arrival products
 */
async function fetchNewArrivals(limit: number): Promise<any[]> {
  const startTime = Date.now();
  try {
    // Products created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const products: any = await (Product as any).find({
      isActive: true,
      'inventory.isAvailable': true,
      createdAt: { $gte: thirtyDaysAgo }
    })
      .populate('category', 'name slug')
      .populate('store', 'name slug logo')
      .select('name slug images pricing inventory ratings badges tags createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const duration = Date.now() - startTime;
    console.log(`✅ [Homepage Service] Fetched ${products.length} new arrivals in ${duration}ms`);
    return products;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Homepage Service] Failed to fetch new arrivals in ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Fetch featured stores
 */
async function fetchFeaturedStores(limit: number): Promise<any[]> {
  const startTime = Date.now();
  try {
    const stores = await Store.find({
      isActive: true,
      isFeatured: true
    })
      .populate('category', 'name slug')
      .select('name slug logo images ratings location deliveryCategories tags operationalInfo offers')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean();

    const duration = Date.now() - startTime;
    console.log(`✅ [Homepage Service] Fetched ${stores.length} featured stores in ${duration}ms`);
    return stores;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Homepage Service] Failed to fetch featured stores in ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Fetch trending stores
 */
async function fetchTrendingStores(limit: number): Promise<any[]> {
  const startTime = Date.now();
  try {
    const stores = await Store.find({
      isActive: true
    })
      .populate('category', 'name slug')
      .select('name slug logo images ratings location tags operationalInfo offers analytics')
      .sort({ 'analytics.totalOrders': -1, 'ratings.average': -1 })
      .limit(limit)
      .lean();

    const duration = Date.now() - startTime;
    console.log(`✅ [Homepage Service] Fetched ${stores.length} trending stores in ${duration}ms`);
    return stores;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Homepage Service] Failed to fetch trending stores in ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Fetch upcoming events
 */
async function fetchUpcomingEvents(limit: number): Promise<any[]> {
  const startTime = Date.now();
  try {
    const now = new Date();

    const events = await Event.find({
      isActive: true,
      'dateTime.start': { $gte: now },
      status: 'upcoming'
    })
      .select('title slug category images price location dateTime organizer tags analytics')
      .sort({ 'dateTime.start': 1 })
      .limit(limit)
      .lean();

    const duration = Date.now() - startTime;
    console.log(`✅ [Homepage Service] Fetched ${events.length} upcoming events in ${duration}ms`);
    return events;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Homepage Service] Failed to fetch upcoming events in ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Fetch mega offers
 */
async function fetchMegaOffers(limit: number): Promise<any[]> {
  const startTime = Date.now();
  try {
    const now = new Date();

    const offers = await Offer.find({
      category: 'mega',
      'validity.isActive': true,
      'validity.startDate': { $lte: now },
      'validity.endDate': { $gte: now }
    })
      .select('title subtitle image category type cashbackPercentage originalPrice discountedPrice store validity engagement')
      .sort({ 'engagement.viewsCount': -1 })
      .limit(limit)
      .lean();

    const duration = Date.now() - startTime;
    console.log(`✅ [Homepage Service] Fetched ${offers.length} mega offers in ${duration}ms`);
    return offers;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Homepage Service] Failed to fetch mega offers in ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Fetch student offers
 */
async function fetchStudentOffers(limit: number): Promise<any[]> {
  const startTime = Date.now();
  try {
    const now = new Date();

    const offers = await Offer.find({
      category: 'student',
      'validity.isActive': true,
      'validity.startDate': { $lte: now },
      'validity.endDate': { $gte: now }
    })
      .select('title subtitle image category type cashbackPercentage originalPrice discountedPrice store validity engagement')
      .sort({ 'engagement.viewsCount': -1 })
      .limit(limit)
      .lean();

    const duration = Date.now() - startTime;
    console.log(`✅ [Homepage Service] Fetched ${offers.length} student offers in ${duration}ms`);
    return offers;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Homepage Service] Failed to fetch student offers in ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Fetch all categories
 */
async function fetchCategories(limit: number): Promise<any[]> {
  const startTime = Date.now();
  try {
    const categories = await Category.find({ isActive: true })
      .select('name slug icon image description productCount')
      .sort({ productCount: -1, name: 1 })
      .limit(limit)
      .lean();

    const duration = Date.now() - startTime;
    console.log(`✅ [Homepage Service] Fetched ${categories.length} categories in ${duration}ms`);
    return categories;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Homepage Service] Failed to fetch categories in ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Fetch trending videos
 */
async function fetchTrendingVideos(limit: number): Promise<any[]> {
  const startTime = Date.now();
  try {
    const videos = await Video.find({
      isActive: true,
      type: { $in: ['merchant', 'ugc'] }
    })
      .populate('creator', 'name avatar')
      .select('title thumbnail url duration views likes category tags createdAt')
      .sort({ views: -1, likes: -1 })
      .limit(limit)
      .lean();

    const duration = Date.now() - startTime;
    console.log(`✅ [Homepage Service] Fetched ${videos.length} trending videos in ${duration}ms`);
    return videos;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Homepage Service] Failed to fetch trending videos in ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Fetch latest articles
 */
async function fetchLatestArticles(limit: number): Promise<any[]> {
  const startTime = Date.now();
  try {
    const articles = await Article.find({
      isActive: true,
      status: 'published'
    })
      .populate('author', 'name avatar')
      .select('title slug thumbnail excerpt category tags readTime views publishedAt')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean();

    const duration = Date.now() - startTime;
    console.log(`✅ [Homepage Service] Fetched ${articles.length} latest articles in ${duration}ms`);
    return articles;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Homepage Service] Failed to fetch latest articles in ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Main function to fetch all homepage data
 * Executes all queries in parallel for optimal performance
 */
export async function getHomepageData(params: HomepageQueryParams): Promise<HomepageResponse> {
  const startTime = Date.now();
  console.log('🏠 [Homepage Service] Starting homepage data fetch...');

  // Determine which sections to fetch (default: all)
  const requestedSections = params.sections || [
    'featuredProducts',
    'newArrivals',
    'featuredStores',
    'trendingStores',
    'upcomingEvents',
    'megaOffers',
    'studentOffers',
    'categories',
    'trendingVideos',
    'latestArticles'
  ];

  // Prepare promises for parallel execution
  const promises: Record<string, Promise<any>> = {};
  const errors: Record<string, string> = {};

  // Add each requested section to promises
  if (requestedSections.includes('featuredProducts')) {
    promises.featuredProducts = fetchFeaturedProducts(params.limit || DEFAULT_LIMITS.featuredProducts)
      .catch(err => {
        errors.featuredProducts = err.message;
        return [];
      });
  }

  if (requestedSections.includes('newArrivals')) {
    promises.newArrivals = fetchNewArrivals(params.limit || DEFAULT_LIMITS.newArrivals)
      .catch(err => {
        errors.newArrivals = err.message;
        return [];
      });
  }

  if (requestedSections.includes('featuredStores')) {
    promises.featuredStores = fetchFeaturedStores(params.limit || DEFAULT_LIMITS.featuredStores)
      .catch(err => {
        errors.featuredStores = err.message;
        return [];
      });
  }

  if (requestedSections.includes('trendingStores')) {
    promises.trendingStores = fetchTrendingStores(params.limit || DEFAULT_LIMITS.trendingStores)
      .catch(err => {
        errors.trendingStores = err.message;
        return [];
      });
  }

  if (requestedSections.includes('upcomingEvents')) {
    promises.upcomingEvents = fetchUpcomingEvents(params.limit || DEFAULT_LIMITS.upcomingEvents)
      .catch(err => {
        errors.upcomingEvents = err.message;
        return [];
      });
  }

  if (requestedSections.includes('megaOffers')) {
    promises.megaOffers = fetchMegaOffers(params.limit || DEFAULT_LIMITS.megaOffers)
      .catch(err => {
        errors.megaOffers = err.message;
        return [];
      });
  }

  if (requestedSections.includes('studentOffers')) {
    promises.studentOffers = fetchStudentOffers(params.limit || DEFAULT_LIMITS.studentOffers)
      .catch(err => {
        errors.studentOffers = err.message;
        return [];
      });
  }

  if (requestedSections.includes('categories')) {
    promises.categories = fetchCategories(params.limit || DEFAULT_LIMITS.categories)
      .catch(err => {
        errors.categories = err.message;
        return [];
      });
  }

  if (requestedSections.includes('trendingVideos')) {
    promises.trendingVideos = fetchTrendingVideos(params.limit || DEFAULT_LIMITS.trendingVideos)
      .catch(err => {
        errors.trendingVideos = err.message;
        return [];
      });
  }

  if (requestedSections.includes('latestArticles')) {
    promises.latestArticles = fetchLatestArticles(params.limit || DEFAULT_LIMITS.latestArticles)
      .catch(err => {
        errors.latestArticles = err.message;
        return [];
      });
  }

  // Execute all queries in parallel
  console.log(`🔄 [Homepage Service] Executing ${Object.keys(promises).length} queries in parallel...`);
  const results = await Promise.all(Object.values(promises));
  const data = Object.keys(promises).reduce((acc, key, index) => {
    acc[key] = results[index];
    return acc;
  }, {} as Record<string, any>);

  const duration = Date.now() - startTime;
  const successfulSections = Object.keys(data).filter(key => !errors[key]);
  const failedSections = Object.keys(errors);

  console.log(`✅ [Homepage Service] Homepage data fetched in ${duration}ms`);
  console.log(`   ✅ Successful sections: ${successfulSections.length}`);
  console.log(`   ❌ Failed sections: ${failedSections.length}`);

  return {
    success: true,
    data,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    metadata: {
      timestamp: new Date(),
      requestedSections,
      successfulSections,
      failedSections
    }
  };
}
