import { Request, Response } from 'express';
import sponsorService from '../services/sponsorService';

class SponsorController {
  // GET /api/sponsors
  async getSponsors(req: Request, res: Response) {
    try {
      const { page, limit, isActive, industry, search } = req.query;

      const filters = {
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        industry: industry as string | undefined,
        search: search as string | undefined
      };

      const pagination = {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20
      };

      const result = await sponsorService.getSponsors(filters, pagination);

      res.json({
        success: true,
        data: result.sponsors,
        pagination: {
          page: result.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/sponsors
  async createSponsor(req: Request, res: Response) {
    try {
      const {
        name,
        logo,
        description,
        brandCoinName,
        brandCoinLogo,
        contactPerson,
        website,
        industry
      } = req.body;

      if (!name || !logo || !brandCoinName || !contactPerson?.name || !contactPerson?.email) {
        return res.status(400).json({
          success: false,
          message: 'name, logo, brandCoinName, and contactPerson (name, email) are required'
        });
      }

      const sponsor = await sponsorService.createSponsor({
        name,
        logo,
        description,
        brandCoinName,
        brandCoinLogo,
        contactPerson,
        website,
        industry
      });

      res.status(201).json({
        success: true,
        data: sponsor,
        message: 'Sponsor created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/sponsors/:id
  async getSponsorById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const sponsor = await sponsorService.getSponsorById(id);

      if (!sponsor) {
        return res.status(404).json({
          success: false,
          message: 'Sponsor not found'
        });
      }

      res.json({
        success: true,
        data: sponsor
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // PUT /api/sponsors/:id
  async updateSponsor(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const sponsor = await sponsorService.updateSponsor(id, updateData);

      if (!sponsor) {
        return res.status(404).json({
          success: false,
          message: 'Sponsor not found'
        });
      }

      res.json({
        success: true,
        data: sponsor,
        message: 'Sponsor updated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // DELETE /api/sponsors/:id (soft delete)
  async deactivateSponsor(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const sponsor = await sponsorService.deactivateSponsor(id);

      if (!sponsor) {
        return res.status(404).json({
          success: false,
          message: 'Sponsor not found'
        });
      }

      res.json({
        success: true,
        message: 'Sponsor deactivated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/sponsors/:id/activate
  async activateSponsor(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const sponsor = await sponsorService.activateSponsor(id);

      if (!sponsor) {
        return res.status(404).json({
          success: false,
          message: 'Sponsor not found'
        });
      }

      res.json({
        success: true,
        message: 'Sponsor activated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/sponsors/:id/events
  async getSponsorEvents(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const events = await sponsorService.getSponsorEvents(id);

      res.json({
        success: true,
        data: events
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/sponsors/:id/analytics
  async getSponsorAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const analytics = await sponsorService.getSponsorAnalytics(id);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      if (error.message === 'Sponsor not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new SponsorController();
