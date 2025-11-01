import mongoose from 'mongoose';
import { Cart } from '../src/models/Cart';

async function cleanupCart() {
  try {
    // Connect to database
    const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all carts
    const carts = await Cart.find({});
    console.log(`📦 Found ${carts.length} carts`);

    let totalCleaned = 0;
    let totalExpiredCleaned = 0;

    for (const cart of carts) {
      let cleaned = false;
      const originalItemCount = cart.items.length;
      const originalLockedCount = cart.lockedItems.length;

      // Remove items with null product or store
      cart.items = cart.items.filter((item: any) => {
        if (!item.product || !item.store) {
          console.log(`🗑️  Removing cart item with null product/store: ${item._id}`);
          totalCleaned++;
          cleaned = true;
          return false;
        }
        return true;
      });

      // Remove expired locked items
      const now = new Date();
      cart.lockedItems = cart.lockedItems.filter((item: any) => {
        if (item.expiresAt <= now) {
          console.log(`⏰ Removing expired locked item: ${item._id}, expired at ${item.expiresAt}`);
          totalExpiredCleaned++;
          cleaned = true;
          return false;
        }
        return true;
      });

      if (cleaned) {
        await cart.save();
        console.log(`✅ Cart ${cart._id} cleaned:`, {
          itemsBefore: originalItemCount,
          itemsAfter: cart.items.length,
          lockedBefore: originalLockedCount,
          lockedAfter: cart.lockedItems.length
        });
      }
    }

    console.log('\n📊 Cleanup Summary:');
    console.log(`   Null product items removed: ${totalCleaned}`);
    console.log(`   Expired locked items removed: ${totalExpiredCleaned}`);
    console.log(`   Total items cleaned: ${totalCleaned + totalExpiredCleaned}`);

    await mongoose.connection.close();
    console.log('\n✅ Cleanup complete, database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

cleanupCart();
