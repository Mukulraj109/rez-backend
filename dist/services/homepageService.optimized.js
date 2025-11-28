"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomepageDataOptimized = getHomepageDataOptimized;
exports.comparePerformance = comparePerformance;
const Product_1 = require("../models/Product");
const Store_1 = require("../models/Store");
const Event_1 = __importDefault(require("../models/Event"));
const Offer_1 = __importDefault(require("../models/Offer"));
const Category_1 = require("../models/Category");
const Video_1 = require("../models/Video");
const Article_1 = require("../models/Article");
/**
 * Homepage Service - OPTIMIZED VERSION
 * Uses MongoDB Aggregation Pipelines for improved performance
 *
 * PERFORMANCE IMPROVEMENTS:
 * - Single aggregation queries instead of multiple find() + populate()
 * - $facet for parallel operations within same query
 * - $lookup for efficient joins
 * - Computed fields using $addFields
 * - Reduced network overhead
 * - Better index utilization
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
/**
 * OPTIMIZED: Fetch featured products using aggregation pipeline
 *
 * IMPROVEMENTS:
 * - $lookup replaces separate populate() calls
 * - $addFields adds computed discount percentage
 * - $project for selective field return
 * - Single database roundtrip
 */
async function fetchFeaturedProductsOptimized(limit) {
    const startTime = Date.now();
    try {
        const pipeline = [
            // Stage 1: Match active, featured, available products
            {
                $match: {
                    isActive: true,
                    isFeatured: true,
                    'inventory.isAvailable': true
                }
            },
            // Stage 2: Sort by views and ratings
            {
                $sort: {
                    'analytics.views': -1,
                    'ratings.average': -1
                }
            },
            // Stage 3: Limit results
            {
                $limit: limit
            },
            // Stage 4: Lookup category data
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                    pipeline: [
                        { $project: { name: 1, slug: 1 } }
                    ]
                }
            },
            // Stage 5: Lookup store data
            {
                $lookup: {
                    from: 'stores',
                    localField: 'store',
                    foreignField: '_id',
                    as: 'store',
                    pipeline: [
                        { $project: { name: 1, slug: 1, logo: 1 } }
                    ]
                }
            },
            // Stage 6: Unwind category and store arrays
            {
                $unwind: {
                    path: '$category',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$store',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Stage 7: Add computed fields
            {
                $addFields: {
                    discountPercent: {
                        $cond: {
                            if: { $gt: ['$pricing.original', '$pricing.selling'] },
                            then: {
                                $multiply: [
                                    {
                                        $divide: [
                                            { $subtract: ['$pricing.original', '$pricing.selling'] },
                                            '$pricing.original'
                                        ]
                                    },
                                    100
                                ]
                            },
                            else: 0
                        }
                    },
                    isLowStock: {
                        $cond: {
                            if: '$inventory.unlimited',
                            then: false,
                            else: {
                                $lte: ['$inventory.stock', '$inventory.lowStockThreshold']
                            }
                        }
                    }
                }
            },
            // Stage 8: Project only needed fields
            {
                $project: {
                    name: 1,
                    slug: 1,
                    images: 1,
                    pricing: 1,
                    inventory: 1,
                    ratings: 1,
                    badges: 1,
                    tags: 1,
                    analytics: 1,
                    category: 1,
                    store: 1,
                    discountPercent: 1,
                    isLowStock: 1
                }
            }
        ];
        const products = await Product_1.Product.aggregate(pipeline);
        const duration = Date.now() - startTime;
        console.log(`✅ [Optimized] Fetched ${products.length} featured products in ${duration}ms`);
        return products;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [Optimized] Failed to fetch featured products in ${duration}ms:`, error);
        throw error;
    }
}
/**
 * OPTIMIZED: Fetch new arrivals using aggregation pipeline
 *
 * IMPROVEMENTS:
 * - Computed date filtering
 * - Efficient $lookup for relations
 * - Single query execution
 */
async function fetchNewArrivalsOptimized(limit) {
    const startTime = Date.now();
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const pipeline = [
            // Stage 1: Match active products from last 30 days
            {
                $match: {
                    isActive: true,
                    'inventory.isAvailable': true,
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            // Stage 2: Sort by creation date
            {
                $sort: { createdAt: -1 }
            },
            // Stage 3: Limit results
            {
                $limit: limit
            },
            // Stage 4: Lookup category
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                    pipeline: [
                        { $project: { name: 1, slug: 1 } }
                    ]
                }
            },
            // Stage 5: Lookup store
            {
                $lookup: {
                    from: 'stores',
                    localField: 'store',
                    foreignField: '_id',
                    as: 'store',
                    pipeline: [
                        { $project: { name: 1, slug: 1, logo: 1 } }
                    ]
                }
            },
            // Stage 6: Unwind lookups
            {
                $unwind: {
                    path: '$category',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$store',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Stage 7: Add computed fields
            {
                $addFields: {
                    daysOld: {
                        $divide: [
                            { $subtract: [new Date(), '$createdAt'] },
                            86400000 // milliseconds in a day
                        ]
                    }
                }
            },
            // Stage 8: Project fields
            {
                $project: {
                    name: 1,
                    slug: 1,
                    images: 1,
                    pricing: 1,
                    inventory: 1,
                    ratings: 1,
                    badges: 1,
                    tags: 1,
                    createdAt: 1,
                    category: 1,
                    store: 1,
                    daysOld: 1
                }
            }
        ];
        const products = await Product_1.Product.aggregate(pipeline);
        const duration = Date.now() - startTime;
        console.log(`✅ [Optimized] Fetched ${products.length} new arrivals in ${duration}ms`);
        return products;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [Optimized] Failed to fetch new arrivals in ${duration}ms:`, error);
        throw error;
    }
}
/**
 * OPTIMIZED: Fetch both featured and trending stores in single query using $facet
 *
 * IMPROVEMENTS:
 * - $facet for parallel execution
 * - Single database query for two operations
 * - Reduced network overhead
 */
