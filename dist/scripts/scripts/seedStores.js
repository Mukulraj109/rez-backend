"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = __importDefault(require("mongoose"));
var Category_1 = require("../models/Category");
var Store_1 = require("../models/Store");
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
var MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
// Comprehensive stores data with delivery categories
var storesData = [
    // 30 min delivery stores
    {
        name: 'Quick Bites Express',
        slug: 'quick-bites-express',
        description: 'Fast food delivery in 30 minutes or less. Fresh burgers, pizzas, and snacks delivered hot!',
        logo: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200',
        banner: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800',
        location: {
            address: '123 MG Road, Brigade Road',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560001',
            coordinates: [77.5946, 12.9716],
            deliveryRadius: 5
        },
        contact: {
            phone: '+919876543200',
            email: 'orders@quickbites.com',
            website: 'https://quickbites.com'
        },
        ratings: {
            average: 4.2,
            count: 156,
            distribution: { 5: 89, 4: 45, 3: 15, 2: 5, 1: 2 }
        },
        offers: {
            cashback: 5,
            minOrderAmount: 200,
            maxCashback: 50,
            isPartner: true,
            partnerLevel: 'silver'
        },
        operationalInfo: {
            hours: {
                monday: { open: '10:00', close: '23:00', closed: false },
                tuesday: { open: '10:00', close: '23:00', closed: false },
                wednesday: { open: '10:00', close: '23:00', closed: false },
                thursday: { open: '10:00', close: '23:00', closed: false },
                friday: { open: '10:00', close: '24:00', closed: false },
                saturday: { open: '10:00', close: '24:00', closed: false },
                sunday: { open: '11:00', close: '23:00', closed: false }
            },
            deliveryTime: '20-30 mins',
            minimumOrder: 150,
            deliveryFee: 30,
            freeDeliveryAbove: 300,
            acceptsWalletPayment: true,
            paymentMethods: ['cash', 'card', 'upi', 'wallet']
        },
        deliveryCategories: {
            fastDelivery: true,
            budgetFriendly: false,
            premium: false,
            organic: false,
            alliance: false,
            lowestPrice: false,
            mall: false,
            cashStore: false
        },
        analytics: {
            totalOrders: 1250,
            totalRevenue: 187500,
            avgOrderValue: 150,
            repeatCustomers: 340
        },
        tags: ['fast-food', 'burgers', 'pizza', 'quick-delivery'],
        videos: [
            {
                url: 'https://storage.googleapis.com/sample-videos/store-promo-1.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400',
                title: 'Quick Bites Express - Store Tour',
                duration: 45
            },
            {
                url: 'https://storage.googleapis.com/sample-videos/menu-showcase-1.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
                title: 'Our Signature Dishes',
                duration: 30
            }
        ],
        isActive: true,
        isFeatured: true,
        isVerified: true
    },
    {
        name: 'Speedy Pizza Hub',
        slug: 'speedy-pizza-hub',
        description: 'Authentic Italian pizzas delivered in 25 minutes. Fresh ingredients, crispy crust!',
        logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200',
        banner: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800',
        location: {
            address: '456 Koramangala 5th Block',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560095',
            coordinates: [77.6229, 12.9304],
            deliveryRadius: 4
        },
        contact: {
            phone: '+919876543201',
            email: 'orders@speedypizza.com',
            website: 'https://speedypizza.com'
        },
        ratings: {
            average: 4.5,
            count: 234,
            distribution: { 5: 156, 4: 58, 3: 15, 2: 4, 1: 1 }
        },
        offers: {
            cashback: 8,
            minOrderAmount: 300,
            maxCashback: 100,
            isPartner: true,
            partnerLevel: 'gold'
        },
        operationalInfo: {
            hours: {
                monday: { open: '11:00', close: '23:00', closed: false },
                tuesday: { open: '11:00', close: '23:00', closed: false },
                wednesday: { open: '11:00', close: '23:00', closed: false },
                thursday: { open: '11:00', close: '23:00', closed: false },
                friday: { open: '11:00', close: '24:00', closed: false },
                saturday: { open: '11:00', close: '24:00', closed: false },
                sunday: { open: '12:00', close: '23:00', closed: false }
            },
            deliveryTime: '25-30 mins',
            minimumOrder: 250,
            deliveryFee: 25,
            freeDeliveryAbove: 500,
            acceptsWalletPayment: true,
            paymentMethods: ['cash', 'card', 'upi', 'wallet']
        },
        deliveryCategories: {
            fastDelivery: true,
            budgetFriendly: false,
            premium: false,
            organic: false,
            alliance: false,
            lowestPrice: false,
            mall: false,
            cashStore: false
        },
        analytics: {
            totalOrders: 890,
            totalRevenue: 267000,
            avgOrderValue: 300,
            repeatCustomers: 280
        },
        tags: ['pizza', 'italian', 'fast-delivery', 'authentic'],
        videos: [
            {
                url: 'https://storage.googleapis.com/sample-videos/pizza-making-1.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
                title: 'Fresh Pizza Making Process',
                duration: 60
            },
            {
                url: 'https://storage.googleapis.com/sample-videos/store-ambience-1.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400',
                title: 'Store Ambience & Kitchen',
                duration: 40
            }
        ],
        isActive: true,
        isFeatured: true,
        isVerified: true
    },
    // 1 rupee store
    {
        name: 'Budget Mart',
        slug: 'budget-mart',
        description: 'Everything for just 1 rupee! Daily essentials, snacks, and household items at unbeatable prices.',
        logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
        banner: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
        location: {
            address: '789 Commercial Street',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560008',
            coordinates: [77.6109, 12.9716],
            deliveryRadius: 8
        },
        contact: {
            phone: '+919876543202',
            email: 'info@budgetmart.com',
            website: 'https://budgetmart.com'
        },
        ratings: {
            average: 4.0,
            count: 89,
            distribution: { 5: 45, 4: 25, 3: 12, 2: 5, 1: 2 }
        },
        offers: {
            cashback: 2,
            minOrderAmount: 50,
            maxCashback: 20,
            isPartner: false,
            partnerLevel: 'bronze'
        },
        operationalInfo: {
            hours: {
                monday: { open: '08:00', close: '22:00', closed: false },
                tuesday: { open: '08:00', close: '22:00', closed: false },
                wednesday: { open: '08:00', close: '22:00', closed: false },
                thursday: { open: '08:00', close: '22:00', closed: false },
                friday: { open: '08:00', close: '22:00', closed: false },
                saturday: { open: '08:00', close: '22:00', closed: false },
                sunday: { open: '09:00', close: '21:00', closed: false }
            },
            deliveryTime: '45-60 mins',
            minimumOrder: 50,
            deliveryFee: 20,
            freeDeliveryAbove: 200,
            acceptsWalletPayment: true,
            paymentMethods: ['cash', 'upi', 'wallet']
        },
        deliveryCategories: {
            fastDelivery: false,
            budgetFriendly: true,
            premium: false,
            organic: false,
            alliance: false,
            lowestPrice: false,
            mall: false,
            cashStore: false
        },
        analytics: {
            totalOrders: 2100,
            totalRevenue: 105000,
            avgOrderValue: 50,
            repeatCustomers: 890
        },
        tags: ['budget', 'essentials', '1-rupee', 'household'],
        isActive: true,
        isFeatured: false,
        isVerified: true
    },
    {
        name: 'Penny Store',
        slug: 'penny-store',
        description: 'Ultra-budget store with items starting from 1 rupee. Perfect for students and budget-conscious families.',
        logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
        banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
        location: {
            address: '321 BTM Layout 2nd Stage',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560076',
            coordinates: [77.6109, 12.9166],
            deliveryRadius: 6
        },
        contact: {
            phone: '+919876543203',
            email: 'orders@pennystore.com',
            website: 'https://pennystore.com'
        },
        ratings: {
            average: 3.8,
            count: 67,
            distribution: { 5: 30, 4: 20, 3: 12, 2: 4, 1: 1 }
        },
        offers: {
            cashback: 1,
            minOrderAmount: 30,
            maxCashback: 10,
            isPartner: false,
            partnerLevel: 'bronze'
        },
        operationalInfo: {
            hours: {
                monday: { open: '09:00', close: '21:00', closed: false },
                tuesday: { open: '09:00', close: '21:00', closed: false },
                wednesday: { open: '09:00', close: '21:00', closed: false },
                thursday: { open: '09:00', close: '21:00', closed: false },
                friday: { open: '09:00', close: '21:00', closed: false },
                saturday: { open: '09:00', close: '21:00', closed: false },
                sunday: { open: '10:00', close: '20:00', closed: false }
            },
            deliveryTime: '50-65 mins',
            minimumOrder: 30,
            deliveryFee: 15,
            freeDeliveryAbove: 150,
            acceptsWalletPayment: true,
            paymentMethods: ['cash', 'upi', 'wallet']
        },
        deliveryCategories: {
            fastDelivery: false,
            budgetFriendly: true,
            premium: false,
            organic: false,
            alliance: false,
            lowestPrice: false,
            mall: false,
            cashStore: false
        },
        analytics: {
            totalOrders: 1800,
            totalRevenue: 54000,
            avgOrderValue: 30,
            repeatCustomers: 650
        },
        tags: ['ultra-budget', 'students', '1-rupee', 'affordable'],
        isActive: true,
        isFeatured: false,
        isVerified: true
    },
    // 99 Rupees store
    {
        name: '99 Store',
        slug: '99-store',
        description: 'Quality products at just 99 rupees! Electronics, accessories, and lifestyle products.',
        logo: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200',
        banner: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800',
        location: {
            address: '654 Indiranagar 100ft Road',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560038',
            coordinates: [77.6408, 12.9716],
            deliveryRadius: 7
        },
        contact: {
            phone: '+919876543204',
            email: 'support@99store.com',
            website: 'https://99store.com'
        },
        ratings: {
            average: 4.1,
            count: 123,
            distribution: { 5: 68, 4: 35, 3: 15, 2: 4, 1: 1 }
        },
        offers: {
            cashback: 3,
            minOrderAmount: 99,
            maxCashback: 30,
            isPartner: true,
            partnerLevel: 'silver'
        },
        operationalInfo: {
            hours: {
                monday: { open: '10:00', close: '22:00', closed: false },
                tuesday: { open: '10:00', close: '22:00', closed: false },
                wednesday: { open: '10:00', close: '22:00', closed: false },
                thursday: { open: '10:00', close: '22:00', closed: false },
                friday: { open: '10:00', close: '22:00', closed: false },
                saturday: { open: '10:00', close: '22:00', closed: false },
                sunday: { open: '11:00', close: '21:00', closed: false }
            },
            deliveryTime: '40-55 mins',
            minimumOrder: 99,
            deliveryFee: 25,
            freeDeliveryAbove: 300,
            acceptsWalletPayment: true,
            paymentMethods: ['cash', 'card', 'upi', 'wallet']
        },
        deliveryCategories: {
            fastDelivery: false,
            budgetFriendly: false,
            ninetyNineStore: true,
            premium: false,
            organic: false,
            alliance: false,
            lowestPrice: false,
            mall: false,
            cashStore: false
        },
        analytics: {
            totalOrders: 950,
            totalRevenue: 94050,
            avgOrderValue: 99,
            repeatCustomers: 320
        },
        tags: ['99-rupees', 'electronics', 'accessories', 'lifestyle'],
        isActive: true,
        isFeatured: true,
        isVerified: true
    },
    // Luxury store
    {
        name: 'Elite Boutique',
        slug: 'elite-boutique',
        description: 'Premium fashion and lifestyle products. Luxury brands, designer wear, and exclusive collections.',
        logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
        banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
        location: {
            address: '987 UB City Mall, Vittal Mallya Road',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560001',
            coordinates: [77.5946, 12.9716],
            deliveryRadius: 10
        },
        contact: {
            phone: '+919876543205',
            email: 'concierge@eliteboutique.com',
            website: 'https://eliteboutique.com'
        },
        ratings: {
            average: 4.7,
            count: 45,
            distribution: { 5: 35, 4: 8, 3: 2, 2: 0, 1: 0 }
        },
        offers: {
            cashback: 15,
            minOrderAmount: 5000,
            maxCashback: 2000,
            isPartner: true,
            partnerLevel: 'platinum'
        },
        operationalInfo: {
            hours: {
                monday: { open: '11:00', close: '21:00', closed: false },
                tuesday: { open: '11:00', close: '21:00', closed: false },
                wednesday: { open: '11:00', close: '21:00', closed: false },
                thursday: { open: '11:00', close: '21:00', closed: false },
                friday: { open: '11:00', close: '21:00', closed: false },
                saturday: { open: '11:00', close: '21:00', closed: false },
                sunday: { open: '12:00', close: '20:00', closed: false }
            },
            deliveryTime: '60-90 mins',
            minimumOrder: 5000,
            deliveryFee: 100,
            freeDeliveryAbove: 15000,
            acceptsWalletPayment: true,
            paymentMethods: ['card', 'upi', 'wallet', 'netbanking']
        },
        deliveryCategories: {
            fastDelivery: false,
            budgetFriendly: false,
            premium: true,
            organic: false,
            alliance: false,
            lowestPrice: false,
            mall: false,
            cashStore: false
        },
        analytics: {
            totalOrders: 120,
            totalRevenue: 1800000,
            avgOrderValue: 15000,
            repeatCustomers: 45
        },
        tags: ['luxury', 'premium', 'designer', 'exclusive'],
        isActive: true,
        isFeatured: true,
        isVerified: true
    },
    // Alliance Store
    {
        name: 'Alliance Supermarket',
        slug: 'alliance-supermarket',
        description: 'Your trusted neighborhood supermarket. Fresh groceries, daily essentials, and household items.',
        logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
        banner: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
        location: {
            address: '147 Jayanagar 4th Block',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560011',
            coordinates: [77.5833, 12.9304],
            deliveryRadius: 5
        },
        contact: {
            phone: '+919876543206',
            email: 'orders@alliancesuper.com',
            website: 'https://alliancesuper.com'
        },
        ratings: {
            average: 4.3,
            count: 178,
            distribution: { 5: 98, 4: 55, 3: 20, 2: 4, 1: 1 }
        },
        offers: {
            cashback: 4,
            minOrderAmount: 500,
            maxCashback: 100,
            isPartner: true,
            partnerLevel: 'gold'
        },
        operationalInfo: {
            hours: {
                monday: { open: '07:00', close: '22:00', closed: false },
                tuesday: { open: '07:00', close: '22:00', closed: false },
                wednesday: { open: '07:00', close: '22:00', closed: false },
                thursday: { open: '07:00', close: '22:00', closed: false },
                friday: { open: '07:00', close: '22:00', closed: false },
                saturday: { open: '07:00', close: '22:00', closed: false },
                sunday: { open: '08:00', close: '21:00', closed: false }
            },
            deliveryTime: '35-50 mins',
            minimumOrder: 500,
            deliveryFee: 40,
            freeDeliveryAbove: 1000,
            acceptsWalletPayment: true,
            paymentMethods: ['cash', 'card', 'upi', 'wallet']
        },
        deliveryCategories: {
            fastDelivery: false,
            budgetFriendly: false,
            premium: false,
            organic: false,
            alliance: true,
            lowestPrice: false,
            mall: false,
            cashStore: false
        },
        analytics: {
            totalOrders: 2100,
            totalRevenue: 1050000,
            avgOrderValue: 500,
            repeatCustomers: 890
        },
        tags: ['supermarket', 'groceries', 'fresh', 'daily-essentials'],
        isActive: true,
        isFeatured: true,
        isVerified: true
    },
    // Organic Store
    {
        name: 'Green Earth Organic',
        slug: 'green-earth-organic',
        description: '100% organic and natural products. Fresh vegetables, fruits, grains, and health supplements.',
        logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
        banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
        location: {
            address: '258 Whitefield Main Road',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560066',
            coordinates: [77.7500, 12.9698],
            deliveryRadius: 12
        },
        contact: {
            phone: '+919876543207',
            email: 'orders@greenearth.com',
            website: 'https://greenearth.com'
        },
        ratings: {
            average: 4.6,
            count: 134,
            distribution: { 5: 89, 4: 35, 3: 8, 2: 2, 1: 0 }
        },
        offers: {
            cashback: 6,
            minOrderAmount: 800,
            maxCashback: 150,
            isPartner: true,
            partnerLevel: 'gold'
        },
        operationalInfo: {
            hours: {
                monday: { open: '08:00', close: '20:00', closed: false },
                tuesday: { open: '08:00', close: '20:00', closed: false },
                wednesday: { open: '08:00', close: '20:00', closed: false },
                thursday: { open: '08:00', close: '20:00', closed: false },
                friday: { open: '08:00', close: '20:00', closed: false },
                saturday: { open: '08:00', close: '20:00', closed: false },
                sunday: { open: '09:00', close: '19:00', closed: false }
            },
            deliveryTime: '45-70 mins',
            minimumOrder: 800,
            deliveryFee: 50,
            freeDeliveryAbove: 1500,
            acceptsWalletPayment: true,
            paymentMethods: ['cash', 'card', 'upi', 'wallet']
        },
        deliveryCategories: {
            fastDelivery: false,
            budgetFriendly: false,
            premium: false,
            organic: true,
            alliance: false,
            lowestPrice: false,
            mall: false,
            cashStore: false
        },
        analytics: {
            totalOrders: 680,
            totalRevenue: 544000,
            avgOrderValue: 800,
            repeatCustomers: 280
        },
        tags: ['organic', 'natural', 'healthy', 'fresh-vegetables'],
        isActive: true,
        isFeatured: true,
        isVerified: true
    },
    // Lowest Price
    {
        name: 'Price Crusher',
        slug: 'price-crusher',
        description: 'Guaranteed lowest prices on all products. Price match promise with 10% additional discount!',
        logo: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200',
        banner: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800',
        location: {
            address: '369 Marathahalli Outer Ring Road',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560037',
            coordinates: [77.7000, 12.9581],
            deliveryRadius: 8
        },
        contact: {
            phone: '+919876543208',
            email: 'support@pricecrusher.com',
            website: 'https://pricecrusher.com'
        },
        ratings: {
            average: 4.4,
            count: 201,
            distribution: { 5: 125, 4: 58, 3: 15, 2: 2, 1: 1 }
        },
        offers: {
            cashback: 10,
            minOrderAmount: 300,
            maxCashback: 200,
            isPartner: true,
            partnerLevel: 'platinum'
        },
        operationalInfo: {
            hours: {
                monday: { open: '09:00', close: '21:00', closed: false },
                tuesday: { open: '09:00', close: '21:00', closed: false },
                wednesday: { open: '09:00', close: '21:00', closed: false },
                thursday: { open: '09:00', close: '21:00', closed: false },
                friday: { open: '09:00', close: '21:00', closed: false },
                saturday: { open: '09:00', close: '21:00', closed: false },
                sunday: { open: '10:00', close: '20:00', closed: false }
            },
            deliveryTime: '40-60 mins',
            minimumOrder: 300,
            deliveryFee: 30,
            freeDeliveryAbove: 600,
            acceptsWalletPayment: true,
            paymentMethods: ['cash', 'card', 'upi', 'wallet']
        },
        deliveryCategories: {
            fastDelivery: false,
            budgetFriendly: false,
            premium: false,
            organic: false,
            alliance: false,
            lowestPrice: true,
            mall: false,
            cashStore: false
        },
        analytics: {
            totalOrders: 1450,
            totalRevenue: 435000,
            avgOrderValue: 300,
            repeatCustomers: 520
        },
        tags: ['lowest-price', 'price-match', 'discount', 'value'],
        isActive: true,
        isFeatured: true,
        isVerified: true
    },
    // Rez Mall
    {
        name: 'Rez Mall',
        slug: 'rez-mall',
        description: 'Your one-stop shopping destination. Electronics, fashion, home decor, and everything in between.',
        logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
        banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
        location: {
            address: '741 Phoenix MarketCity, Whitefield',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560066',
            coordinates: [77.7500, 12.9698],
            deliveryRadius: 15
        },
        contact: {
            phone: '+919876543209',
            email: 'info@rezmall.com',
            website: 'https://rezmall.com'
        },
        ratings: {
            average: 4.5,
            count: 312,
            distribution: { 5: 198, 4: 89, 3: 20, 2: 4, 1: 1 }
        },
        offers: {
            cashback: 12,
            minOrderAmount: 1000,
            maxCashback: 500,
            isPartner: true,
            partnerLevel: 'platinum'
        },
        operationalInfo: {
            hours: {
                monday: { open: '10:00', close: '22:00', closed: false },
                tuesday: { open: '10:00', close: '22:00', closed: false },
                wednesday: { open: '10:00', close: '22:00', closed: false },
                thursday: { open: '10:00', close: '22:00', closed: false },
                friday: { open: '10:00', close: '22:00', closed: false },
                saturday: { open: '10:00', close: '22:00', closed: false },
                sunday: { open: '11:00', close: '21:00', closed: false }
            },
            deliveryTime: '60-90 mins',
            minimumOrder: 1000,
            deliveryFee: 80,
            freeDeliveryAbove: 2500,
            acceptsWalletPayment: true,
            paymentMethods: ['cash', 'card', 'upi', 'wallet', 'netbanking']
        },
        deliveryCategories: {
            fastDelivery: false,
            budgetFriendly: false,
            premium: false,
            organic: false,
            alliance: false,
            lowestPrice: false,
            mall: true,
            cashStore: false
        },
        analytics: {
            totalOrders: 890,
            totalRevenue: 1780000,
            avgOrderValue: 2000,
            repeatCustomers: 340
        },
        tags: ['mall', 'electronics', 'fashion', 'home-decor', 'one-stop'],
        isActive: true,
        isFeatured: true,
        isVerified: true
    },
    // Cash Store
    {
        name: 'Cash & Carry Store',
        slug: 'cash-carry-store',
        description: 'Cash-only transactions with exclusive discounts. Bulk purchases, wholesale prices for everyone.',
        logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
        banner: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
        location: {
            address: '852 Electronic City Phase 1',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560100',
            coordinates: [77.6700, 12.8456],
            deliveryRadius: 6
        },
        contact: {
            phone: '+919876543210',
            email: 'orders@cashcarry.com',
            website: 'https://cashcarry.com'
        },
        ratings: {
            average: 4.2,
            count: 156,
            distribution: { 5: 89, 4: 45, 3: 15, 2: 5, 1: 2 }
        },
        offers: {
            cashback: 0, // No cashback for cash transactions
            minOrderAmount: 200,
            maxCashback: 0,
            isPartner: false,
            partnerLevel: 'bronze'
        },
        operationalInfo: {
            hours: {
                monday: { open: '08:00', close: '20:00', closed: false },
                tuesday: { open: '08:00', close: '20:00', closed: false },
                wednesday: { open: '08:00', close: '20:00', closed: false },
                thursday: { open: '08:00', close: '20:00', closed: false },
                friday: { open: '08:00', close: '20:00', closed: false },
                saturday: { open: '08:00', close: '20:00', closed: false },
                sunday: { open: '09:00', close: '19:00', closed: false }
            },
            deliveryTime: '50-75 mins',
            minimumOrder: 200,
            deliveryFee: 35,
            freeDeliveryAbove: 500,
            acceptsWalletPayment: false, // Cash only
            paymentMethods: ['cash']
        },
        deliveryCategories: {
            fastDelivery: false,
            budgetFriendly: false,
            premium: false,
            organic: false,
            alliance: false,
            lowestPrice: false,
            mall: false,
            cashStore: true
        },
        analytics: {
            totalOrders: 1200,
            totalRevenue: 240000,
            avgOrderValue: 200,
            repeatCustomers: 450
        },
        tags: ['cash-only', 'wholesale', 'bulk', 'discount'],
        isActive: true,
        isFeatured: false,
        isVerified: true
    }
];
function seedStores() {
    return __awaiter(this, void 0, void 0, function () {
        var categories_1, createdStores, fastDeliveryStores, budgetStores, premiumStores, organicStores, allianceStores, lowestPriceStores, mallStores, cashStores, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, 6, 8]);
                    console.log('🌱 Starting store seeding...');
                    // Connect to MongoDB
                    return [4 /*yield*/, mongoose_1.default.connect(MONGODB_URI)];
                case 1:
                    // Connect to MongoDB
                    _a.sent();
                    console.log('✅ Connected to MongoDB');
                    // Clear existing stores
                    console.log('🧹 Clearing existing stores...');
                    return [4 /*yield*/, Store_1.Store.deleteMany({})];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, Category_1.Category.find({})];
                case 3:
                    categories_1 = _a.sent();
                    console.log("\uD83D\uDCC2 Found ".concat(categories_1.length, " categories"));
                    console.log('Available categories:', categories_1.map(function (c) { return ({ name: c.name, slug: c.slug }); }));
                    // Assign categories to stores based on their type
                    storesData.forEach(function (store, index) {
                        var _a, _b, _c, _d, _e;
                        var categoryId = null;
                        if (store.deliveryCategories.fastDelivery || store.deliveryCategories.budgetFriendly) {
                            // Fast food and budget stores go to Food & Beverages
                            categoryId = (_a = categories_1.find(function (cat) { return cat.slug === 'food-beverages'; })) === null || _a === void 0 ? void 0 : _a._id;
                        }
                        else if (store.deliveryCategories.premium) {
                            // Premium stores go to Fashion
                            categoryId = (_b = categories_1.find(function (cat) { return cat.slug === 'fashion'; })) === null || _b === void 0 ? void 0 : _b._id;
                        }
                        else if (store.deliveryCategories.alliance || store.deliveryCategories.organic) {
                            // Alliance and organic stores go to Food & Beverages (groceries)
                            categoryId = (_c = categories_1.find(function (cat) { return cat.slug === 'food-beverages'; })) === null || _c === void 0 ? void 0 : _c._id;
                        }
                        else {
                            // Everything else goes to Electronics
                            categoryId = (_d = categories_1.find(function (cat) { return cat.slug === 'electronics'; })) === null || _d === void 0 ? void 0 : _d._id;
                        }
                        if (!categoryId) {
                            console.error("\u274C No category found for store: ".concat(store.name));
                            // Use the first available category as fallback
                            categoryId = (_e = categories_1[0]) === null || _e === void 0 ? void 0 : _e._id;
                        }
                        store.category = categoryId;
                        console.log("\u2705 Assigned category to ".concat(store.name, ": ").concat(categoryId));
                    });
                    // Seed stores
                    console.log('🏪 Seeding stores...');
                    return [4 /*yield*/, Store_1.Store.insertMany(storesData)];
                case 4:
                    createdStores = _a.sent();
                    console.log("\u2705 Created ".concat(createdStores.length, " stores"));
                    // Display summary by category
                    console.log('\n📊 Store Summary by Category:');
                    fastDeliveryStores = createdStores.filter(function (store) { return store.deliveryCategories.fastDelivery; }).length;
                    budgetStores = createdStores.filter(function (store) { return store.deliveryCategories.budgetFriendly; }).length;
                    premiumStores = createdStores.filter(function (store) { return store.deliveryCategories.premium; }).length;
                    organicStores = createdStores.filter(function (store) { return store.deliveryCategories.organic; }).length;
                    allianceStores = createdStores.filter(function (store) { return store.deliveryCategories.alliance; }).length;
                    lowestPriceStores = createdStores.filter(function (store) { return store.deliveryCategories.lowestPrice; }).length;
                    mallStores = createdStores.filter(function (store) { return store.deliveryCategories.mall; }).length;
                    cashStores = createdStores.filter(function (store) { return store.deliveryCategories.cashStore; }).length;
                    console.log("   \uD83D\uDE80 Fast Delivery (30 min): ".concat(fastDeliveryStores));
                    console.log("   \uD83D\uDCB0 Budget Friendly (1 rupee): ".concat(budgetStores));
                    console.log("   \uD83D\uDC51 Premium/Luxury: ".concat(premiumStores));
                    console.log("   \uD83C\uDF31 Organic: ".concat(organicStores));
                    console.log("   \uD83E\uDD1D Alliance: ".concat(allianceStores));
                    console.log("   \uD83D\uDCB8 Lowest Price: ".concat(lowestPriceStores));
                    console.log("   \uD83C\uDFEC Mall: ".concat(mallStores));
                    console.log("   \uD83D\uDCB5 Cash Store: ".concat(cashStores));
                    console.log('\n🎉 Store seeding completed successfully!');
                    return [3 /*break*/, 8];
                case 5:
                    error_1 = _a.sent();
                    console.error('❌ Error seeding stores:', error_1);
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, mongoose_1.default.disconnect()];
                case 7:
                    _a.sent();
                    console.log('🔌 Disconnected from MongoDB');
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    });
}
// Run seeding if this file is executed directly
if (require.main === module) {
    seedStores();
}
exports.default = seedStores;
