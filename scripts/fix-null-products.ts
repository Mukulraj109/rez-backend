import mongoose from 'mongoose';
import { Cart } from '../src/models/Cart';

async function fixNullProducts() {
  try {
    // Connect to database
    const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all carts with potential null product issues
    const carts = await Cart.find({});
    console.log(`📦 Found ${carts.length} carts to check`);

    let totalFixed = 0;

    for (const cart of carts) {
      const originalCount = cart.items.length;

      // Log current items
      console.log(`\n🛒 Cart ${cart._id}:`);
      console.log(`   User: ${cart.user}`);
      console.log(`   Original items: ${originalCount}`);

      // Check each item
      cart.items.forEach((item: any, index: number) => {
        if (!item.product) {
          console.log(`   ❌ Item ${index}: NULL PRODUCT (will be removed)`);
        } else if (!item.store) {
          console.log(`   ❌ Item ${index}: NULL STORE (will be removed)`);
        } else {
          const productId = typeof item.product === 'object' ? item.product._id : item.product;
          console.log(`   ✅ Item ${index}: Product ${productId}`);
        }
      });

      // Remove items with null product or store
      cart.items = cart.items.filter((item: any) => {
        if (!item.product || !item.store) {
          totalFixed++;
          return false;
        }
        return true;
      });

      if (cart.items.length < originalCount) {
        await cart.save();
        console.log(`   ✅ Fixed! Removed ${originalCount - cart.items.length} null items`);
      } else {
        console.log(`   ✅ No null items found`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total null items removed: ${totalFixed}`);
    console.log('\n✅ Cleanup complete');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixNullProducts();