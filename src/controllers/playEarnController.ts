/**
 * Play & Earn Controller
 *
 * Returns configuration data for the Play & Earn page sections.
 * Currently serves shopping methods; can be extended for other sections.
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

/**
 * GET /api/play-earn/shopping-methods
 * Returns the Earn While Shopping section cards
 *
 * These are admin-configurable shopping entry points.
 * Currently returns static config; can later be stored in a DB collection.
 */
export const getShoppingMethods = asyncHandler(async (req: Request, res: Response) => {
  // In the future, fetch from a PlayEarnConfig collection
  // For now, return static config that matches the frontend design
  const shoppingMethods = [
    {
      id: 'online-shopping',
      icon: 'bag',
      title: 'Shop Online via Nuqta',
      description: 'Amazon, Flipkart, Myntra & more',
      reward: 'Up to 8% Cashback',
      extraReward: '+ Branded Coins',
      path: '/cash-store',
      enabled: true,
      order: 1,
    },
    {
      id: 'offline-payment',
      icon: 'storefront',
      title: 'Pay at Partner Stores',
      description: 'Instant Nuqta Coins on every purchase',
      reward: 'Always Better Price',
      extraReward: '+ First visit bonus',
      path: '/pay-in-store',
      enabled: true,
      order: 2,
    },
    {
      id: 'lock-price',
      icon: 'lock-closed',
      title: 'Lock Price Deals',
      description: 'Lock with 10%, earn on both actions',
      reward: 'Double Earnings',
      extraReward: '+ Pickup bonus',
      path: '/lock-deals',
      enabled: true,
      order: 3,
    },
  ];

  // Filter enabled and sort by order
  const activeMethods = shoppingMethods
    .filter(m => m.enabled)
    .sort((a, b) => a.order - b.order);

  sendSuccess(res, {
    shoppingMethods: activeMethods,
    valueBanner: {
      text: 'Pay via Nuqta = Always Better Price',
      icon: 'locate',
      enabled: true,
    },
  }, 'Shopping methods retrieved');
});
