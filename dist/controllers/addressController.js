"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefaultAddress = exports.deleteAddress = exports.updateAddress = exports.createAddress = exports.getAddressById = exports.getUserAddresses = void 0;
const Address_1 = require("../models/Address");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const errorHandler_1 = require("../middleware/errorHandler");
// Get all addresses for user
exports.getUserAddresses = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const addresses = await Address_1.Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    (0, response_1.sendSuccess)(res, addresses, 'Addresses retrieved successfully');
});
// Get single address by ID
exports.getAddressById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    const address = await Address_1.Address.findOne({ _id: id, user: req.user._id });
    if (!address) {
        return (0, response_1.sendNotFound)(res, 'Address not found');
    }
    (0, response_1.sendSuccess)(res, address, 'Address retrieved successfully');
});
// Create new address
exports.createAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const addressData = {
        ...req.body,
        user: req.user._id
    };
    const address = await Address_1.Address.create(addressData);
    (0, response_1.sendSuccess)(res, address, 'Address created successfully', 201);
});
// Update address
exports.updateAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    // Find address and ensure it belongs to the user
    const address = await Address_1.Address.findOne({ _id: id, user: req.user._id });
    if (!address) {
        return (0, response_1.sendNotFound)(res, 'Address not found');
    }
    // Update address fields
    Object.assign(address, req.body);
    await address.save();
    (0, response_1.sendSuccess)(res, address, 'Address updated successfully');
});
// Delete address
exports.deleteAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    const address = await Address_1.Address.findOneAndDelete({ _id: id, user: req.user._id });
    if (!address) {
        return (0, response_1.sendNotFound)(res, 'Address not found');
    }
    (0, response_1.sendSuccess)(res, { deletedId: id }, 'Address deleted successfully');
});
// Set default address
exports.setDefaultAddress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    // Find address and ensure it belongs to the user
    const address = await Address_1.Address.findOne({ _id: id, user: req.user._id });
    if (!address) {
        return (0, response_1.sendNotFound)(res, 'Address not found');
    }
    // Update all addresses to non-default
    await Address_1.Address.updateMany({ user: req.user._id }, { $set: { isDefault: false } });
    // Set this address as default
    address.isDefault = true;
    await address.save();
    (0, response_1.sendSuccess)(res, address, 'Default address updated successfully');
});