async function fetchStoresOptimized(featuredLimit, trendingLimit) {
    const startTime = Date.now();
    try {
        const pipeline = [
            // Stage 1: Match all active stores
            {
                $match: {
                    isActive: true
                }
            },
            // Stage 2: Use $facet for parallel operations
            {
                $facet: {
                    // Featured stores branch
                    featured: [
                        { $match: { isFeatured: true } },
                        { $sort: { 'ratings.average': -1 } },
                        { $limit: featuredLimit },
                        {
                            $lookup: {
                                from: 'categories',
                                localField: 'category',
                                foreignField: '_id',
                                as: 'category',
                                pipeline: [
                                    { $project: { name: 1, slug: 1 } }
                                ]
                            }
                        },
                        {
                            $unwind: {
                                path: '$category',
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                slug: 1,
                                logo: 1,
                                images: 1,
                                ratings: 1,
                                location: 1,
                                deliveryCategories: 1,
                                tags: 1,
                                operationalInfo: 1,
                                offers: 1,
                                category: 1
                            }
                        }
                    ],
                    // Trending stores branch
                    trending: [
                        { $sort: { 'analytics.totalOrders': -1, 'ratings.average': -1 } },
                        { $limit: trendingLimit },
                        {
                            $lookup: {
                                from: 'categories',
                                localField: 'category',
                                foreignField: '_id',
                                as: 'category',
                                pipeline: [
                                    { $project: { name: 1, slug: 1 } }
                                ]
                            }
                        },
                        {
                            $unwind: {
                                path: '$category',
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        {
                            $addFields: {
                                popularityScore: {
                                    $add: [
                                        { $multiply: ['$analytics.totalOrders', 0.7] },
                                        { $multiply: ['$ratings.average', 100, 0.3] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                slug: 1,
                                logo: 1,
                                images: 1,
                                ratings: 1,
                                location: 1,
                                tags: 1,
                                operationalInfo: 1,
                                offers: 1,
                                analytics: 1,
                                category: 1,
                                popularityScore: 1
                            }
                        }
                    ]
                }
            }
        ];
        const result = await Store_1.Store.aggregate(pipeline);
        const { featured, trending } = result[0] || { featured: [], trending: [] };
        const duration = Date.now() - startTime;
        console.log(`✅ [Optimized] Fetched ${featured.length} featured + ${trending.length} trending stores in ${duration}ms`);
        return { featured, trending };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [Optimized] Failed to fetch stores in ${duration}ms:`, error);
        throw error;
    }
}
/**
 * OPTIMIZED: Fetch upcoming events using aggregation
 *
 * IMPROVEMENTS:
 * - Computed time until event
 * - Efficient date filtering
 */
async function fetchUpcomingEventsOptimized(limit) {
    const startTime = Date.now();
    try {
        const now = new Date();
        const pipeline = [
            // Stage 1: Match upcoming events
            {
                $match: {
                    isActive: true,
                    'dateTime.start': { $gte: now },
                    status: 'upcoming'
                }
            },
            // Stage 2: Sort by start date
            {
                $sort: { 'dateTime.start': 1 }
            },
            // Stage 3: Limit results
            {
                $limit: limit
            },
            // Stage 4: Add computed fields
            {
                $addFields: {
                    daysUntilEvent: {
                        $divide: [
                            { $subtract: ['$dateTime.start', now] },
                            86400000 // milliseconds in a day
                        ]
                    },
                    isUrgent: {
                        $lt: [
                            { $subtract: ['$dateTime.start', now] },
                            259200000 // 3 days in milliseconds
                        ]
                    }
                }
            },
            // Stage 5: Project fields
            {
                $project: {
                    title: 1,
                    slug: 1,
                    category: 1,
                    images: 1,
                    price: 1,
                    location: 1,
                    dateTime: 1,
                    organizer: 1,
                    tags: 1,
                    analytics: 1,
                    daysUntilEvent: 1,
                    isUrgent: 1
                }
            }
        ];
        const events = await Event_1.default.aggregate(pipeline);
        const duration = Date.now() - startTime;
        console.log(`✅ [Optimized] Fetched ${events.length} upcoming events in ${duration}ms`);
        return events;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [Optimized] Failed to fetch upcoming events in ${duration}ms:`, error);
        throw error;
    }
}
/**
 * OPTIMIZED: Fetch both mega and student offers in single query using $facet
 *
 * IMPROVEMENTS:
 * - $facet for parallel execution
 * - Computed discount percentage
 * - Days remaining calculation
 */
async function fetchOffersOptimized(megaLimit, studentLimit) {
    const startTime = Date.now();
    try {
        const now = new Date();
        const pipeline = [
            // Stage 1: Match all active offers
            {
                $match: {
                    'validity.isActive': true,
                    'validity.startDate': { $lte: now },
                    'validity.endDate': { $gte: now }
                }
            },
            // Stage 2: Use $facet for parallel operations
            {
                $facet: {
                    // Mega offers branch
                    mega: [
                        { $match: { category: 'mega' } },
                        { $sort: { 'engagement.viewsCount': -1 } },
                        { $limit: megaLimit },
                        {
                            $addFields: {
                                discountPercent: {
                                    $cond: {
                                        if: { $and: ['$originalPrice', '$discountedPrice'] },
                                        then: {
                                            $multiply: [
                                                {
                                                    $divide: [
                                                        { $subtract: ['$originalPrice', '$discountedPrice'] },
                                                        '$originalPrice'
                                                    ]
                                                },
                                                100
                                            ]
                                        },
                                        else: '$cashbackPercentage'
                                    }
                                },
                                daysRemaining: {
                                    $divide: [
                                        { $subtract: ['$validity.endDate', now] },
                                        86400000
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                title: 1,
                                subtitle: 1,
                                image: 1,
                                category: 1,
                                type: 1,
                                cashbackPercentage: 1,
                                originalPrice: 1,
                                discountedPrice: 1,
                                store: 1,
                                validity: 1,
                                engagement: 1,
                                discountPercent: 1,
                                daysRemaining: 1
                            }
                        }
                    ],
                    // Student offers branch
                    student: [
                        { $match: { category: 'student' } },
                        { $sort: { 'engagement.viewsCount': -1 } },
                        { $limit: studentLimit },
                        {
                            $addFields: {
                                discountPercent: {
                                    $cond: {
                                        if: { $and: ['$originalPrice', '$discountedPrice'] },
                                        then: {
                                            $multiply: [
                                                {
                                                    $divide: [
                                                        { $subtract: ['$originalPrice', '$discountedPrice'] },
                                                        '$originalPrice'
                                                    ]
                                                },
                                                100
                                            ]
                                        },
                                        else: '$cashbackPercentage'
                                    }
                                },
                                daysRemaining: {
                                    $divide: [
                                        { $subtract: ['$validity.endDate', now] },
                                        86400000
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                title: 1,
                                subtitle: 1,
                                image: 1,
                                category: 1,
                                type: 1,
                                cashbackPercentage: 1,
                                originalPrice: 1,
                                discountedPrice: 1,
                                store: 1,
                                validity: 1,
                                engagement: 1,
                                discountPercent: 1,
                                daysRemaining: 1
                            }
                        }
                    ]
                }
            }
        ];
        const result = await Offer_1.default.aggregate(pipeline);
        const { mega, student } = result[0] || { mega: [], student: [] };
        const duration = Date.now() - startTime;
        console.log(`✅ [Optimized] Fetched ${mega.length} mega + ${student.length} student offers in ${duration}ms`);
        return { mega, student };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [Optimized] Failed to fetch offers in ${duration}ms:`, error);
        throw error;
    }
}
/**
 * OPTIMIZED: Fetch categories with product count
 *
 * IMPROVEMENTS:
 * - Direct sorting and limiting
 * - Minimal field projection
 */
async function fetchCategoriesOptimized(limit) {
    const startTime = Date.now();
    try {
        const pipeline = [
            // Stage 1: Match active categories
            {
                $match: { isActive: true }
            },
            // Stage 2: Sort by product count and name
            {
                $sort: { productCount: -1, name: 1 }
            },
            // Stage 3: Limit results
            {
                $limit: limit
            },
            // Stage 4: Project only needed fields
            {
                $project: {
                    name: 1,
                    slug: 1,
                    icon: 1,
                    image: 1,
                    description: 1,
                    productCount: 1
                }
            }
        ];
        const categories = await Category_1.Category.aggregate(pipeline);
        const duration = Date.now() - startTime;
        console.log(`✅ [Optimized] Fetched ${categories.length} categories in ${duration}ms`);
        return categories;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [Optimized] Failed to fetch categories in ${duration}ms:`, error);
        throw error;
    }
}
/**
 * OPTIMIZED: Fetch trending videos using aggregation
 *
 * IMPROVEMENTS:
 * - $lookup for creator info
 * - Computed engagement score
 */
async function fetchTrendingVideosOptimized(limit) {
    const startTime = Date.now();
    try {
        const pipeline = [
            // Stage 1: Match active videos
            {
                $match: {
                    isActive: true,
                    type: { $in: ['merchant', 'ugc'] }
                }
            },
            // Stage 2: Sort by views and likes
            {
                $sort: { views: -1, likes: -1 }
            },
            // Stage 3: Limit results
            {
                $limit: limit
            },
            // Stage 4: Lookup creator info
            {
                $lookup: {
                    from: 'users',
                    localField: 'creator',
                    foreignField: '_id',
                    as: 'creator',
                    pipeline: [
                        { $project: { name: 1, avatar: 1 } }
                    ]
                }
            },
            // Stage 5: Unwind creator
            {
                $unwind: {
                    path: '$creator',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Stage 6: Add computed engagement score
            {
                $addFields: {
                    engagementScore: {
                        $add: [
                            { $multiply: ['$views', 1] },
                            { $multiply: ['$likes', 10] }
                        ]
                    }
                }
            },
            // Stage 7: Project fields
            {
                $project: {
                    title: 1,
                    thumbnail: 1,
                    url: 1,
                    duration: 1,
                    views: 1,
                    likes: 1,
                    category: 1,
                    tags: 1,
                    createdAt: 1,
                    creator: 1,
                    engagementScore: 1
                }
            }
        ];
        const videos = await Video_1.Video.aggregate(pipeline);
        const duration = Date.now() - startTime;
        console.log(`✅ [Optimized] Fetched ${videos.length} trending videos in ${duration}ms`);
        return videos;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [Optimized] Failed to fetch trending videos in ${duration}ms:`, error);
        throw error;
    }
}
/**
 * OPTIMIZED: Fetch latest articles using aggregation
 *
 * IMPROVEMENTS:
 * - $lookup for author info
 * - Computed reading time metrics
 */
async function fetchLatestArticlesOptimized(limit) {
    const startTime = Date.now();
    try {
        const pipeline = [
            // Stage 1: Match published articles
            {
                $match: {
                    isActive: true,
                    status: 'published'
                }
            },
            // Stage 2: Sort by publish date
            {
                $sort: { publishedAt: -1 }
            },
            // Stage 3: Limit results
            {
                $limit: limit
            },
            // Stage 4: Lookup author info
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author',
                    pipeline: [
                        { $project: { name: 1, avatar: 1 } }
                    ]
                }
            },
            // Stage 5: Unwind author
            {
                $unwind: {
                    path: '$author',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Stage 6: Add computed fields
            {
                $addFields: {
                    daysOld: {
                        $divide: [
                            { $subtract: [new Date(), '$publishedAt'] },
                            86400000
                        ]
                    }
                }
            },
            // Stage 7: Project fields
            {
                $project: {
                    title: 1,
                    slug: 1,
                    thumbnail: 1,
                    excerpt: 1,
                    category: 1,
                    tags: 1,
                    readTime: 1,
                    views: 1,
                    publishedAt: 1,
                    author: 1,
                    daysOld: 1
                }
            }
        ];
        const articles = await Article_1.Article.aggregate(pipeline);
        const duration = Date.now() - startTime;
        console.log(`✅ [Optimized] Fetched ${articles.length} latest articles in ${duration}ms`);
        return articles;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [Optimized] Failed to fetch latest articles in ${duration}ms:`, error);
        throw error;
    }
}
/**
 * MAIN OPTIMIZED FUNCTION: Fetch all homepage data
 *
 * IMPROVEMENTS:
 * - Uses optimized aggregation functions
 * - Parallel execution maintained
 * - Better error handling
 * - Performance metrics
 */
async function getHomepageDataOptimized(params) {
    const startTime = Date.now();
    console.log('🏠 [Homepage Service - OPTIMIZED] Starting homepage data fetch...');
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
    const promises = {};
    const errors = {};
    // Group related queries for optimization
    const needsFeaturedProducts = requestedSections.includes('featuredProducts');
    const needsNewArrivals = requestedSections.includes('newArrivals');
    const needsFeaturedStores = requestedSections.includes('featuredStores');
    const needsTrendingStores = requestedSections.includes('trendingStores');
    const needsMegaOffers = requestedSections.includes('megaOffers');
    const needsStudentOffers = requestedSections.includes('studentOffers');
    // Add optimized queries
    if (needsFeaturedProducts) {
        promises.featuredProducts = fetchFeaturedProductsOptimized(params.limit || DEFAULT_LIMITS.featuredProducts)
            .catch(err => {
            errors.featuredProducts = err.message;
            return [];
        });
    }
    if (needsNewArrivals) {
        promises.newArrivals = fetchNewArrivalsOptimized(params.limit || DEFAULT_LIMITS.newArrivals)
            .catch(err => {
            errors.newArrivals = err.message;
            return [];
        });
    }
    // Combine store queries if both are needed
    if (needsFeaturedStores || needsTrendingStores) {
        promises.storesData = fetchStoresOptimized(params.limit || DEFAULT_LIMITS.featuredStores, params.limit || DEFAULT_LIMITS.trendingStores).catch(err => {
            errors.stores = err.message;
            return { featured: [], trending: [] };
        });
    }
    if (requestedSections.includes('upcomingEvents')) {
        promises.upcomingEvents = fetchUpcomingEventsOptimized(params.limit || DEFAULT_LIMITS.upcomingEvents)
            .catch(err => {
            errors.upcomingEvents = err.message;
            return [];
        });
    }
    // Combine offer queries if both are needed
    if (needsMegaOffers || needsStudentOffers) {
        promises.offersData = fetchOffersOptimized(params.limit || DEFAULT_LIMITS.megaOffers, params.limit || DEFAULT_LIMITS.studentOffers).catch(err => {
            errors.offers = err.message;
            return { mega: [], student: [] };
        });
    }
    if (requestedSections.includes('categories')) {
        promises.categories = fetchCategoriesOptimized(params.limit || DEFAULT_LIMITS.categories)
            .catch(err => {
            errors.categories = err.message;
            return [];
        });
    }
    if (requestedSections.includes('trendingVideos')) {
        promises.trendingVideos = fetchTrendingVideosOptimized(params.limit || DEFAULT_LIMITS.trendingVideos)
            .catch(err => {
            errors.trendingVideos = err.message;
            return [];
        });
    }
    if (requestedSections.includes('latestArticles')) {
        promises.latestArticles = fetchLatestArticlesOptimized(params.limit || DEFAULT_LIMITS.latestArticles)
            .catch(err => {
            errors.latestArticles = err.message;
            return [];
        });
    }
    // Execute all queries in parallel
    console.log(`🔄 [Homepage Service - OPTIMIZED] Executing ${Object.keys(promises).length} optimized queries in parallel...`);
    const results = await Promise.allSettled(Object.values(promises));
    // Process results
    const data = {};
    const promiseKeys = Object.keys(promises);
    results.forEach((result, index) => {
        const key = promiseKeys[index];
        if (result.status === 'fulfilled') {
            const value = result.value;
            // Handle combined queries
            if (key === 'storesData') {
                if (needsFeaturedStores)
                    data.featuredStores = value.featured;
                if (needsTrendingStores)
                    data.trendingStores = value.trending;
            }
            else if (key === 'offersData') {
                if (needsMegaOffers)
                    data.megaOffers = value.mega;
                if (needsStudentOffers)
                    data.studentOffers = value.student;
            }
            else {
                data[key] = value;
            }
        }
    });
    const duration = Date.now() - startTime;
    const successfulSections = Object.keys(data).filter(key => !errors[key]);
    const failedSections = Object.keys(errors);
    console.log(`✅ [Homepage Service - OPTIMIZED] Homepage data fetched in ${duration}ms`);
    console.log(`   ✅ Successful sections: ${successfulSections.length}`);
    console.log(`   ❌ Failed sections: ${failedSections.length}`);
    console.log(`   ⚡ Performance improvement vs original implementation`);
    return {
        success: true,
        data,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        metadata: {
            timestamp: new Date(),
            requestedSections,
            successfulSections,
            failedSections,
            executionTime: duration
        }
    };
}
/**
 * UTILITY: Compare performance between original and optimized versions
 */
async function comparePerformance(params) {
    // Import original function
    const { getHomepageData } = require('./homepageService');
    // Test original
    const originalStart = Date.now();
    let originalSuccess = true;
    try {
        await getHomepageData(params);
    }
    catch (error) {
        originalSuccess = false;
    }
    const originalDuration = Date.now() - originalStart;
    // Test optimized
    const optimizedStart = Date.now();
    let optimizedSuccess = true;
    try {
        await getHomepageDataOptimized(params);
    }
    catch (error) {
        optimizedSuccess = false;
    }
    const optimizedDuration = Date.now() - optimizedStart;
    const improvement = ((originalDuration - optimizedDuration) / originalDuration) * 100;
    return {
        original: { duration: originalDuration, success: originalSuccess },
        optimized: { duration: optimizedDuration, success: optimizedSuccess },
        improvement: Math.round(improvement * 100) / 100
    };
}
