import { Request, Response } from 'express';
import { StoreVisit, VisitType, VisitStatus, IStoreVisit } from '../models/StoreVisit';
import { Store } from '../models/Store';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import pushNotificationService from '../services/pushNotificationService';

// Schedule a store visit
export const scheduleStoreVisit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const {
    storeId,
    visitDate,
    visitTime,
    customerName,
    customerPhone,
    customerEmail,
    estimatedDuration
  } = req.body;

  // Validate required fields
  if (!storeId || !visitDate || !visitTime || !customerName || !customerPhone) {
    return sendBadRequest(res, 'Store ID, visit date, visit time, customer name, and phone are required');
  }

  console.log('📅 [STORE VISIT] Scheduling visit:', {
    storeId,
    visitDate,
    visitTime,
    userId
  });

  // Check if store exists
  const store = await Store.findById(storeId);
  if (!store) {
    return sendNotFound(res, 'Store not found');
  }

  // Validate store type (optional - if you have store type field)
  // if (store.type !== 'RETAIL') {
  //   return sendBadRequest(res, 'This feature is only available for retail stores');
  // }

  // Create scheduled visit
  const visit = await StoreVisit.create({
    storeId,
    userId,
    visitType: VisitType.SCHEDULED,
    visitDate: new Date(visitDate),
    visitTime,
    customerName,
    customerPhone,
    customerEmail,
    status: VisitStatus.PENDING,
    estimatedDuration: estimatedDuration || 30
  });

  const populatedVisit = await StoreVisit.findById(visit._id)
    .populate('storeId', 'name location contact images')
    .populate('userId', 'name phoneNumber email');

  console.log('✅ [STORE VISIT] Visit scheduled successfully:', {
    visitNumber: visit.visitNumber,
    visitId: visit._id
  });

  // Send SMS notification
  try {
    const storeAddress = store.location?.city
      ? `${store.location.address}, ${store.location.city}`
      : store.location?.address;

    await pushNotificationService.sendVisitScheduled(
      store.name,
      visit.visitNumber,
      visit.visitDate,
      visitTime,
      customerPhone,
      storeAddress
    );
    console.log('📱 [SMS] Visit scheduled notification sent');
  } catch (smsError) {
    console.error('❌ [SMS] Failed to send visit notification:', smsError);
    // Don't fail the request if SMS fails
  }

  sendSuccess(res, populatedVisit, 'Visit scheduled successfully', 201);
});

// Get queue number for walk-in
export const getQueueNumber = asyncHandler(async (req: Request, res: Response) => {
  const {
    storeId,
    customerName,
    customerPhone,
    customerEmail
  } = req.body;

  // Validate required fields
  if (!storeId || !customerName || !customerPhone) {
    return sendBadRequest(res, 'Store ID, customer name, and phone are required');
  }

  console.log('🎫 [QUEUE] Generating queue number:', {
    storeId,
    customerPhone
  });

  // Check if store exists
  const store = await Store.findById(storeId);
  if (!store) {
    return sendNotFound(res, 'Store not found');
  }

  // Get next queue number
  const queueNumber = await StoreVisit.getNextQueueNumber(storeId);

  // Create queue visit
  const visit = await StoreVisit.create({
    storeId,
    userId: req.userId || undefined,
    visitType: VisitType.QUEUE,
    visitDate: new Date(),
    queueNumber,
    customerName,
    customerPhone,
    customerEmail,
    status: VisitStatus.PENDING,
    estimatedDuration: 30
  });

  const populatedVisit = await StoreVisit.findById(visit._id)
    .populate('storeId', 'name location contact images')
    .populate('userId', 'name phoneNumber email');

  console.log('✅ [QUEUE] Queue number generated:', {
    queueNumber,
    visitNumber: visit.visitNumber
  });

  // Send SMS notification
  try {
    // Get current queue status for estimated wait time
    const currentQueueSize = await StoreVisit.countDocuments({
      storeId,
      visitType: VisitType.QUEUE,
      status: { $in: [VisitStatus.PENDING, VisitStatus.CHECKED_IN] },
      visitDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    const estimatedWaitTime = currentQueueSize > 0
      ? `${currentQueueSize * 15} minutes`
      : 'Less than 15 minutes';

    await pushNotificationService.sendQueueNumberAssigned(
      store.name,
      queueNumber,
      visit.visitNumber,
      customerPhone,
      estimatedWaitTime,
      currentQueueSize
    );
    console.log('📱 [SMS] Queue number notification sent');
  } catch (smsError) {
    console.error('❌ [SMS] Failed to send queue notification:', smsError);
    // Don't fail the request if SMS fails
  }

  sendSuccess(res, populatedVisit, 'Queue number generated successfully', 201);
});

// Get user's store visits
export const getUserStoreVisits = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  console.log('📋 [STORE VISIT] Fetching user visits:', { userId });

  const visits = await StoreVisit.findUserVisits(userId);

  console.log('✅ [STORE VISIT] Found visits:', { count: visits.length });

  sendSuccess(res, visits, 'Visits retrieved successfully');
});

// Get visit by ID
export const getStoreVisit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const { visitId } = req.params;

  console.log('🔍 [STORE VISIT] Fetching visit:', { visitId, userId });

  const visit = await StoreVisit.findById(visitId)
    .populate('storeId', 'name location contact images')
    .populate('userId', 'name phoneNumber email');

  if (!visit) {
    return sendNotFound(res, 'Visit not found');
  }

  // Check if user owns this visit
  if (visit.userId && visit.userId.toString() !== userId) {
    return sendError(res, 'Unauthorized access', 403);
  }

  console.log('✅ [STORE VISIT] Visit found:', {
    visitNumber: visit.visitNumber,
    status: visit.status
  });

  sendSuccess(res, visit, 'Visit retrieved successfully');
});

