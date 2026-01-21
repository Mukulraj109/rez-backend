
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { join } = require('path');

// Load env
dotenv.config({ path: join(__dirname, '.env') });

// Stub models to avoid full TS setup issues if models are complex
const userSchema = new mongoose.Schema({
    profile: { firstName: String },
    email: String
}, { strict: false });

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: String,
    items: Array
}, { strict: false });

const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);

async function verify() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI not found');

        console.log('🔌 Connecting to DB...');
        await mongoose.connect(uri);
        console.log('✅ Connected');

        const users = await User.find({});
        console.log(`\n📊 Found ${users.length} users in database:\n`);

        for (const user of users) {
            const orderCount = await Order.countDocuments({ user: user._id });
            console.log(`User ID: ${user._id}`);
            console.log(`Email: ${user.email || 'No Email'}`);
            console.log(`Name: ${user.profile?.firstName || 'No Name'}`);
            console.log(`Orders: ${orderCount}`);
            console.log('-------------------');
        }

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
