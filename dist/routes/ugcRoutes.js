"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const videoController_1 = require("../controllers/videoController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
/**
 * UGC (User Generated Content) Routes
 *
 * These routes provide access to user-generated content (photos and videos).
 * Currently aliased to video controller as UGC content is stored in videos collection.
 */
// Get UGC content for a store
router.get('/store/:storeId', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    // Accept both ObjectId format and string IDs (for mock data compatibility)
    storeId: validation_2.Joi.string().trim().min(1).required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    type: validation_2.Joi.string().valid('photo', 'video').optional(),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    offset: validation_2.Joi.number().integer().min(0).default(0)
})), videoController_1.getVideosByStore);
exports.default = router;
