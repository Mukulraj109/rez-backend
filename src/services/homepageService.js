"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomepageData = getHomepageData;
var Product_1 = require("../models/Product");
var Store_1 = require("../models/Store");
var Event_1 = require("../models/Event");
var Offer_1 = require("../models/Offer");
var Category_1 = require("../models/Category");
var Video_1 = require("../models/Video");
var Article_1 = require("../models/Article");
/**
 * Homepage Service
 * Aggregates data from multiple sources for the homepage
 * Uses parallel execution for optimal performance
 */
// Default limits for each section
var DEFAULT_LIMITS = {
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
 * Fetch featured products
 */
function fetchFeaturedProducts(limit) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, products, duration, error_1, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Product_1.Product.find({
                            isActive: true,
                            isFeatured: true,
                            'inventory.isAvailable': true
                        })
                            .populate('category', 'name slug')
                            .populate('store', 'name slug logo')
                            .select('name slug images pricing inventory ratings badges tags analytics')
                            .sort({ 'analytics.views': -1, 'ratings.average': -1 })
                            .limit(limit)
                            .lean()];
                case 2:
                    products = _a.sent();
                    duration = Date.now() - startTime;
                    console.log("\u2705 [Homepage Service] Fetched ".concat(products.length, " featured products in ").concat(duration, "ms"));
                    return [2 /*return*/, products];
                case 3:
                    error_1 = _a.sent();
                    duration = Date.now() - startTime;
                    console.error("\u274C [Homepage Service] Failed to fetch featured products in ".concat(duration, "ms:"), error_1);
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch new arrival products
 */
function fetchNewArrivals(limit) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, thirtyDaysAgo, products, duration, error_2, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return [4 /*yield*/, Product_1.Product.find({
                            isActive: true,
                            'inventory.isAvailable': true,
                            createdAt: { $gte: thirtyDaysAgo }
                        })
                            .populate('category', 'name slug')
                            .populate('store', 'name slug logo')
                            .select('name slug images pricing inventory ratings badges tags createdAt')
                            .sort({ createdAt: -1 })
                            .limit(limit)
                            .lean()];
                case 2:
                    products = _a.sent();
                    duration = Date.now() - startTime;
                    console.log("\u2705 [Homepage Service] Fetched ".concat(products.length, " new arrivals in ").concat(duration, "ms"));
                    return [2 /*return*/, products];
                case 3:
                    error_2 = _a.sent();
                    duration = Date.now() - startTime;
                    console.error("\u274C [Homepage Service] Failed to fetch new arrivals in ".concat(duration, "ms:"), error_2);
                    throw error_2;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch featured stores
 */
function fetchFeaturedStores(limit) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, stores, duration, error_3, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Store_1.Store.find({
                            isActive: true,
                            isFeatured: true
                        })
                            .populate('category', 'name slug')
                            .select('name slug logo images ratings location deliveryCategories tags operationalInfo offers')
                            .sort({ 'ratings.average': -1 })
                            .limit(limit)
                            .lean()];
                case 2:
                    stores = _a.sent();
                    duration = Date.now() - startTime;
                    console.log("\u2705 [Homepage Service] Fetched ".concat(stores.length, " featured stores in ").concat(duration, "ms"));
                    return [2 /*return*/, stores];
                case 3:
                    error_3 = _a.sent();
                    duration = Date.now() - startTime;
                    console.error("\u274C [Homepage Service] Failed to fetch featured stores in ".concat(duration, "ms:"), error_3);
                    throw error_3;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch trending stores
 */
function fetchTrendingStores(limit) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, stores, duration, error_4, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Store_1.Store.find({
                            isActive: true
                        })
                            .populate('category', 'name slug')
                            .select('name slug logo images ratings location tags operationalInfo offers analytics')
                            .sort({ 'analytics.totalOrders': -1, 'ratings.average': -1 })
                            .limit(limit)
                            .lean()];
                case 2:
                    stores = _a.sent();
                    duration = Date.now() - startTime;
                    console.log("\u2705 [Homepage Service] Fetched ".concat(stores.length, " trending stores in ").concat(duration, "ms"));
                    return [2 /*return*/, stores];
                case 3:
                    error_4 = _a.sent();
                    duration = Date.now() - startTime;
                    console.error("\u274C [Homepage Service] Failed to fetch trending stores in ".concat(duration, "ms:"), error_4);
                    throw error_4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch upcoming events
 */
