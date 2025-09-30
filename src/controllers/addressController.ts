import { Request, Response } from 'express';
import { Address, IAddress } from '../models/Address';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNotFound } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

// Get all addresses for user
export const getUserAddresses = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });

  sendSuccess(res, addresses, 'Addresses retrieved successfully');
});

// Get single address by ID
export const getAddressById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  const address = await Address.findOne({ _id: id, user: req.user._id });

  if (!address) {
    return sendNotFound(res, 'Address not found');
  }

  sendSuccess(res, address, 'Address retrieved successfully');
});

// Create new address
export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const addressData = {
    ...req.body,
    user: req.user._id
  };

  const address = await Address.create(addressData);

  sendSuccess(res, address, 'Address created successfully', 201);
});

// Update address
export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  // Find address and ensure it belongs to the user
  const address = await Address.findOne({ _id: id, user: req.user._id });

  if (!address) {
    return sendNotFound(res, 'Address not found');
  }

  // Update address fields
  Object.assign(address, req.body);
  await address.save();

  sendSuccess(res, address, 'Address updated successfully');
});

// Delete address
export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  const address = await Address.findOneAndDelete({ _id: id, user: req.user._id });

  if (!address) {
    return sendNotFound(res, 'Address not found');
  }

  sendSuccess(res, { deletedId: id }, 'Address deleted successfully');
});

// Set default address
export const setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  // Find address and ensure it belongs to the user
  const address = await Address.findOne({ _id: id, user: req.user._id });

  if (!address) {
    return sendNotFound(res, 'Address not found');
  }

  // Update all addresses to non-default
  await Address.updateMany(
    { user: req.user._id },
    { $set: { isDefault: false } }
  );

  // Set this address as default
  address.isDefault = true;
  await address.save();

  sendSuccess(res, address, 'Default address updated successfully');
});