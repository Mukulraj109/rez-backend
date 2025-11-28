"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const homepageController_1 = require("../controllers/homepageController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/homepage
 * @desc    Get all homepage data in a single batch request
 * @access  Public (optionalAuth - works with or without authentication)
 * @query   {string} sections - Comma-separated list of sections (optional, default: all)
 *          Example: "featuredProducts,newArrivals,categories"
 * @query   {number} limit - Limit for each section (optional, uses defaults per section)
 * @query   {string} location - User location as "lat,lng" (optional)
 *          Example: "28.7041,77.1025"
 *
 * @example
 * GET /api/homepage
 * GET /api/homepage?sections=featuredProducts,categories&limit=5
 * GET /api/homepage?location=28.7041,77.1025
 */
router.get('/', auth_1.optionalAuth, // Works with or without auth token
(0, validation_2.validateQuery)(validation_1.Joi.object({
    sections: validation_1.Joi.string().optional(),
    limit: validation_1.Joi.number().integer().min(1).max(50).optional(),
    location: validation_1.Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/).optional()
})), homepageController_1.getHomepage);
/**
 * @route   GET /api/homepage/sections
 * @desc    Get list of available sections for homepage
 * @access  Public
 *
 * @example
 * GET /api/homepage/sections
 */
router.get('/sections', homepageController_1.getAvailableSections);
exports.default = router;