function fetchUpcomingEvents(limit) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, now, events, duration, error_5, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    now = new Date();
                    return [4 /*yield*/, Event_1.default.find({
                            isActive: true,
                            'dateTime.start': { $gte: now },
                            status: 'upcoming'
                        })
                            .select('title slug category images price location dateTime organizer tags analytics')
                            .sort({ 'dateTime.start': 1 })
                            .limit(limit)
                            .lean()];
                case 2:
                    events = _a.sent();
                    duration = Date.now() - startTime;
                    console.log("\u2705 [Homepage Service] Fetched ".concat(events.length, " upcoming events in ").concat(duration, "ms"));
                    return [2 /*return*/, events];
                case 3:
                    error_5 = _a.sent();
                    duration = Date.now() - startTime;
                    console.error("\u274C [Homepage Service] Failed to fetch upcoming events in ".concat(duration, "ms:"), error_5);
                    throw error_5;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch mega offers
 */
function fetchMegaOffers(limit) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, now, offers, duration, error_6, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    now = new Date();
                    return [4 /*yield*/, Offer_1.default.find({
                            category: 'mega',
                            'validity.isActive': true,
                            'validity.startDate': { $lte: now },
                            'validity.endDate': { $gte: now }
                        })
                            .select('title subtitle image category type cashbackPercentage originalPrice discountedPrice store validity engagement')
                            .sort({ 'engagement.viewsCount': -1 })
                            .limit(limit)
                            .lean()];
                case 2:
                    offers = _a.sent();
                    duration = Date.now() - startTime;
                    console.log("\u2705 [Homepage Service] Fetched ".concat(offers.length, " mega offers in ").concat(duration, "ms"));
                    return [2 /*return*/, offers];
                case 3:
                    error_6 = _a.sent();
                    duration = Date.now() - startTime;
                    console.error("\u274C [Homepage Service] Failed to fetch mega offers in ".concat(duration, "ms:"), error_6);
                    throw error_6;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch student offers
 */
function fetchStudentOffers(limit) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, now, offers, duration, error_7, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    now = new Date();
                    return [4 /*yield*/, Offer_1.default.find({
                            category: 'student',
                            'validity.isActive': true,
                            'validity.startDate': { $lte: now },
                            'validity.endDate': { $gte: now }
                        })
                            .select('title subtitle image category type cashbackPercentage originalPrice discountedPrice store validity engagement')
                            .sort({ 'engagement.viewsCount': -1 })
                            .limit(limit)
                            .lean()];
                case 2:
                    offers = _a.sent();
                    duration = Date.now() - startTime;
                    console.log("\u2705 [Homepage Service] Fetched ".concat(offers.length, " student offers in ").concat(duration, "ms"));
                    return [2 /*return*/, offers];
                case 3:
                    error_7 = _a.sent();
                    duration = Date.now() - startTime;
                    console.error("\u274C [Homepage Service] Failed to fetch student offers in ".concat(duration, "ms:"), error_7);
                    throw error_7;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch all categories
 */
function fetchCategories(limit) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, categories, duration, error_8, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Category_1.Category.find({ isActive: true })
                            .select('name slug icon image description productCount')
                            .sort({ productCount: -1, name: 1 })
                            .limit(limit)
                            .lean()];
                case 2:
                    categories = _a.sent();
                    duration = Date.now() - startTime;
                    console.log("\u2705 [Homepage Service] Fetched ".concat(categories.length, " categories in ").concat(duration, "ms"));
                    return [2 /*return*/, categories];
                case 3:
                    error_8 = _a.sent();
                    duration = Date.now() - startTime;
                    console.error("\u274C [Homepage Service] Failed to fetch categories in ".concat(duration, "ms:"), error_8);
                    throw error_8;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch trending videos
 */
function fetchTrendingVideos(limit) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, videos, duration, error_9, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Video_1.Video.find({
                            isActive: true,
                            type: { $in: ['merchant', 'ugc'] }
                        })
                            .populate('creator', 'name avatar')
                            .select('title thumbnail url duration views likes category tags createdAt')
                            .sort({ views: -1, likes: -1 })
                            .limit(limit)
                            .lean()];
                case 2:
                    videos = _a.sent();
                    duration = Date.now() - startTime;
                    console.log("\u2705 [Homepage Service] Fetched ".concat(videos.length, " trending videos in ").concat(duration, "ms"));
                    return [2 /*return*/, videos];
                case 3:
                    error_9 = _a.sent();
                    duration = Date.now() - startTime;
                    console.error("\u274C [Homepage Service] Failed to fetch trending videos in ".concat(duration, "ms:"), error_9);
                    throw error_9;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch latest articles
 */
