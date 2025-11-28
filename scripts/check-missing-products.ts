import mongoose from 'mongoose';
import { Cart } from '../src/models/Cart';
import { Product } from '../src/models/Product';

async function checkMissingProducts() {
  try {
    // Connect to database
    const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all carts
    const carts = await Cart.find({});
    console.log(`📦 Found ${carts.length} carts to check`);

    let missingProducts = 0;
    let itemsToRemove: any[] = [];

    for (const cart of carts) {
      console.log(`\n🛒 Checking Cart ${cart._id}:`);
      console.log(`   User: ${cart.user}`);

      // Check each item's product
      for (let i = 0; i < cart.items.length; i++) {
        const item = cart.items[i] as any;
        const productId = typeof item.product === 'object' ? item.product._id : item.product;

        // Check if product exists
        const productExists = await Product.findById(productId);

        if (!productExists) {
          console.log(`   ❌ Item ${i}: Product ${productId} NOT FOUND IN DATABASE (deleted?)`);
          missingProducts++;
          itemsToRemove.push({ cartId: cart._id, itemIndex: i, productId });
        } else {
          console.log(`   ✅ Item ${i}: Product ${productId} exists (${productExists.name})`);
        }
      }
    }

    if (missingProducts > 0) {
      console.log(`\n⚠️  Found ${missingProducts} items referencing deleted products`);
      console.log('\nDo you want to remove these items? Run fix-null-products.ts to clean them up.');

      // Actually remove them now
      console.log('\n🔧 Removing items with missing products...');

      for (const cart of carts) {
        let modified = false;
        const newItems = [];

        for (const item of cart.items) {
          const productId = typeof item.product === 'object' ? (item.product as any)._id : item.product;
          const productExists = await Product.findById(productId);

          if (productExists) {
            newItems.push(item);
          } else {
            console.log(`   Removing item with missing product ${productId} from cart ${cart._id}`);
            modified = true;
          }
        }

        if (modified) {
          cart.items = newItems;
          await cart.save();
          console.log(`   ✅ Cart ${cart._id} updated`);
        }
      }

      console.log('\n✅ Cleanup complete!');
    } else {
      console.log('\n✅ All products referenced in carts exist!');
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkMissingProducts();