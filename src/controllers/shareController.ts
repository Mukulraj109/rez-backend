import { Request, Response } from 'express';
import shareService from '../services/shareService';

class ShareController {
  // GET /api/share/content
  async getShareableContent(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const content = await shareService.getShareableContent(userId);

      res.json({
        success: true,
        data: content
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/share/track
  async createShare(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { contentType, contentId, platform } = req.body;

      if (!contentType || !contentId || !platform) {
        return res.status(400).json({
          success: false,
          message: 'contentType, contentId, and platform are required'
        });
      }

      const share = await shareService.createShare(userId, contentType, contentId, platform);

      res.json({
        success: true,
        data: {
          shareUrl: share.shareUrl,
          trackingCode: share.trackingCode,
          expiresAt: share.expiresAt
        },
        message: 'Share link created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/share/click/:trackingCode (public endpoint)
  async trackClick(req: Request, res: Response) {
    try {
      const { trackingCode } = req.params;

      const result = await shareService.trackClick(trackingCode);

      if (!result.success) {
        return res.redirect(result.redirectUrl);
      }

      res.redirect(result.redirectUrl);
    } catch (error: any) {
      res.redirect('/');
    }
  }

  // POST /api/share/conversion (internal webhook)
  async trackConversion(req: Request, res: Response) {
    try {
      const { trackingCode } = req.body;

      if (!trackingCode) {
        return res.status(400).json({
          success: false,
          message: 'trackingCode is required'
        });
      }

      await shareService.trackConversion(trackingCode);

      res.json({
        success: true,
        message: 'Conversion tracked'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/share/history
  async getShareHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { contentType, limit = 20, offset = 0 } = req.query;

      const result = await shareService.getShareHistory(
        userId,
        contentType as string | undefined,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: result.shares,
        pagination: {
          total: result.total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/share/stats
  async getShareStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const stats = await shareService.getShareStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/share/daily-limits
  async getDailyLimits(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const limits = await shareService.getDailySharesRemaining(userId);

      res.json({
        success: true,
        data: limits
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new ShareController();
