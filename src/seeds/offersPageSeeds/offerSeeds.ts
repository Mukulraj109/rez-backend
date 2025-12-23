/**
 * Offer Seeds - All types of offers
 * Lightning deals, Nearby, Trending, BOGO, Sale, Free Delivery, Exclusive Zone
 */

import mongoose from 'mongoose';
import { storeIds, getStoreInfo } from './storeSeeds';

// Helper functions
const futureDate = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);
const pastDate = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const getPlaceholderImage = (category: string, id: number) =>
  `https://picsum.photos/seed/${category}${id}/400/300`;

// Common offer structure
interface OfferSeed {
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  category: string;
  type: string;
  cashbackPercentage: number;
  originalPrice?: number;
  discountedPrice?: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  store: any;
  validity: {
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  };
  engagement: {
    likesCount: number;
    sharesCount: number;
    viewsCount: number;
  };
  restrictions: {
    minOrderValue?: number;
    maxDiscountAmount?: number;
    userTypeRestriction?: string;
  };
  metadata: {
    isNew?: boolean;
    isTrending?: boolean;
    isBestSeller?: boolean;
    priority: number;
    tags: string[];
    featured?: boolean;
    flashSale?: {
      isActive: boolean;
      endTime?: Date;
      originalPrice?: number;
      salePrice?: number;
    };
  };
  isFollowerExclusive: boolean;
  visibleTo: string;
  saleTag?: string;
  salePrice?: number;
  bogoType?: string;
  bogoDetails?: string;
  isFreeDelivery: boolean;
  deliveryFee?: number;
  deliveryTime?: string;
  exclusiveZone?: string;
  eligibilityRequirement?: string;
  redemptionCount: number;
  createdBy: mongoose.Types.ObjectId;
}

// Generate a random createdBy user ID
const adminUserId = new mongoose.Types.ObjectId();

