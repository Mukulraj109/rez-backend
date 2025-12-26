/**
 * MongoDB Seed Script for Category Page Data
 * Uses MongoDB driver directly (proven to work)
 * Run: node scripts/seedCategoryPageDataJS.js [--clear]
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

const CATEGORY_SLUGS = [
  'food-dining', 'fashion', 'beauty-wellness', 'grocery-essentials',
  'healthcare', 'fitness-sports', 'education-learning', 'home-services',
  'travel-experiences', 'entertainment', 'financial-lifestyle'
];

// Vibes data (8 per category)
const vibesData = {
  'food-dining': [
    { id: 'romantic', name: 'Romantic Date', icon: '💕', color: '#F43F5E', description: 'Perfect for two' },
    { id: 'family', name: 'Family Feast', icon: '👨‍👩‍👧‍👦', color: '#3B82F6', description: 'Meals for everyone' },
    { id: 'quick', name: 'Quick Bite', icon: '⚡', color: '#F59E0B', description: 'Fast & delicious' },
    { id: 'healthy', name: 'Healthy Eats', icon: '🥗', color: '#10B981', description: 'Nutritious meals' },
    { id: 'party', name: 'Party Mode', icon: '🎉', color: '#EC4899', description: 'Celebration feasts' },
    { id: 'comfort', name: 'Comfort Food', icon: '🍲', color: '#8B5CF6', description: 'Soul-warming dishes' },
    { id: 'exotic', name: 'Exotic Flavors', icon: '🌏', color: '#06B6D4', description: 'World cuisines' },
    { id: 'sweet', name: 'Sweet Tooth', icon: '🍰', color: '#D946EF', description: 'Desserts & treats' }
  ],
  'fashion': [
    { id: 'sunny', name: 'Sunny Day', icon: '☀️', color: '#FBBF24', description: 'Light & breezy outfits' },
    { id: 'party', name: 'Party Mode', icon: '🎉', color: '#EC4899', description: 'Glam & glitter looks' },
    { id: 'romantic', name: 'Romantic', icon: '💕', color: '#F43F5E', description: 'Date night ready' },
    { id: 'winter', name: 'Winter Cozy', icon: '❄️', color: '#06B6D4', description: 'Warm & stylish layers' },
    { id: 'beach', name: 'Beach Ready', icon: '🏖️', color: '#14B8A6', description: 'Summer essentials' },
    { id: 'minimal', name: 'Minimal', icon: '🤍', color: '#94A3B8', description: 'Clean & simple' },
    { id: 'artistic', name: 'Artistic', icon: '🎨', color: '#8B5CF6', description: 'Bold & creative' },
    { id: 'sporty', name: 'Sporty', icon: '🏃', color: '#22C55E', description: 'Active & athletic' }
  ],
  'beauty-wellness': [
    { id: 'glow', name: 'Glow Up', icon: '✨', color: '#FBBF24', description: 'Radiant skin routine' },
    { id: 'natural', name: 'Natural Beauty', icon: '🌿', color: '#10B981', description: 'Organic products' },
    { id: 'spa', name: 'Spa Day', icon: '🧖', color: '#8B5CF6', description: 'Relaxation & pampering' },
    { id: 'bridal', name: 'Bridal Glow', icon: '👰', color: '#EC4899', description: 'Wedding-ready looks' },
    { id: 'men', name: "Men's Care", icon: '🧔', color: '#3B82F6', description: 'Grooming essentials' },
    { id: 'hair', name: 'Hair Goals', icon: '💇', color: '#D946EF', description: 'Hair treatments' },
    { id: 'wellness', name: 'Inner Wellness', icon: '🧘', color: '#14B8A6', description: 'Mind & body balance' },
    { id: 'quick', name: 'Quick Fix', icon: '⚡', color: '#F59E0B', description: '15-min treatments' }
  ],
  'grocery-essentials': [
    { id: 'organic', name: 'Organic', icon: '🌱', color: '#10B981', description: 'Chemical-free products' },
    { id: 'fresh', name: 'Farm Fresh', icon: '🥬', color: '#22C55E', description: 'Daily fresh produce' },
    { id: 'bulk', name: 'Bulk Buy', icon: '📦', color: '#F59E0B', description: 'Stock up & save' },
    { id: 'instant', name: 'Instant Meals', icon: '⏱️', color: '#EF4444', description: 'Ready to cook' },
    { id: 'healthy', name: 'Health Foods', icon: '💪', color: '#3B82F6', description: 'Nutritious choices' },
    { id: 'baby', name: 'Baby Care', icon: '👶', color: '#EC4899', description: 'For little ones' },
    { id: 'pet', name: 'Pet Supplies', icon: '🐕', color: '#8B5CF6', description: 'For furry friends' },
    { id: 'cleaning', name: 'Clean Home', icon: '🧹', color: '#06B6D4', description: 'Household essentials' }
  ],
  'healthcare': [
    { id: 'immunity', name: 'Immunity Boost', icon: '🛡️', color: '#10B981', description: 'Stay strong & healthy' },
    { id: 'fitness', name: 'Fitness First', icon: '💪', color: '#3B82F6', description: 'Workout supplements' },
    { id: 'mental', name: 'Mental Wellness', icon: '🧠', color: '#8B5CF6', description: 'Peace of mind' },
    { id: 'senior', name: 'Senior Care', icon: '👴', color: '#F59E0B', description: 'For elders' },
    { id: 'women', name: "Women's Health", icon: '👩', color: '#EC4899', description: 'Feminine care' },
    { id: 'kids', name: 'Kids Health', icon: '👧', color: '#14B8A6', description: 'For children' },
    { id: 'emergency', name: 'Emergency Kit', icon: '🚑', color: '#EF4444', description: 'First aid essentials' },
    { id: 'ayurveda', name: 'Ayurveda', icon: '🌿', color: '#22C55E', description: 'Traditional healing' }
  ],
  'fitness-sports': [
    { id: 'gym', name: 'Gym Beast', icon: '🏋️', color: '#EF4444', description: 'Heavy lifting gear' },
    { id: 'yoga', name: 'Yoga Flow', icon: '🧘', color: '#8B5CF6', description: 'Flexibility & peace' },
    { id: 'running', name: "Runner's High", icon: '🏃', color: '#3B82F6', description: 'Cardio essentials' },
    { id: 'outdoor', name: 'Outdoor Adventure', icon: '🏕️', color: '#10B981', description: 'Nature activities' },
    { id: 'swimming', name: 'Swim Ready', icon: '🏊', color: '#06B6D4', description: 'Pool & beach gear' },
    { id: 'team', name: 'Team Sports', icon: '⚽', color: '#22C55E', description: 'Group activities' },
    { id: 'recovery', name: 'Recovery Mode', icon: '🧊', color: '#64748B', description: 'Rest & heal' },
    { id: 'nutrition', name: 'Sports Nutrition', icon: '🥤', color: '#F59E0B', description: 'Performance fuel' }
  ],
  'education-learning': [
    { id: 'exam', name: 'Exam Prep', icon: '📝', color: '#EF4444', description: 'Ace your tests' },
    { id: 'career', name: 'Career Boost', icon: '💼', color: '#3B82F6', description: 'Professional skills' },
    { id: 'creative', name: 'Creative Arts', icon: '🎨', color: '#EC4899', description: 'Artistic learning' },
    { id: 'language', name: 'Language Master', icon: '🗣️', color: '#10B981', description: 'New languages' },
    { id: 'coding', name: 'Code & Tech', icon: '💻', color: '#8B5CF6', description: 'Programming skills' },
    { id: 'kids', name: 'Kids Learning', icon: '🎒', color: '#F59E0B', description: 'Fun education' },
    { id: 'music', name: 'Music & Dance', icon: '🎵', color: '#D946EF', description: 'Performing arts' },
    { id: 'hobby', name: 'Hobby Classes', icon: '🎯', color: '#14B8A6', description: 'Learn for fun' }
  ],
  'home-services': [
    { id: 'cleaning', name: 'Deep Clean', icon: '🧹', color: '#06B6D4', description: 'Sparkling spaces' },
    { id: 'repair', name: 'Quick Repair', icon: '🔧', color: '#F59E0B', description: 'Fix it fast' },
    { id: 'painting', name: 'Fresh Paint', icon: '🎨', color: '#EC4899', description: 'Color your home' },
    { id: 'pest', name: 'Pest Control', icon: '🐜', color: '#EF4444', description: 'Bug-free living' },
    { id: 'moving', name: 'Moving Day', icon: '📦', color: '#3B82F6', description: 'Relocation help' },
    { id: 'decor', name: 'Home Decor', icon: '🏠', color: '#8B5CF6', description: 'Interior styling' },
    { id: 'garden', name: 'Garden Care', icon: '🌺', color: '#10B981', description: 'Green thumb' },
    { id: 'appliance', name: 'Appliance Fix', icon: '🔌', color: '#64748B', description: 'Electronics repair' }
  ],
  'travel-experiences': [
    { id: 'adventure', name: 'Adventure', icon: '🏔️', color: '#10B981', description: 'Thrill seekers' },
    { id: 'romantic', name: 'Romantic', icon: '💕', color: '#EC4899', description: 'Couples getaway' },
    { id: 'family', name: 'Family Fun', icon: '👨‍👩‍👧‍👦', color: '#3B82F6', description: 'Kid-friendly trips' },
    { id: 'luxury', name: 'Luxury', icon: '👑', color: '#F59E0B', description: 'Premium experiences' },
    { id: 'budget', name: 'Budget Travel', icon: '💰', color: '#22C55E', description: 'Affordable trips' },
    { id: 'solo', name: 'Solo Explorer', icon: '🎒', color: '#8B5CF6', description: 'Me time adventures' },
    { id: 'cultural', name: 'Cultural', icon: '🏛️', color: '#D946EF', description: 'Heritage & history' },
    { id: 'wellness', name: 'Wellness Retreat', icon: '🧘', color: '#14B8A6', description: 'Relax & rejuvenate' }
  ],
  'entertainment': [
    { id: 'movies', name: 'Movie Night', icon: '🎬', color: '#EF4444', description: 'Latest releases' },
    { id: 'gaming', name: 'Gaming Zone', icon: '🎮', color: '#8B5CF6', description: 'Level up fun' },
    { id: 'concerts', name: 'Live Music', icon: '🎸', color: '#EC4899', description: 'Concert vibes' },
    { id: 'comedy', name: 'Comedy', icon: '😂', color: '#F59E0B', description: 'Laugh out loud' },
    { id: 'sports', name: 'Sports Events', icon: '🏆', color: '#3B82F6', description: 'Game day' },
    { id: 'family', name: 'Family Fun', icon: '🎪', color: '#10B981', description: 'All ages' },
    { id: 'nightlife', name: 'Nightlife', icon: '🌃', color: '#D946EF', description: 'After dark' },
    { id: 'arts', name: 'Arts & Theater', icon: '🎭', color: '#06B6D4', description: 'Cultural shows' }
  ],
  'financial-lifestyle': [
    { id: 'savings', name: 'Smart Savings', icon: '🏦', color: '#10B981', description: 'Grow your money' },
    { id: 'investment', name: 'Investment', icon: '📈', color: '#3B82F6', description: 'Build wealth' },
    { id: 'insurance', name: 'Insurance', icon: '🛡️', color: '#8B5CF6', description: 'Stay protected' },
    { id: 'loans', name: 'Quick Loans', icon: '💳', color: '#F59E0B', description: 'Easy credit' },
    { id: 'rewards', name: 'Rewards', icon: '🎁', color: '#EC4899', description: 'Earn & redeem' },
    { id: 'tax', name: 'Tax Planning', icon: '📋', color: '#64748B', description: 'Save on taxes' },
    { id: 'premium', name: 'Premium Life', icon: '👑', color: '#D946EF', description: 'Luxury benefits' },
    { id: 'student', name: 'Student Plans', icon: '🎓', color: '#14B8A6', description: 'Youth offers' }
  ]
};

// Occasions data (8 per category)
const occasionsData = {
  'food-dining': [
    { id: 'birthday', name: 'Birthday', icon: '🎂', color: '#EC4899', tag: 'Popular', discount: 20 },
    { id: 'anniversary', name: 'Anniversary', icon: '💑', color: '#F43F5E', tag: 'Romantic', discount: 25 },
    { id: 'corporate', name: 'Corporate', icon: '🏢', color: '#3B82F6', tag: null, discount: 15 },
    { id: 'wedding', name: 'Wedding', icon: '💒', color: '#D946EF', tag: 'Premium', discount: 30 },
    { id: 'family', name: 'Family Gathering', icon: '👨‍👩‍👧‍👦', color: '#F59E0B', tag: null, discount: 18 },
    { id: 'eid', name: 'Eid Feast', icon: '🌙', color: '#10B981', tag: 'Festive', discount: 25 },
    { id: 'diwali', name: 'Diwali', icon: '🪔', color: '#FF9500', tag: 'Coming Soon', discount: 30 },
    { id: 'christmas', name: 'Christmas', icon: '🎄', color: '#EF4444', tag: null, discount: 22 }
  ],
  'fashion': [
    { id: 'wedding', name: 'Wedding', icon: '💒', color: '#F43F5E', tag: 'Hot', discount: 30 },
    { id: 'eid', name: 'Eid', icon: '🌙', color: '#10B981', tag: 'Trending', discount: 25 },
    { id: 'diwali', name: 'Diwali', icon: '🪔', color: '#F59E0B', tag: 'Coming Soon', discount: 35 },
    { id: 'christmas', name: 'Christmas', icon: '🎄', color: '#EF4444', tag: null, discount: 20 },
    { id: 'newyear', name: 'New Year', icon: '🎊', color: '#8B5CF6', tag: null, discount: 22 },
    { id: 'birthday', name: 'Birthday', icon: '🎂', color: '#EC4899', tag: 'Special', discount: 15 },
    { id: 'collegefest', name: 'College Fest', icon: '🎓', color: '#3B82F6', tag: 'Student', discount: 28 },
    { id: 'office', name: 'Office Party', icon: '🏢', color: '#64748B', tag: null, discount: 18 }
  ],
  'beauty-wellness': [
    { id: 'wedding', name: 'Bridal', icon: '👰', color: '#EC4899', tag: 'Premium', discount: 35 },
    { id: 'karwachauth', name: 'Karwa Chauth', icon: '🌙', color: '#EF4444', tag: 'Special', discount: 25 },
    { id: 'valentines', name: "Valentine's", icon: '💕', color: '#F43F5E', tag: 'Romantic', discount: 20 },
    { id: 'mothers', name: "Mother's Day", icon: '👩', color: '#D946EF', tag: null, discount: 30 },
    { id: 'graduation', name: 'Graduation', icon: '🎓', color: '#3B82F6', tag: null, discount: 18 },
    { id: 'interview', name: 'Job Interview', icon: '💼', color: '#64748B', tag: 'Quick', discount: 15 },
    { id: 'party', name: 'Party Glam', icon: '🎉', color: '#8B5CF6', tag: null, discount: 22 },
    { id: 'festival', name: 'Festival Look', icon: '🎪', color: '#F59E0B', tag: 'Trending', discount: 28 }
  ],
  'grocery-essentials': [
    { id: 'diwali', name: 'Diwali', icon: '🪔', color: '#F59E0B', tag: 'Mega Sale', discount: 40 },
    { id: 'eid', name: 'Eid', icon: '🌙', color: '#10B981', tag: 'Special', discount: 30 },
    { id: 'holi', name: 'Holi', icon: '🎨', color: '#EC4899', tag: 'Colorful', discount: 25 },
    { id: 'christmas', name: 'Christmas', icon: '🎄', color: '#EF4444', tag: null, discount: 20 },
    { id: 'newyear', name: 'New Year', icon: '🎊', color: '#8B5CF6', tag: null, discount: 22 },
    { id: 'party', name: 'House Party', icon: '🏠', color: '#3B82F6', tag: null, discount: 18 },
    { id: 'bbq', name: 'BBQ Night', icon: '🍖', color: '#FF6B35', tag: 'Summer', discount: 15 },
    { id: 'breakfast', name: 'Breakfast Pack', icon: '🍳', color: '#FBBF24', tag: 'Daily', discount: 12 }
  ],
  'healthcare': [
    { id: 'monsoon', name: 'Monsoon Care', icon: '🌧️', color: '#3B82F6', tag: 'Essential', discount: 20 },
    { id: 'winter', name: 'Winter Health', icon: '❄️', color: '#06B6D4', tag: null, discount: 18 },
    { id: 'summer', name: 'Summer Care', icon: '☀️', color: '#F59E0B', tag: null, discount: 15 },
    { id: 'exam', name: 'Exam Season', icon: '📝', color: '#8B5CF6', tag: 'Students', discount: 22 },
    { id: 'pregnancy', name: 'Pregnancy', icon: '🤰', color: '#EC4899', tag: 'Special', discount: 25 },
    { id: 'senior', name: 'Senior Care', icon: '👴', color: '#64748B', tag: 'Care', discount: 30 },
    { id: 'fitness', name: 'Fitness Goals', icon: '💪', color: '#10B981', tag: 'New Year', discount: 20 },
    { id: 'travel', name: 'Travel Kit', icon: '✈️', color: '#14B8A6', tag: null, discount: 15 }
  ],
  'fitness-sports': [
    { id: 'newyear', name: 'New Year Goals', icon: '🎯', color: '#10B981', tag: 'Hot', discount: 35 },
    { id: 'summer', name: 'Summer Body', icon: '☀️', color: '#F59E0B', tag: 'Trending', discount: 30 },
    { id: 'marathon', name: 'Marathon Prep', icon: '🏃', color: '#3B82F6', tag: null, discount: 25 },
    { id: 'sports', name: 'Sports Season', icon: '🏆', color: '#EF4444', tag: null, discount: 22 },
    { id: 'school', name: 'School Sports', icon: '🏫', color: '#8B5CF6', tag: 'Students', discount: 28 },
    { id: 'outdoor', name: 'Outdoor Season', icon: '🏕️', color: '#22C55E', tag: null, discount: 20 },
    { id: 'monsoon', name: 'Indoor Fitness', icon: '🌧️', color: '#64748B', tag: null, discount: 18 },
    { id: 'winter', name: 'Winter Sports', icon: '⛷️', color: '#06B6D4', tag: 'Season', discount: 25 }
  ],
  'education-learning': [
    { id: 'academic', name: 'Academic Year', icon: '📚', color: '#3B82F6', tag: 'Hot', discount: 40 },
    { id: 'summer', name: 'Summer Camp', icon: '☀️', color: '#F59E0B', tag: null, discount: 25 },
    { id: 'exam', name: 'Exam Season', icon: '📝', color: '#EF4444', tag: 'Popular', discount: 30 },
    { id: 'career', name: 'Career Fair', icon: '💼', color: '#8B5CF6', tag: null, discount: 20 },
    { id: 'admission', name: 'Admission', icon: '🎓', color: '#10B981', tag: 'Season', discount: 35 },
    { id: 'hobby', name: 'Hobby Month', icon: '🎨', color: '#EC4899', tag: null, discount: 22 },
    { id: 'coding', name: 'Code Camp', icon: '💻', color: '#06B6D4', tag: 'Tech', discount: 28 },
    { id: 'language', name: 'Language Week', icon: '🗣️', color: '#D946EF', tag: null, discount: 18 }
  ],
  'home-services': [
    { id: 'diwali', name: 'Diwali Prep', icon: '🪔', color: '#F59E0B', tag: 'Hot', discount: 40 },
    { id: 'moving', name: 'Moving Season', icon: '📦', color: '#3B82F6', tag: null, discount: 25 },
    { id: 'monsoon', name: 'Monsoon Repair', icon: '🌧️', color: '#06B6D4', tag: 'Essential', discount: 30 },
    { id: 'summer', name: 'Summer AC', icon: '❄️', color: '#14B8A6', tag: null, discount: 20 },
    { id: 'spring', name: 'Spring Clean', icon: '🌸', color: '#EC4899', tag: 'Popular', discount: 35 },
    { id: 'wedding', name: 'Wedding Prep', icon: '💒', color: '#D946EF', tag: 'Premium', discount: 22 },
    { id: 'renovation', name: 'Renovation', icon: '🏗️', color: '#64748B', tag: null, discount: 28 },
    { id: 'pest', name: 'Pest Season', icon: '🐜', color: '#EF4444', tag: 'Urgent', discount: 18 }
  ],
  'travel-experiences': [
    { id: 'summer', name: 'Summer Vacation', icon: '🏖️', color: '#F59E0B', tag: 'Hot', discount: 35 },
    { id: 'honeymoon', name: 'Honeymoon', icon: '💕', color: '#EC4899', tag: 'Romantic', discount: 30 },
    { id: 'winter', name: 'Winter Break', icon: '❄️', color: '#06B6D4', tag: null, discount: 25 },
    { id: 'diwali', name: 'Diwali Trip', icon: '🪔', color: '#FF9500', tag: 'Festive', discount: 28 },
    { id: 'weekend', name: 'Weekend Escape', icon: '🚗', color: '#3B82F6', tag: 'Quick', discount: 20 },
    { id: 'adventure', name: 'Adventure Trip', icon: '🏔️', color: '#10B981', tag: null, discount: 22 },
    { id: 'religious', name: 'Pilgrimage', icon: '🛕', color: '#8B5CF6', tag: 'Spiritual', discount: 18 },
    { id: 'business', name: 'Business Trip', icon: '💼', color: '#64748B', tag: null, discount: 15 }
  ],
  'entertainment': [
    { id: 'weekend', name: 'Weekend Fun', icon: '🎉', color: '#EC4899', tag: 'Popular', discount: 25 },
    { id: 'birthday', name: 'Birthday Bash', icon: '🎂', color: '#F59E0B', tag: 'Special', discount: 30 },
    { id: 'date', name: 'Date Night', icon: '💕', color: '#F43F5E', tag: 'Romantic', discount: 20 },
    { id: 'family', name: 'Family Day', icon: '👨‍👩‍👧‍👦', color: '#3B82F6', tag: null, discount: 22 },
    { id: 'friends', name: 'Friends Night', icon: '🍻', color: '#8B5CF6', tag: null, discount: 18 },
    { id: 'newyear', name: 'New Year Party', icon: '🎊', color: '#D946EF', tag: 'Hot', discount: 35 },
    { id: 'halloween', name: 'Halloween', icon: '🎃', color: '#FF6B35', tag: null, discount: 28 },
    { id: 'christmas', name: 'Christmas', icon: '🎄', color: '#EF4444', tag: 'Festive', discount: 25 }
  ],
  'financial-lifestyle': [
    { id: 'newyear', name: 'New Year Goals', icon: '🎯', color: '#10B981', tag: 'Planning', discount: 20 },
    { id: 'tax', name: 'Tax Season', icon: '📋', color: '#3B82F6', tag: 'Important', discount: 30 },
    { id: 'wedding', name: 'Wedding Planning', icon: '💒', color: '#EC4899', tag: 'Premium', discount: 25 },
    { id: 'retirement', name: 'Retirement', icon: '🏖️', color: '#F59E0B', tag: null, discount: 22 },
    { id: 'education', name: 'Education Fund', icon: '🎓', color: '#8B5CF6', tag: 'Future', discount: 18 },
    { id: 'home', name: 'Home Loan', icon: '🏠', color: '#14B8A6', tag: null, discount: 15 },
    { id: 'business', name: 'Business Start', icon: '🚀', color: '#EF4444', tag: 'Hot', discount: 28 },
    { id: 'travel', name: 'Travel Fund', icon: '✈️', color: '#06B6D4', tag: null, discount: 20 }
  ]
};

// Hashtags data (6 per category)
const hashtagsData = {
  'food-dining': [
    { id: '1', tag: '#BiryaniLovers', count: 2450, color: '#F59E0B', trending: true },
    { id: '2', tag: '#HealthyEats', count: 1890, color: '#10B981', trending: true },
    { id: '3', tag: '#StreetFood', count: 3200, color: '#EF4444', trending: false },
    { id: '4', tag: '#CafeVibes', count: 1560, color: '#8B5CF6', trending: false },
    { id: '5', tag: '#DateNightDinner', count: 980, color: '#EC4899', trending: true },
    { id: '6', tag: '#FoodieFinds', count: 2100, color: '#3B82F6', trending: false }
  ],
  'fashion': [
    { id: '1', tag: '#WeddingSeason', count: 3200, color: '#F43F5E', trending: true },
    { id: '2', tag: '#StreetStyle', count: 2800, color: '#06B6D4', trending: true },
    { id: '3', tag: '#OfficeLooks', count: 1800, color: '#64748B', trending: false },
    { id: '4', tag: '#PartyReady', count: 2400, color: '#EC4899', trending: false },
    { id: '5', tag: '#SustainableFashion', count: 1500, color: '#10B981', trending: true },
    { id: '6', tag: '#EthnicVibes', count: 3200, color: '#D946EF', trending: false }
  ],
  'beauty-wellness': [
    { id: '1', tag: '#GlowUp', count: 4500, color: '#FBBF24', trending: true },
    { id: '2', tag: '#SkincareRoutine', count: 3800, color: '#EC4899', trending: true },
    { id: '3', tag: '#NaturalBeauty', count: 2200, color: '#10B981', trending: false },
    { id: '4', tag: '#SpaDay', count: 1900, color: '#8B5CF6', trending: false },
    { id: '5', tag: '#BridalGlow', count: 1600, color: '#D946EF', trending: true },
    { id: '6', tag: '#SelfCare', count: 2800, color: '#14B8A6', trending: false }
  ],
  'grocery-essentials': [
    { id: '1', tag: '#OrganicLiving', count: 2100, color: '#10B981', trending: true },
    { id: '2', tag: '#MealPrep', count: 1800, color: '#3B82F6', trending: true },
    { id: '3', tag: '#FarmToTable', count: 1500, color: '#22C55E', trending: false },
    { id: '4', tag: '#HealthyPantry', count: 1200, color: '#F59E0B', trending: false },
    { id: '5', tag: '#BulkBuying', count: 900, color: '#8B5CF6', trending: true },
    { id: '6', tag: '#FreshProduce', count: 1600, color: '#14B8A6', trending: false }
  ],
  'healthcare': [
    { id: '1', tag: '#ImmunityBoost', count: 3500, color: '#10B981', trending: true },
    { id: '2', tag: '#MentalHealth', count: 2800, color: '#8B5CF6', trending: true },
    { id: '3', tag: '#FitnessFirst', count: 2200, color: '#3B82F6', trending: false },
    { id: '4', tag: '#AyurvedaLife', count: 1800, color: '#22C55E', trending: false },
    { id: '5', tag: '#WellnessJourney', count: 1500, color: '#EC4899', trending: true },
    { id: '6', tag: '#HealthyHabits', count: 2000, color: '#F59E0B', trending: false }
  ],
  'fitness-sports': [
    { id: '1', tag: '#GymLife', count: 5200, color: '#EF4444', trending: true },
    { id: '2', tag: '#YogaEveryday', count: 3800, color: '#8B5CF6', trending: true },
    { id: '3', tag: '#RunnersCommunity', count: 2400, color: '#3B82F6', trending: false },
    { id: '4', tag: '#FitFam', count: 4100, color: '#10B981', trending: false },
    { id: '5', tag: '#HomeWorkout', count: 2900, color: '#F59E0B', trending: true },
    { id: '6', tag: '#NoExcuses', count: 2100, color: '#EC4899', trending: false }
  ],
  'education-learning': [
    { id: '1', tag: '#StudyGram', count: 4200, color: '#3B82F6', trending: true },
    { id: '2', tag: '#LearnToCode', count: 3100, color: '#8B5CF6', trending: true },
    { id: '3', tag: '#ExamPrep', count: 2800, color: '#EF4444', trending: false },
    { id: '4', tag: '#SkillUp', count: 2200, color: '#10B981', trending: false },
    { id: '5', tag: '#LanguageLearning', count: 1800, color: '#EC4899', trending: true },
    { id: '6', tag: '#NeverStopLearning', count: 1500, color: '#F59E0B', trending: false }
  ],
  'home-services': [
    { id: '1', tag: '#HomeDecor', count: 3800, color: '#EC4899', trending: true },
    { id: '2', tag: '#CleanHome', count: 2500, color: '#06B6D4', trending: true },
    { id: '3', tag: '#DIYHome', count: 2100, color: '#F59E0B', trending: false },
    { id: '4', tag: '#HomeRenovation', count: 1800, color: '#64748B', trending: false },
    { id: '5', tag: '#OrganizedLife', count: 1500, color: '#8B5CF6', trending: true },
    { id: '6', tag: '#GardenGoals', count: 1200, color: '#10B981', trending: false }
  ],
  'travel-experiences': [
    { id: '1', tag: '#Wanderlust', count: 6500, color: '#3B82F6', trending: true },
    { id: '2', tag: '#TravelIndia', count: 4200, color: '#F59E0B', trending: true },
    { id: '3', tag: '#HiddenGems', count: 2800, color: '#10B981', trending: false },
    { id: '4', tag: '#BeachVibes', count: 3500, color: '#06B6D4', trending: false },
    { id: '5', tag: '#MountainCalling', count: 2200, color: '#22C55E', trending: true },
    { id: '6', tag: '#SoloTravel', count: 1900, color: '#8B5CF6', trending: false }
  ],
  'entertainment': [
    { id: '1', tag: '#MovieNight', count: 5500, color: '#EF4444', trending: true },
    { id: '2', tag: '#GamingCommunity', count: 4200, color: '#8B5CF6', trending: true },
    { id: '3', tag: '#ConcertVibes', count: 2800, color: '#EC4899', trending: false },
    { id: '4', tag: '#WeekendFun', count: 3200, color: '#F59E0B', trending: false },
    { id: '5', tag: '#NightOut', count: 2100, color: '#D946EF', trending: true },
    { id: '6', tag: '#FamilyTime', count: 1800, color: '#3B82F6', trending: false }
  ],
  'financial-lifestyle': [
    { id: '1', tag: '#MoneyMatters', count: 3200, color: '#10B981', trending: true },
    { id: '2', tag: '#InvestSmart', count: 2800, color: '#3B82F6', trending: true },
    { id: '3', tag: '#FinancialFreedom', count: 2100, color: '#F59E0B', trending: false },
    { id: '4', tag: '#SavingsGoals', count: 1800, color: '#22C55E', trending: false },
    { id: '5', tag: '#WealthBuilding', count: 1500, color: '#8B5CF6', trending: true },
    { id: '6', tag: '#BudgetLife', count: 1200, color: '#64748B', trending: false }
  ]
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}━━━ ${msg} ━━━${colors.reset}\n`)
};

async function seedCategoryPageData() {
  const shouldClear = process.argv.includes('--clear');
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    log.info(`Connected to MongoDB (database: ${DB_NAME})`);

    const db = client.db(DB_NAME);

    // Get all 11 categories
    const categories = await db.collection('categories').find({
      slug: { $in: CATEGORY_SLUGS }
    }).toArray();

    log.info(`Found ${categories.length} categories to update`);

    if (shouldClear) {
      log.header('Clearing existing data');
      await db.collection('categories').updateMany(
        { slug: { $in: CATEGORY_SLUGS } },
        { $unset: { vibes: 1, occasions: 1, trendingHashtags: 1 } }
      );
      log.success('Cleared embedded metadata');
    }

    log.header('Seeding Category Metadata');

    let vibesCount = 0;
    let occasionsCount = 0;
    let hashtagsCount = 0;

    for (const category of categories) {
      const slug = category.slug;
      const vibes = vibesData[slug] || [];
      const occasions = occasionsData[slug] || [];
      const hashtags = hashtagsData[slug] || [];

      if (vibes.length === 0 && occasions.length === 0 && hashtags.length === 0) {
        log.error(`No data found for: ${slug}`);
        continue;
      }

      const result = await db.collection('categories').updateOne(
        { _id: category._id },
        {
          $set: {
            vibes: vibes,
            occasions: occasions,
            trendingHashtags: hashtags
          }
        }
      );

      if (result.modifiedCount > 0 || result.matchedCount > 0) {
        vibesCount += vibes.length;
        occasionsCount += occasions.length;
        hashtagsCount += hashtags.length;
        log.info(`${slug}: ${vibes.length} vibes, ${occasions.length} occasions, ${hashtags.length} hashtags`);
      } else {
        log.error(`Failed to update: ${slug}`);
      }
    }

    log.header('Summary');
    console.log('┌────────────────────────┬───────┐');
    console.log('│ Data Type              │ Count │');
    console.log('├────────────────────────┼───────┤');
    console.log(`│ Categories Updated     │ ${String(categories.length).padStart(5)} │`);
    console.log(`│ Vibes                  │ ${String(vibesCount).padStart(5)} │`);
    console.log(`│ Occasions              │ ${String(occasionsCount).padStart(5)} │`);
    console.log(`│ Hashtags               │ ${String(hashtagsCount).padStart(5)} │`);
    console.log('└────────────────────────┴───────┘');

    log.success(`\nTotal: ${vibesCount + occasionsCount + hashtagsCount} items seeded`);

  } catch (error) {
    log.error(`Error: ${error.message}`);
    console.error(error);
  } finally {
    await client.close();
    log.info('Disconnected from MongoDB');
  }
}

seedCategoryPageData();