// Get store's visits (for store owners)
export const getStoreVisits = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const { storeId } = req.params;
  const { date } = req.query;

  console.log('🏪 [STORE VISIT] Fetching store visits:', {
    storeId,
    date,
    userId
  });

  // Check if store exists
  const store = await Store.findById(storeId);
  if (!store) {
    return sendNotFound(res, 'Store not found');
  }

  // Optional: Add authorization check if store has owner field
  // if (store.owner && store.owner.toString() !== userId) {
  //   return sendError(res, 'Unauthorized access', 403);
  // }

  const visitDate = date ? new Date(date as string) : undefined;
  const visits = await StoreVisit.findStoreVisits(storeId, visitDate);

  console.log('✅ [STORE VISIT] Found store visits:', { count: visits.length });

  sendSuccess(res, visits, 'Store visits retrieved successfully');
});

// Cancel store visit
export const cancelStoreVisit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const { visitId } = req.params;

  console.log('❌ [STORE VISIT] Cancelling visit:', { visitId, userId });

  const visit = await StoreVisit.findById(visitId);

  if (!visit) {
    return sendNotFound(res, 'Visit not found');
  }

  // Check if user owns this visit
  if (visit.userId && visit.userId.toString() !== userId) {
    return sendError(res, 'Unauthorized access', 403);
  }

  // Check if visit can be cancelled
  if (visit.status === VisitStatus.COMPLETED) {
    return sendBadRequest(res, 'Cannot cancel a completed visit');
  }

  if (visit.status === VisitStatus.CANCELLED) {
    return sendBadRequest(res, 'Visit is already cancelled');
  }

  // Update status to cancelled
  await visit.updateStatus(VisitStatus.CANCELLED);

  console.log('✅ [STORE VISIT] Visit cancelled:', {
    visitNumber: visit.visitNumber
  });

  sendSuccess(res, visit, 'Visit cancelled successfully');
});

// Get current queue status (public endpoint)
export const getCurrentQueueStatus = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  console.log('📊 [QUEUE STATUS] Fetching queue status:', { storeId });

  // Check if store exists
  const store = await Store.findById(storeId);
  if (!store) {
    return sendNotFound(res, 'Store not found');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's queue visits
  const queueVisits = await StoreVisit.find({
    storeId,
    visitType: VisitType.QUEUE,
    visitDate: { $gte: today, $lt: tomorrow }
  }).sort({ queueNumber: 1 });

  // Calculate statistics
  const totalInQueue = queueVisits.filter(v => v.status === VisitStatus.PENDING).length;
  const currentlyServing = queueVisits.filter(v => v.status === VisitStatus.CHECKED_IN).length;
  const completed = queueVisits.filter(v => v.status === VisitStatus.COMPLETED).length;

  const lastServedVisit = queueVisits.find(v => v.status === VisitStatus.CHECKED_IN);
  const lastServedNumber = lastServedVisit?.queueNumber;

  // Estimate wait time (rough calculation: 30 mins per person)
  const estimatedWaitTime = totalInQueue * 30;

  const queueStatus = {
    storeId,
    storeName: store.name,
    totalInQueue,
    currentlyServing,
    completed,
    lastServedNumber,
    estimatedWaitTime: `${estimatedWaitTime} minutes`,
    queueList: queueVisits.map(v => ({
      queueNumber: v.queueNumber,
      status: v.status,
      visitNumber: v.visitNumber,
      customerName: v.customerName
    }))
  };

  console.log('✅ [QUEUE STATUS] Queue status retrieved:', {
    totalInQueue,
    currentlyServing
  });

  sendSuccess(res, queueStatus, 'Queue status retrieved successfully');
});

// Check store availability / crowd status (public endpoint)
export const checkStoreAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  console.log('🏪 [AVAILABILITY] Checking store availability:', { storeId });

  // Check if store exists
  const store = await Store.findById(storeId);
  if (!store) {
    return sendNotFound(res, 'Store not found');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's visits
  const todayVisits = await StoreVisit.find({
    storeId,
    visitDate: { $gte: today, $lt: tomorrow },
    status: { $in: [VisitStatus.PENDING, VisitStatus.CHECKED_IN] }
  });

  const currentCrowd = todayVisits.length;

  // Mock crowd status based on count (can be enhanced with real-time data)
  let crowdStatus: 'Low' | 'Medium' | 'High';
  if (currentCrowd < 5) {
    crowdStatus = 'Low';
  } else if (currentCrowd < 15) {
    crowdStatus = 'Medium';
  } else {
    crowdStatus = 'High';
  }

  const availability = {
    storeId,
    storeName: store.name,
    crowdStatus,
    currentVisitors: currentCrowd,
    isOpen: true, // Can be enhanced with business hours check
    nextAvailableSlot: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins from now
    recommendedAction: crowdStatus === 'Low'
      ? 'Walk-in recommended'
      : crowdStatus === 'Medium'
        ? 'Moderate wait expected'
        : 'Schedule visit recommended'
  };

  console.log('✅ [AVAILABILITY] Availability checked:', {
    crowdStatus,
    currentVisitors: currentCrowd
  });

  sendSuccess(res, availability, 'Store availability retrieved successfully');
});