export const offerSeeds: Partial<OfferSeed>[] = [
  // =====================
  // LIGHTNING DEALS
  // =====================
  {
    title: 'Flash Pizza Deal',
    subtitle: 'Large Pizza + 2 Sides',
    description: 'Limited time offer on our best-selling pizza combo',
    image: getPlaceholderImage('pizza', 1),
    category: 'food',
    type: 'discount',
    cashbackPercentage: 15,
    originalPrice: 599,
    discountedPrice: 399,
    location: { type: 'Point', coordinates: [77.6101, 12.9352] },
    store: getStoreInfo(storeIds.dominos),
    validity: { startDate: new Date(), endDate: futureDate(4), isActive: true },
    engagement: { likesCount: 234, sharesCount: 45, viewsCount: 1250 },
    restrictions: { minOrderValue: 300 },
    metadata: {
      isNew: true,
      isTrending: true,
      priority: 100,
      tags: ['pizza', 'flash-sale', 'combo'],
      featured: true,
      flashSale: { isActive: true, endTime: futureDate(4), originalPrice: 599, salePrice: 399 },
    },
    isFollowerExclusive: false,
    visibleTo: 'all',
    isFreeDelivery: true,
    deliveryTime: '30 min',
    redemptionCount: 567,
    createdBy: adminUserId,
  },
  {
    title: 'Burger Bonanza',
    subtitle: 'Buy 2 Whoppers at Rs. 199',
    description: 'Flash sale on Burger King Whoppers',
    image: getPlaceholderImage('burger', 2),
    category: 'food',
    type: 'discount',
    cashbackPercentage: 20,
    originalPrice: 398,
    discountedPrice: 199,
    location: { type: 'Point', coordinates: [77.6411, 12.9719] },
    store: getStoreInfo(storeIds.burgerKing),
    validity: { startDate: new Date(), endDate: futureDate(2), isActive: true },
    engagement: { likesCount: 456, sharesCount: 89, viewsCount: 2100 },
    restrictions: { minOrderValue: 199 },
    metadata: {
      isTrending: true,
      priority: 95,
      tags: ['burger', 'flash-sale'],
      flashSale: { isActive: true, endTime: futureDate(2), originalPrice: 398, salePrice: 199 },
    },
    isFollowerExclusive: false,
    visibleTo: 'all',
    isFreeDelivery: false,
    deliveryFee: 25,
    deliveryTime: '25 min',
    redemptionCount: 890,
    createdBy: adminUserId,
  },

  // =====================
  // TRENDING OFFERS
  // =====================
  {
    title: 'Viral Chicken Wings',
    subtitle: '12pc Buffalo Wings at 50% Off',
    description: 'Our most popular item with record redemptions',
    image: getPlaceholderImage('wings', 3),
    category: 'food',
    type: 'cashback',
    cashbackPercentage: 18,
    originalPrice: 449,
    discountedPrice: 225,
    location: { type: 'Point', coordinates: [77.5833, 12.9716] },
    store: getStoreInfo(storeIds.kfc),
    validity: { startDate: pastDate(7), endDate: futureDate(14), isActive: true },
    engagement: { likesCount: 1234, sharesCount: 234, viewsCount: 8900 },
    restrictions: {},
    metadata: {
      isTrending: true,
      isBestSeller: true,
      priority: 98,
      tags: ['chicken', 'trending', 'viral'],
      featured: true,
    },
    isFollowerExclusive: false,
    visibleTo: 'all',
    isFreeDelivery: true,
    deliveryTime: '35 min',
    redemptionCount: 2345,
    createdBy: adminUserId,
  },
  {
    title: 'Starbucks Reserve',
    subtitle: 'Premium Coffee Experience',
    description: 'Trending premium coffee at special prices',
    image: getPlaceholderImage('coffee', 4),
    category: 'food',
    type: 'cashback',
    cashbackPercentage: 25,
    location: { type: 'Point', coordinates: [77.6411, 12.9719] },
    store: getStoreInfo(storeIds.starbucks),
    validity: { startDate: pastDate(3), endDate: futureDate(21), isActive: true },
    engagement: { likesCount: 890, sharesCount: 156, viewsCount: 5600 },
    restrictions: { minOrderValue: 300 },
    metadata: {
      isTrending: true,
      priority: 92,
      tags: ['coffee', 'premium', 'trending'],
    },
    isFollowerExclusive: false,
    visibleTo: 'all',
    isFreeDelivery: false,
    deliveryFee: 0,
    redemptionCount: 1567,
    createdBy: adminUserId,
  },

  // =====================
  // BOGO OFFERS
  // =====================
  {
    title: 'Buy 1 Get 1 Pizza',
    subtitle: 'Any Medium Pizza',
    description: 'Order any medium pizza and get another free',
    image: getPlaceholderImage('bogo-pizza', 5),
    category: 'food',
    type: 'combo',
    cashbackPercentage: 10,
    originalPrice: 499,
    location: { type: 'Point', coordinates: [77.6411, 12.9719] },
    store: getStoreInfo(storeIds.pizzaHut),
    validity: { startDate: new Date(), endDate: futureDate(48), isActive: true },
    engagement: { likesCount: 567, sharesCount: 123, viewsCount: 3400 },
    restrictions: {},
    metadata: {
      priority: 90,
      tags: ['bogo', 'pizza', 'deal'],
    },
    isFollowerExclusive: false,
    visibleTo: 'all',
    bogoType: 'buy1get1',
    bogoDetails: 'Get any medium pizza free with purchase of another',
    isFreeDelivery: true,
    deliveryTime: '40 min',
    redemptionCount: 789,
    createdBy: adminUserId,
  },
  {
    title: 'Buy 2 Get 1 Subway',
    subtitle: 'Any 6-inch Sub',
    description: 'Buy 2 subs, get the 3rd one absolutely free',
    image: getPlaceholderImage('bogo-sub', 6),
    category: 'food',
    type: 'combo',
    cashbackPercentage: 12,
    originalPrice: 599,
    location: { type: 'Point', coordinates: [77.6245, 12.9352] },
    store: getStoreInfo(storeIds.subway),
    validity: { startDate: new Date(), endDate: futureDate(72), isActive: true },
    engagement: { likesCount: 345, sharesCount: 67, viewsCount: 2100 },
    restrictions: {},
    metadata: {
      priority: 85,
      tags: ['bogo', 'subway', 'sandwich'],
    },
    isFollowerExclusive: false,
    visibleTo: 'all',
    bogoType: 'buy2get1',
    bogoDetails: 'Third 6-inch sub free when you buy 2',
    isFreeDelivery: false,
    deliveryFee: 30,
    deliveryTime: '25 min',
    redemptionCount: 456,
    createdBy: adminUserId,
  },

  // =====================
  // SALE/CLEARANCE
  // =====================
  {
    title: 'Clearance Coffee',
    subtitle: 'All drinks at 60% off',
    description: 'End of season clearance on select beverages',
    image: getPlaceholderImage('sale-coffee', 7),
    category: 'food',
    type: 'discount',
    cashbackPercentage: 10,
    originalPrice: 350,
    salePrice: 140,
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    store: getStoreInfo(storeIds.ccd),
    validity: { startDate: new Date(), endDate: futureDate(24), isActive: true },
    engagement: { likesCount: 234, sharesCount: 45, viewsCount: 1500 },
    restrictions: {},
    metadata: {
      priority: 88,
      tags: ['clearance', 'sale', 'coffee'],
    },
    isFollowerExclusive: false,
    visibleTo: 'all',
    saleTag: 'clearance',
    isFreeDelivery: false,
    redemptionCount: 234,
    createdBy: adminUserId,
  },
  {
    title: 'Last Pieces - Combo Meal',
    subtitle: 'Only 50 left!',
    description: 'Grab before it\'s gone',
    image: getPlaceholderImage('sale-meal', 8),
    category: 'food',
    type: 'discount',
    cashbackPercentage: 15,
    originalPrice: 399,
    salePrice: 199,
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    store: getStoreInfo(storeIds.mcdonalds),
    validity: { startDate: new Date(), endDate: futureDate(12), isActive: true },
    engagement: { likesCount: 456, sharesCount: 78, viewsCount: 2300 },
    restrictions: {},
    metadata: {
      priority: 92,
      tags: ['last-pieces', 'sale', 'limited'],
    },
    isFollowerExclusive: false,
    visibleTo: 'all',
    saleTag: 'last_pieces',
    isFreeDelivery: true,
    deliveryTime: '20 min',
    redemptionCount: 345,
    createdBy: adminUserId,
  },

  // =====================
  // FREE DELIVERY
  // =====================
  {
    title: 'Free Delivery Special',
    subtitle: 'No minimum order',
    description: 'Enjoy free delivery on all orders today',
    image: getPlaceholderImage('free-delivery', 9),
    category: 'food',
    type: 'cashback',
    cashbackPercentage: 10,
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    store: getStoreInfo(storeIds.swiggy),
    validity: { startDate: new Date(), endDate: futureDate(24), isActive: true },
    engagement: { likesCount: 678, sharesCount: 123, viewsCount: 4500 },
    restrictions: {},
    metadata: {
      priority: 95,
      tags: ['free-delivery', 'special'],
      featured: true,
    },
    isFollowerExclusive: false,
    visibleTo: 'all',
    isFreeDelivery: true,
    deliveryFee: 0,
    deliveryTime: '30-40 min',
    redemptionCount: 1234,
    createdBy: adminUserId,
  },

  // =====================
  // EXCLUSIVE ZONE OFFERS
  // =====================
  {
    title: 'Office Lunch Deal',
    subtitle: 'Corporate Special',
    description: 'Exclusive lunch combos for corporate employees',
    image: getPlaceholderImage('corporate', 10),
    category: 'food',
    type: 'cashback',
    cashbackPercentage: 25,
    originalPrice: 299,
    discountedPrice: 199,
    location: { type: 'Point', coordinates: [77.6411, 12.9719] },
    store: getStoreInfo(storeIds.swiggy),
    validity: { startDate: new Date(), endDate: futureDate(30), isActive: true },
    engagement: { likesCount: 234, sharesCount: 34, viewsCount: 1200 },
    restrictions: { userTypeRestriction: 'premium' },
    metadata: {
      priority: 80,
      tags: ['corporate', 'lunch', 'exclusive'],
    },
    isFollowerExclusive: false,
    visibleTo: 'premium',
    exclusiveZone: 'corporate',
    eligibilityRequirement: 'Valid corporate email required',
    isFreeDelivery: true,
    deliveryTime: '25 min',
    redemptionCount: 156,
    createdBy: adminUserId,
  },
  {
    title: 'Birthday Treat',
    subtitle: 'Free dessert on your birthday month',
    description: 'Celebrate with a free dessert',
    image: getPlaceholderImage('birthday', 11),
    category: 'food',
    type: 'special',
    cashbackPercentage: 30,
    location: { type: 'Point', coordinates: [77.6245, 12.9352] },
    store: getStoreInfo(storeIds.dominos),
    validity: { startDate: new Date(), endDate: futureDate(60), isActive: true },
    engagement: { likesCount: 567, sharesCount: 89, viewsCount: 2300 },
    restrictions: {},
    metadata: {
      priority: 85,
      tags: ['birthday', 'exclusive', 'treat'],
    },
    isFollowerExclusive: false,
    visibleTo: 'all',
    exclusiveZone: 'birthday',
    eligibilityRequirement: 'Valid during your birthday month',
    isFreeDelivery: true,
    redemptionCount: 234,
    createdBy: adminUserId,
  },
  {
    title: 'Women\'s Day Special',
    subtitle: '40% off on wellness',
    description: 'Exclusive offers for women',
    image: getPlaceholderImage('women', 12),
    category: 'fashion',
    type: 'discount',
    cashbackPercentage: 20,
    location: { type: 'Point', coordinates: [77.6411, 12.9719] },
    store: getStoreInfo(storeIds.nykaa),
    validity: { startDate: new Date(), endDate: futureDate(45), isActive: true },
    engagement: { likesCount: 890, sharesCount: 156, viewsCount: 4500 },
    restrictions: {},
    metadata: {
      priority: 88,
      tags: ['women', 'wellness', 'exclusive'],
    },
    isFollowerExclusive: false,
    visibleTo: 'all',
    exclusiveZone: 'women',
    isFreeDelivery: true,
    redemptionCount: 678,
    createdBy: adminUserId,
  },
  {
    title: 'Student Tech Deals',
    subtitle: 'Up to 30% off on electronics',
    description: 'Special pricing for students',
    image: getPlaceholderImage('student', 13),
    category: 'electronics',
    type: 'discount',
    cashbackPercentage: 15,
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    store: getStoreInfo(storeIds.croma),
    validity: { startDate: new Date(), endDate: futureDate(30), isActive: true },
    engagement: { likesCount: 345, sharesCount: 67, viewsCount: 1800 },
    restrictions: { userTypeRestriction: 'student' },
    metadata: {
      priority: 82,
      tags: ['student', 'tech', 'electronics'],
    },
    isFollowerExclusive: false,
    visibleTo: 'all',
    exclusiveZone: 'student',
    eligibilityRequirement: 'Valid student ID required',
    isFreeDelivery: true,
    redemptionCount: 234,
    createdBy: adminUserId,
  },
];

export default offerSeeds;