function fetchLatestArticles(limit) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, articles, duration, error_10, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Article_1.Article.find({
                            isActive: true,
                            status: 'published'
                        })
                            .populate('author', 'name avatar')
                            .select('title slug thumbnail excerpt category tags readTime views publishedAt')
                            .sort({ publishedAt: -1 })
                            .limit(limit)
                            .lean()];
                case 2:
                    articles = _a.sent();
                    duration = Date.now() - startTime;
                    console.log("\u2705 [Homepage Service] Fetched ".concat(articles.length, " latest articles in ").concat(duration, "ms"));
                    return [2 /*return*/, articles];
                case 3:
                    error_10 = _a.sent();
                    duration = Date.now() - startTime;
                    console.error("\u274C [Homepage Service] Failed to fetch latest articles in ".concat(duration, "ms:"), error_10);
                    throw error_10;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Main function to fetch all homepage data
 * Executes all queries in parallel for optimal performance
 */
function getHomepageData(params) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, requestedSections, promises, errors, results, data, duration, successfulSections, failedSections;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    console.log('🏠 [Homepage Service] Starting homepage data fetch...');
                    requestedSections = params.sections || [
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
                    promises = {};
                    errors = {};
                    // Add each requested section to promises
                    if (requestedSections.includes('featuredProducts')) {
                        promises.featuredProducts = fetchFeaturedProducts(params.limit || DEFAULT_LIMITS.featuredProducts)
                            .catch(function (err) {
                            errors.featuredProducts = err.message;
                            return [];
                        });
                    }
                    if (requestedSections.includes('newArrivals')) {
                        promises.newArrivals = fetchNewArrivals(params.limit || DEFAULT_LIMITS.newArrivals)
                            .catch(function (err) {
                            errors.newArrivals = err.message;
                            return [];
                        });
                    }
                    if (requestedSections.includes('featuredStores')) {
                        promises.featuredStores = fetchFeaturedStores(params.limit || DEFAULT_LIMITS.featuredStores)
                            .catch(function (err) {
                            errors.featuredStores = err.message;
                            return [];
                        });
                    }
                    if (requestedSections.includes('trendingStores')) {
                        promises.trendingStores = fetchTrendingStores(params.limit || DEFAULT_LIMITS.trendingStores)
                            .catch(function (err) {
                            errors.trendingStores = err.message;
                            return [];
                        });
                    }
                    if (requestedSections.includes('upcomingEvents')) {
                        promises.upcomingEvents = fetchUpcomingEvents(params.limit || DEFAULT_LIMITS.upcomingEvents)
                            .catch(function (err) {
                            errors.upcomingEvents = err.message;
                            return [];
                        });
                    }
                    if (requestedSections.includes('megaOffers')) {
                        promises.megaOffers = fetchMegaOffers(params.limit || DEFAULT_LIMITS.megaOffers)
                            .catch(function (err) {
                            errors.megaOffers = err.message;
                            return [];
                        });
                    }
                    if (requestedSections.includes('studentOffers')) {
                        promises.studentOffers = fetchStudentOffers(params.limit || DEFAULT_LIMITS.studentOffers)
                            .catch(function (err) {
                            errors.studentOffers = err.message;
                            return [];
                        });
                    }
                    if (requestedSections.includes('categories')) {
                        promises.categories = fetchCategories(params.limit || DEFAULT_LIMITS.categories)
                            .catch(function (err) {
                            errors.categories = err.message;
                            return [];
                        });
                    }
                    if (requestedSections.includes('trendingVideos')) {
                        promises.trendingVideos = fetchTrendingVideos(params.limit || DEFAULT_LIMITS.trendingVideos)
                            .catch(function (err) {
                            errors.trendingVideos = err.message;
                            return [];
                        });
                    }
                    if (requestedSections.includes('latestArticles')) {
                        promises.latestArticles = fetchLatestArticles(params.limit || DEFAULT_LIMITS.latestArticles)
                            .catch(function (err) {
                            errors.latestArticles = err.message;
                            return [];
                        });
                    }
                    // Execute all queries in parallel
                    console.log("\uD83D\uDD04 [Homepage Service] Executing ".concat(Object.keys(promises).length, " queries in parallel..."));
                    return [4 /*yield*/, Promise.all(Object.values(promises))];
                case 1:
                    results = _a.sent();
                    data = Object.keys(promises).reduce(function (acc, key, index) {
                        acc[key] = results[index];
                        return acc;
                    }, {});
                    duration = Date.now() - startTime;
                    successfulSections = Object.keys(data).filter(function (key) { return !errors[key]; });
                    failedSections = Object.keys(errors);
                    console.log("\u2705 [Homepage Service] Homepage data fetched in ".concat(duration, "ms"));
                    console.log("   \u2705 Successful sections: ".concat(successfulSections.length));
                    console.log("   \u274C Failed sections: ".concat(failedSections.length));
                    return [2 /*return*/, {
                            success: true,
                            data: data,
                            errors: Object.keys(errors).length > 0 ? errors : undefined,
                            metadata: {
                                timestamp: new Date(),
                                requestedSections: requestedSections,
                                successfulSections: successfulSections,
                                failedSections: failedSections
                            }
                        }];
            }
        });
    });
}
