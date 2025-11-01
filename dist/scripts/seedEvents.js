"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const database_1 = require("../config/database");
const models_1 = require("../models");
const sampleEvents = [
    {
        title: 'Art of Living - Happiness Program',
        subtitle: 'Free • Online',
        description: 'Transform your life with ancient wisdom and modern techniques. Learn breathing exercises, meditation, and stress management in this comprehensive wellness program.',
        image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=200&fit=crop',
        price: {
            amount: 0,
            currency: '₹',
            isFree: true
        },
        location: {
            name: 'Online Event',
            address: 'Online',
            city: 'Online',
            isOnline: true,
            meetingUrl: 'https://zoom.us/j/123456789'
        },
        date: new Date('2025-08-25'),
        time: '7:00 PM',
        endTime: '9:00 PM',
        category: 'Wellness',
        organizer: {
            name: 'Art of Living Foundation',
            email: 'contact@artofliving.org',
            phone: '+91-9876543210',
            website: 'https://www.artofliving.org',
            description: 'Leading organization in wellness and meditation'
        },
        isOnline: true,
        registrationRequired: true,
        bookingUrl: 'https://www.artofliving.org/register',
        status: 'published',
        tags: ['wellness', 'meditation', 'breathing', 'stress-relief', 'online'],
        featured: true,
        priority: 1,
        maxCapacity: 1000,
        includes: ['Live session', 'Recording access', 'Materials'],
        publishedAt: new Date(),
        analytics: {
            views: 245,
            bookings: 89,
            shares: 12,
            favorites: 34
        }
    },
    {
        title: 'Music Concert - Classical Night',
        subtitle: '₹299 • Venue',
        description: 'An evening of classical music by renowned artists. Experience the beauty of Indian classical music in the historic Bangalore Palace.',
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop',
        price: {
            amount: 299,
            currency: '₹',
            isFree: false,
            originalPrice: 399,
            discount: 25
        },
        location: {
            name: 'Bangalore Palace',
            address: 'Palace Road, Vasanth Nagar',
            city: 'Bangalore',
            state: 'Karnataka',
            coordinates: {
                lat: 12.9981,
                lng: 77.5925
            },
            isOnline: false
        },
        date: new Date('2025-08-28'),
        time: '6:30 PM',
        endTime: '10:00 PM',
        category: 'Music',
        organizer: {
            name: 'Cultural Events Bangalore',
            email: 'info@culturalbangalore.com',
            phone: '+91-9876543211',
            website: 'https://www.culturalbangalore.com',
            description: 'Promoting classical arts and culture'
        },
        isOnline: false,
        registrationRequired: true,
        status: 'published',
        tags: ['classical', 'music', 'concert', 'cultural', 'bangalore'],
        featured: true,
        priority: 2,
        maxCapacity: 200,
        availableSlots: [
            { id: 'slot1', time: '6:30 PM', available: true, maxCapacity: 200, bookedCount: 45 },
            { id: 'slot2', time: '8:00 PM', available: true, maxCapacity: 200, bookedCount: 120 },
            { id: 'slot3', time: '9:30 PM', available: false, maxCapacity: 200, bookedCount: 200 }
        ],
        includes: ['Concert ticket', 'Parking', 'Refreshments'],
        publishedAt: new Date(),
        analytics: {
            views: 189,
            bookings: 67,
            shares: 8,
            favorites: 23
        }
    },
    {
        title: 'Tech Meetup - AI Revolution',
        subtitle: 'Free • Venue',
        description: 'Latest trends in AI and machine learning. Join industry experts and tech enthusiasts for discussions on AI innovations and networking.',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop',
        price: {
            amount: 0,
            currency: '₹',
            isFree: true
        },
        location: {
            name: 'Tech Park, Whitefield',
            address: 'ITPL Main Road, Whitefield',
            city: 'Bangalore',
            state: 'Karnataka',
            coordinates: {
                lat: 12.9698,
                lng: 77.7500
            },
            isOnline: false
        },
        date: new Date('2025-08-30'),
        time: '10:00 AM',
        endTime: '5:00 PM',
        category: 'Technology',
        organizer: {
            name: 'Bangalore Tech Community',
            email: 'contact@bangaloretech.com',
            phone: '+91-9876543212',
            website: 'https://www.bangaloretech.com',
            description: 'Leading tech community in Bangalore'
        },
        isOnline: false,
        registrationRequired: true,
        status: 'published',
        tags: ['ai', 'machine-learning', 'tech', 'networking', 'innovation'],
        featured: false,
        priority: 3,
        maxCapacity: 150,
        availableSlots: [
            { id: 'slot1', time: '10:00 AM', available: true, maxCapacity: 150, bookedCount: 85 },
            { id: 'slot2', time: '2:00 PM', available: true, maxCapacity: 150, bookedCount: 52 },
            { id: 'slot3', time: '4:00 PM', available: true, maxCapacity: 150, bookedCount: 12 }
        ],
        includes: ['Lunch', 'Networking session', 'Goodie bag'],
        publishedAt: new Date(),
        analytics: {
            views: 156,
            bookings: 43,
            shares: 15,
            favorites: 18
        }
    },
    {
        title: 'Yoga Workshop - Mindful Living',
        subtitle: '₹199 • Venue',
        description: 'Learn the art of mindful living through yoga, meditation, and breathing techniques. Perfect for beginners and experienced practitioners.',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
        price: {
            amount: 199,
            currency: '₹',
            isFree: false,
            originalPrice: 299,
            discount: 33
        },
        location: {
            name: 'Lalbagh Botanical Garden',
            address: 'Lalbagh Main Road, Lalbagh',
            city: 'Bangalore',
            state: 'Karnataka',
            coordinates: {
                lat: 12.9507,
                lng: 77.5848
            },
            isOnline: false
        },
        date: new Date('2025-09-02'),
        time: '6:00 AM',
        endTime: '8:00 AM',
        category: 'Wellness',
        organizer: {
            name: 'Mindful Living Center',
            email: 'info@mindfulliving.com',
            phone: '+91-9876543213',
            website: 'https://www.mindfulliving.com',
            description: 'Promoting wellness and mindful living'
        },
        isOnline: false,
        registrationRequired: true,
        status: 'published',
        tags: ['yoga', 'meditation', 'wellness', 'mindfulness', 'nature'],
        featured: false,
        priority: 4,
        maxCapacity: 50,
        availableSlots: [
            { id: 'slot1', time: '6:00 AM', available: true, maxCapacity: 50, bookedCount: 23 },
            { id: 'slot2', time: '7:00 AM', available: true, maxCapacity: 50, bookedCount: 15 }
        ],
        includes: ['Yoga mat', 'Herbal tea', 'Certificate'],
        publishedAt: new Date(),
        analytics: {
            views: 98,
            bookings: 28,
            shares: 6,
            favorites: 12
        }
    },
    {
        title: 'Startup Pitch Competition',
        subtitle: 'Free • Online',
        description: 'Showcase your innovative startup ideas to a panel of investors and industry experts. Win prizes and get funding opportunities.',
        image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=200&fit=crop',
        price: {
            amount: 0,
            currency: '₹',
            isFree: true
        },
        location: {
            name: 'Online Event',
            address: 'Online',
            city: 'Online',
            isOnline: true,
            meetingUrl: 'https://zoom.us/j/987654321'
        },
        date: new Date('2025-09-05'),
        time: '2:00 PM',
        endTime: '6:00 PM',
        category: 'Business',
        organizer: {
            name: 'Startup India Foundation',
            email: 'contact@startupindia.org',
            phone: '+91-9876543214',
            website: 'https://www.startupindia.org',
            description: 'Supporting Indian startups and entrepreneurs'
        },
        isOnline: true,
        registrationRequired: true,
        bookingUrl: 'https://www.startupindia.org/pitch-competition',
        status: 'published',
        tags: ['startup', 'pitch', 'funding', 'entrepreneurship', 'innovation'],
        featured: true,
        priority: 5,
        maxCapacity: 500,
        includes: ['Pitch session', 'Networking', 'Mentorship'],
        publishedAt: new Date(),
        analytics: {
            views: 312,
            bookings: 156,
            shares: 24,
            favorites: 67
        }
    }
];
async function seedEvents() {
    try {
        console.log('🌱 Starting event seeding...');
        // Connect to database
        await (0, database_1.connectDatabase)();
        console.log('✅ Connected to database');
        // Clear existing events
        await models_1.Event.deleteMany({});
        console.log('🗑️ Cleared existing events');
        // Insert sample events
        const events = await models_1.Event.insertMany(sampleEvents);
        console.log(`✅ Inserted ${events.length} events`);
        // Log inserted events
        events.forEach((event, index) => {
            console.log(`${index + 1}. ${event.title} - ${event.category} - ${event.status}`);
        });
        console.log('🎉 Event seeding completed successfully!');
    }
    catch (error) {
        console.error('❌ Error seeding events:', error);
    }
    finally {
        // Close database connection
        await mongoose_1.default.connection.close();
        console.log('🔌 Database connection closed');
    }
}
// Run seeding if this file is executed directly
if (require.main === module) {
    seedEvents();
}
exports.default = seedEvents;
