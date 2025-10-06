"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetSettings = exports.updateAppPreferences = exports.updatePaymentPreferences = exports.updateDeliveryPreferences = exports.updateSecuritySettings = exports.updatePrivacySettings = exports.updateNotificationPreferences = exports.updateGeneralSettings = exports.getUserSettings = void 0;
const UserSettings_1 = require("../models/UserSettings");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const errorHandler_1 = require("../middleware/errorHandler");
// Get user settings
exports.getUserSettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    let settings = await UserSettings_1.UserSettings.findOne({ user: req.user._id })
        .populate('delivery.defaultAddressId')
        .populate('payment.defaultPaymentMethodId');
    // If settings don't exist, create default settings
    if (!settings) {
        settings = await UserSettings_1.UserSettings.create({ user: req.user._id });
    }
    (0, response_1.sendSuccess)(res, settings, 'Settings retrieved successfully');
});
// Update general settings
exports.updateGeneralSettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'general': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'General settings updated successfully');
});
// Update notification preferences
exports.updateNotificationPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'notifications': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'Notification preferences updated successfully');
});
// Update privacy settings
exports.updatePrivacySettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'privacy': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'Privacy settings updated successfully');
});
// Update security settings
exports.updateSecuritySettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'security': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'Security settings updated successfully');
});
// Update delivery preferences
exports.updateDeliveryPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'delivery': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'Delivery preferences updated successfully');
});
// Update payment preferences
exports.updatePaymentPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'payment': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'Payment preferences updated successfully');
});
// Update app preferences
exports.updateAppPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const settings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: req.user._id }, { $set: { 'preferences': req.body } }, { new: true, upsert: true });
    (0, response_1.sendSuccess)(res, settings, 'App preferences updated successfully');
});
// Reset settings to default
exports.resetSettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    // Delete existing settings and create new default ones
    await UserSettings_1.UserSettings.findOneAndDelete({ user: req.user._id });
    const settings = await UserSettings_1.UserSettings.create({ user: req.user._id });
    (0, response_1.sendSuccess)(res, settings, 'Settings reset to default successfully');
});
