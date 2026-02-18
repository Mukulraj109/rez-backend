import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Program from '../../models/Program';
import Sponsor from '../../models/Sponsor';
import socialImpactService from '../../services/socialImpactService';
import { sendSuccess, sendNotFound, sendBadRequest, sendInternalError } from '../../utils/response';

/**
 * Verify that the event belongs to the authenticated merchant.
 */
async function verifyEventOwnership(eventId: string, merchantId: string) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) return null;
  return Program.findOne({
    _id: eventId,
    type: 'social_impact',
    merchant: merchantId
  });
}

// GET / — List merchant's social impact events
export const getMerchantEvents = async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const { eventStatus, eventType, sponsorId, city, page, limit } = req.query;

    const query: any = {
      type: 'social_impact',
      merchant: merchantId,
      status: { $in: ['active', 'upcoming', 'pending_approval', 'rejected'] }
    };
    if (eventStatus) query.eventStatus = eventStatus;
    if (eventType) query.eventType = eventType;
    if (sponsorId) query.sponsor = sponsorId;
    if (city) query['location.city'] = { $regex: city, $options: 'i' };

    const pg = {
      page: Math.max(1, parseInt(page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string) || 20))
    };

    const total = await Program.countDocuments(query);
    const events = await Program.find(query)
      .select('-participants')
      .populate('sponsor', 'name logo brandCoinName brandCoinLogo')
      .sort({ eventDate: 1 })
      .skip((pg.page - 1) * pg.limit)
      .limit(pg.limit);

    return sendSuccess(res, {
      events,
      pagination: { page: pg.page, limit: pg.limit, total, totalPages: Math.ceil(total / pg.limit) }
    });
  } catch (error: any) {
    return sendInternalError(res, error.message);
  }
};

// POST / — Create event for this merchant (requires admin approval)
export const createMerchantEvent = async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    // Merchant-created events start as pending_approval — admin must approve before they go live
    const event = await socialImpactService.createEvent({
      ...req.body,
      merchant: merchantId,
      status: 'pending_approval'
    });
    return sendSuccess(res, event, 'Event created and sent for admin approval', 201);
  } catch (error: any) {
    return sendBadRequest(res, error.message);
  }
};

// GET /:id — Get single event
export const getMerchantEventById = async (req: Request, res: Response) => {
  try {
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    await event.populate('sponsor', 'name logo brandCoinName brandCoinLogo description website');
    return sendSuccess(res, event);
  } catch (error: any) {
    return sendInternalError(res, error.message);
  }
};

// PUT /:id — Update event
export const updateMerchantEvent = async (req: Request, res: Response) => {
  try {
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const { merchant, status, ...updateData } = req.body;
    // Merchants cannot change status directly (admin approval required)
    const updated = await socialImpactService.updateEvent(req.params.id, updateData);
    return sendSuccess(res, updated, 'Event updated successfully');
  } catch (error: any) {
    return sendBadRequest(res, error.message);
  }
};

// GET /:id/participants — List participants
export const getMerchantEventParticipants = async (req: Request, res: Response) => {
  try {
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const participants = await socialImpactService.getEventParticipants(req.params.id, req.query.status as string);
    return sendSuccess(res, participants);
  } catch (error: any) {
    return sendInternalError(res, error.message);
  }
};

// POST /:id/check-in — Check in participant
export const checkInParticipant = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return sendBadRequest(res, 'userId is required');
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const enrollment = await socialImpactService.checkInUser(userId, req.params.id, req.merchantId!);
    return sendSuccess(res, enrollment, 'User checked in successfully');
  } catch (error: any) {
    return sendBadRequest(res, error.message);
  }
};

// POST /:id/complete — Complete participation
export const completeParticipant = async (req: Request, res: Response) => {
  try {
    const { userId, impactValue } = req.body;
    if (!userId) return sendBadRequest(res, 'userId is required');
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const enrollment = await socialImpactService.completeParticipation(userId, req.params.id, req.merchantId!, impactValue);
    return sendSuccess(res, enrollment, 'Participation completed and coins awarded');
  } catch (error: any) {
    return sendBadRequest(res, error.message);
  }
};

// POST /:id/bulk-complete — Bulk complete
export const bulkCompleteParticipants = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return sendBadRequest(res, 'userIds array is required');
    }
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const result = await socialImpactService.bulkComplete(req.params.id, userIds, req.merchantId!);
    return sendSuccess(res, result, `Completed ${result.success} participants, ${result.failed} failed`);
  } catch (error: any) {
    return sendBadRequest(res, error.message);
  }
};

// POST /:id/generate-qr — Generate QR for participant
export const generateQRCheckIn = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return sendBadRequest(res, 'userId is required');
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const result = await socialImpactService.generateCheckInQR(req.params.id, userId);
    return sendSuccess(res, result, 'QR check-in token generated');
  } catch (error: any) {
    return sendBadRequest(res, error.message);
  }
};

// POST /:id/verify-qr — Verify scanned QR
export const verifyQRCheckIn = async (req: Request, res: Response) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return sendBadRequest(res, 'qrToken is required');
    const enrollment = await socialImpactService.verifyQRCheckIn(qrToken, req.merchantId!);
    // Verify the enrollment's event belongs to this merchant
    const event = await verifyEventOwnership(enrollment.program.toString(), req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    return sendSuccess(res, enrollment, 'User checked in via QR');
  } catch (error: any) {
    return sendBadRequest(res, error.message);
  }
};

// POST /:id/generate-otp — Generate OTP for participant
export const generateOTPCheckIn = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return sendBadRequest(res, 'userId is required');
    const event = await verifyEventOwnership(req.params.id, req.merchantId!);
    if (!event) return sendNotFound(res, 'Event not found or access denied');
    const result = await socialImpactService.generateEventOTP(req.params.id, userId);
    return sendSuccess(res, result, 'OTP generated for check-in');
  } catch (error: any) {
    return sendBadRequest(res, error.message);
  }
};

// ======== SPONSORS (read-only for merchants) ========

// GET /sponsors — List active sponsors
export const getSponsors = async (req: Request, res: Response) => {
  try {
    const { page, limit, search } = req.query;
    const query: any = { isActive: true };
    if (search) query.name = { $regex: search, $options: 'i' };

    const pg = {
      page: Math.max(1, parseInt(page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string) || 50))
    };

    const total = await Sponsor.countDocuments(query);
    const sponsors = await Sponsor.find(query)
      .select('name slug logo brandCoinName brandCoinLogo industry isActive')
      .sort({ name: 1 })
      .skip((pg.page - 1) * pg.limit)
      .limit(pg.limit);

    return sendSuccess(res, {
      sponsors,
      pagination: { page: pg.page, limit: pg.limit, total, totalPages: Math.ceil(total / pg.limit) }
    });
  } catch (error: any) {
    return sendInternalError(res, error.message);
  }
};

// GET /sponsors/:id — Get single sponsor
export const getSponsorById = async (req: Request, res: Response) => {
  try {
    const sponsor = await Sponsor.findById(req.params.id)
      .select('name slug logo description brandCoinName brandCoinLogo contactPerson website industry isActive');
    if (!sponsor) return sendNotFound(res, 'Sponsor not found');
    return sendSuccess(res, sponsor);
  } catch (error: any) {
    return sendInternalError(res, error.message);
  }
};
