import { Request, Response } from 'express';
import { priveMissionService } from '../services/priveMissionService';
import priveAccessService from '../services/priveAccessService';
import { PriveMission } from '../models/PriveMission';
import { UserMission } from '../models/UserMission';
import mongoose from 'mongoose';

/**
 * GET /api/prive/missions
 * List available missions for user's tier
 */
export const getMissions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const accessCheck = await priveAccessService.checkAccess(userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ success: false, error: 'Privé access required' });
    }
    const tier = accessCheck.effectiveTier || 'none';

    const missions = await priveMissionService.getAvailableMissions(userId, tier);

    res.json({
      success: true,
      data: { missions },
    });
  } catch (error: any) {
    console.error('[PRIVE] Error fetching missions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch missions' });
  }
};

/**
 * GET /api/prive/missions/active
 * Get user's active/claimed missions
 */
export const getActiveMissions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const accessCheck = await priveAccessService.checkAccess(userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ success: false, error: 'Privé access required' });
    }

    const missions = await priveMissionService.getActiveMissions(userId);

    res.json({
      success: true,
      data: { missions },
    });
  } catch (error: any) {
    console.error('[PRIVE] Error fetching active missions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch active missions' });
  }
};

/**
 * POST /api/prive/missions/:id/claim
 * Claim a mission
 */
export const claimMission = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const accessCheck = await priveAccessService.checkAccess(userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ success: false, error: 'Privé access required' });
    }

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid mission ID' });
    }

    const userMission = await priveMissionService.claimMission(userId, id);

    res.json({
      success: true,
      data: { userMission },
    });
  } catch (error: any) {
    console.error('[PRIVE] Error claiming mission:', error);
    const status = error.message?.includes('already claimed') ? 409 :
                   error.message?.includes('full') ? 409 :
                   error.message?.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message || 'Failed to claim mission' });
  }
};

/**
 * POST /api/prive/missions/:id/complete
 * Complete a mission and claim reward
 */
export const completeMission = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const accessCheck = await priveAccessService.checkAccess(userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ success: false, error: 'Privé access required' });
    }

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid mission ID' });
    }

    const result = await priveMissionService.completeMission(userId, id);

    res.json({
      success: true,
      data: { reward: result },
    });
  } catch (error: any) {
    console.error('[PRIVE] Error completing mission:', error);
    const status = error.message?.includes('not found') || error.message?.includes('not completed') ? 400 :
                   error.message?.includes('already') ? 409 : 500;
    res.status(status).json({ success: false, error: error.message || 'Failed to complete mission' });
  }
};

/**
 * GET /api/prive/missions/completed
 * Get completed missions
 */
export const getCompletedMissions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const accessCheck = await priveAccessService.checkAccess(userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ success: false, error: 'Privé access required' });
    }

    const missions = await priveMissionService.getCompletedMissions(userId);

    res.json({
      success: true,
      data: { missions },
    });
  } catch (error: any) {
    console.error('[PRIVE] Error fetching completed missions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch completed missions' });
  }
};
