import mongoose from 'mongoose';
import { Cart } from '../src/models/Cart';

async function fixLockedItems() {
  try {
    // Connect to database
    const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all carts
    const carts = await Cart.find({});
    console.log(`📦 Found ${carts.length} carts to check`);

    let totalFixed = 0;

    for (const cart of carts) {
      if (!cart.lockedItems || cart.lockedItems.length === 0) {
        continue;
      }

      console.log(`\n🛒 Checking Cart ${cart._id}:`);
      console.log(`   User: ${cart.user}`);
      console.log(`   Locked items count: ${cart.lockedItems.length}`);

      let needsFix = false;
      const fixedLockedItems = [];

      for (const item of cart.lockedItems) {
        const productField = (item as any).product;

        // Check if product is stored as a stringified object
        if (typeof productField === 'string' && productField.includes('{')) {
          console.log(`   ❌ Found corrupted locked item with stringified product object`);

          // Try to extract the actual product ID from the stringified object
          const idMatch = (productField as string).match(/id['"]\s*:\s*['"]([\w]+)['"]/);
          if (idMatch && idMatch[1]) {
            const productId = idMatch[1];
            console.log(`   ✅ Extracted product ID: ${productId}`);

            // Create fixed item with just the ID
            fixedLockedItems.push({
              ...item,
              product: productId
            });
            needsFix = true;
            totalFixed++;
          } else {
            console.log(`   ⚠️  Could not extract product ID, removing item`);
            needsFix = true;
          }
        } else if (typeof productField === 'object' && productField._id) {
          // Product is populated, store just the ID
          console.log(`   ⚠️  Found populated product, converting to ID only`);
          fixedLockedItems.push({
            ...item,
            product: productField._id
          });
          needsFix = true;
          totalFixed++;
        } else {
          // Item is OK
          fixedLockedItems.push(item);
        }
      }

      if (needsFix) {
        cart.lockedItems = fixedLockedItems;
        await cart.save();
        console.log(`   ✅ Cart fixed! Now has ${fixedLockedItems.length} locked items`);
      } else {
        console.log(`   ✅ No issues found`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total locked items fixed: ${totalFixed}`);
    console.log('\n✅ Cleanup complete');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixLockedItems();