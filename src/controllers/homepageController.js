"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.getAvailableSections = exports.getHomepage = void 0;
var homepageService_1 = require("../services/homepageService");
var asyncHandler_1 = require("../utils/asyncHandler");
var response_1 = require("../utils/response");
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
exports.getHomepage = (0, asyncHandler_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var startTime, _a, sections, limit, location_1, userId, requestedSections, locationCoords, _b, lat, lng, limitNumber, result, duration, error_1, duration;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                startTime = Date.now();
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                _a = req.query, sections = _a.sections, limit = _a.limit, location_1 = _a.location;
                userId = req.userId;
                requestedSections = void 0;
                if (sections && typeof sections === 'string') {
                    requestedSections = sections.split(',').map(function (s) { return s.trim(); });
                }
                locationCoords = void 0;
                if (location_1 && typeof location_1 === 'string') {
                    _b = location_1.split(',').map(Number), lat = _b[0], lng = _b[1];
                    if (!isNaN(lat) && !isNaN(lng)) {
                        locationCoords = { lat: lat, lng: lng };
                    }
                }
                limitNumber = limit ? parseInt(limit, 10) : undefined;
                console.log('🏠 [Homepage Controller] Request params:', {
                    userId: userId || 'anonymous',
                    sections: (requestedSections === null || requestedSections === void 0 ? void 0 : requestedSections.join(', ')) || 'all',
                    limit: limitNumber || 'default',
                    location: locationCoords ? "".concat(locationCoords.lat, ",").concat(locationCoords.lng) : 'none'
                });
                return [4 /*yield*/, (0, homepageService_1.getHomepageData)({
                        userId: userId,
                        sections: requestedSections,
                        limit: limitNumber,
                        location: locationCoords
                    })];
            case 2:
                result = _c.sent();
                duration = Date.now() - startTime;
                // Set cache headers (5 minutes)
                res.set({
                    'Cache-Control': 'public, max-age=300',
                    'X-Response-Time': "".concat(duration, "ms")
                });
                console.log("\u2705 [Homepage Controller] Response sent in ".concat(duration, "ms"));
                console.log("   Sections returned: ".concat(Object.keys(result.data).length));
                console.log("   Total items: ".concat(Object.values(result.data).reduce(function (sum, arr) { return sum + (Array.isArray(arr) ? arr.length : 0); }, 0)));
                // Send response
                (0, response_1.sendSuccess)(res, __assign(__assign({}, result.data), { _metadata: result.metadata, _errors: result.errors }), 'Homepage data retrieved successfully');
                return [3 /*break*/, 4];
            case 3:
                error_1 = _c.sent();
                duration = Date.now() - startTime;
                console.error("\u274C [Homepage Controller] Error after ".concat(duration, "ms:"), error_1);
                (0, response_1.sendInternalError)(res, 'Failed to fetch homepage data');
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * @route   GET /api/homepage/sections
 * @desc    Get available sections for homepage
 * @access  Public
 */
exports.getAvailableSections = (0, asyncHandler_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sections;
    return __generator(this, function (_a) {
        sections = [
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
        (0, response_1.sendSuccess)(res, { sections: sections }, 'Available homepage sections');
        return [2 /*return*/];
    });
}); });
