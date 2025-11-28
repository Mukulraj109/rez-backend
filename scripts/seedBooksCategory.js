const mongoose = require('mongoose');
const { Category } = require('../dist/models/Category');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      dbName: process.env.DB_NAME || 'test'
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedBooksCategory = async () => {
  try {
    console.log('🔍 Checking if Books category exists...');

    const existingCategory = await Category.findOne({ slug: 'books' });
    if (existingCategory) {
      console.log('📚 Books category already exists:', existingCategory._id);
      return existingCategory._id;
    }

    console.log('📚 Creating Books category...');
    const booksCategory = new Category({
      name: 'Books',
      slug: 'books',
      description: 'Educational and entertainment books',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500',
      type: 'general',
      isActive: true,
      sortOrder: 0,
      metadata: {
        tags: ['education', 'reading', 'knowledge'],
        featured: false
      }
    });

    await booksCategory.save();
    console.log('✅ Books category created:', booksCategory._id);
    return booksCategory._id;

  } catch (error) {
    console.error('❌ Error seeding Books category:', error);
    throw error;
  }
};

// Run the seeding
const run = async () => {
  await connectDB();
  await seedBooksCategory();

  console.log('🎉 Books category seeding completed!');
  process.exit(0);
};

run().catch(error => {
  console.error('💥 Seeding failed:', error);
  process.exit(1);
});