/**
 * Verify Production Data Script
 * Validates all data is correct and production-ready
 * Checks categories, stores, and products for proper relationships
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

// Expected main categories
const EXPECTED_MAIN_CATEGORIES = [
  'food-dining',
  'grocery-essentials',
  'beauty-wellness',
  'healthcare',
  'fashion',
  'fitness-sports',
  'education-learning',
  'home-services',
  'travel-experiences',
  'entertainment',
  'financial-lifestyle',
];

async function verifyProductionData() {
  try {
    console.log('🚀 Starting Production Data Verification...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;
    const categoriesCollection = db.collection('categories');
    const storesCollection = db.collection('stores');
    const productsCollection = db.collection('products');

    let allPassed = true;
    const issues: string[] = [];

    // ========================================
    // CHECK 1: Main Categories
    // ========================================
    console.log('========================================');
    console.log('CHECK 1: Main Categories');
    console.log('========================================\n');

    const mainCategories = await categoriesCollection.find({ parentCategory: null }).toArray();
    const mainCategorySlugs = mainCategories.map(c => c.slug);

    console.log(`   Expected: ${EXPECTED_MAIN_CATEGORIES.length} main categories`);
    console.log(`   Found: ${mainCategories.length} main categories\n`);

    const missingMain = EXPECTED_MAIN_CATEGORIES.filter(slug => !mainCategorySlugs.includes(slug));
    if (missingMain.length > 0) {
      console.log(`   ❌ Missing main categories: ${missingMain.join(', ')}`);
      issues.push(`Missing main categories: ${missingMain.join(', ')}`);
      allPassed = false;
    } else {
      console.log('   ✅ All 11 main categories exist');
    }

    // ========================================
    // CHECK 2: Subcategories
    // ========================================
    console.log('\n========================================');
    console.log('CHECK 2: Subcategories');
    console.log('========================================\n');

    const subcategories = await categoriesCollection.find({ parentCategory: { $ne: null } }).toArray();
    console.log(`   Found: ${subcategories.length} subcategories\n`);

    // Check each subcategory has valid parent
    let orphanedSubcategories = 0;
    for (const sub of subcategories) {
      const parent = await categoriesCollection.findOne({ _id: sub.parentCategory });
      if (!parent) {
        orphanedSubcategories++;
        issues.push(`Orphaned subcategory: ${sub.name} (${sub.slug})`);
      }
    }

    if (orphanedSubcategories > 0) {
      console.log(`   ❌ Found ${orphanedSubcategories} orphaned subcategories`);
      allPassed = false;
    } else {
      console.log('   ✅ All subcategories have valid parent references');
    }

    // Show subcategory distribution
    console.log('\n   📊 Subcategories by Main Category:');
    for (const mainCat of mainCategories) {
      const subCount = await categoriesCollection.countDocuments({ parentCategory: mainCat._id });
      console.log(`      ${mainCat.name}: ${subCount} subcategories`);
    }

    // ========================================
    // CHECK 3: Stores
    // ========================================
    console.log('\n========================================');
    console.log('CHECK 3: Stores');
    console.log('========================================\n');

    const stores = await storesCollection.find({}).toArray();
    console.log(`   Found: ${stores.length} stores\n`);

    let storesWithoutCategory = 0;
    let storesWithoutSubcategory = 0;
    let storesWithoutSubcategorySlug = 0;
    let storesWithInvalidCategory = 0;
    let storesWithInvalidSubcategory = 0;

    for (const store of stores) {
      if (!store.category) {
        storesWithoutCategory++;
        issues.push(`Store without category: ${store.name}`);
      } else {
        const cat = await categoriesCollection.findOne({ _id: store.category });
        if (!cat) {
          storesWithInvalidCategory++;
          issues.push(`Store with invalid category: ${store.name}`);
        }
      }

      if (!store.subcategory) {
        storesWithoutSubcategory++;
        issues.push(`Store without subcategory: ${store.name}`);
      } else {
        const subcat = await categoriesCollection.findOne({ _id: store.subcategory });
        if (!subcat) {
          storesWithInvalidSubcategory++;
          issues.push(`Store with invalid subcategory: ${store.name}`);
        }
      }

      if (!store.subcategorySlug) {
        storesWithoutSubcategorySlug++;
        issues.push(`Store without subcategorySlug: ${store.name}`);
      }
    }

    if (storesWithoutCategory > 0) {
      console.log(`   ❌ ${storesWithoutCategory} stores without category`);
      allPassed = false;
    }
    if (storesWithoutSubcategory > 0) {
      console.log(`   ❌ ${storesWithoutSubcategory} stores without subcategory`);
      allPassed = false;
    }
    if (storesWithoutSubcategorySlug > 0) {
      console.log(`   ❌ ${storesWithoutSubcategorySlug} stores without subcategorySlug`);
      allPassed = false;
    }
    if (storesWithInvalidCategory > 0) {
      console.log(`   ❌ ${storesWithInvalidCategory} stores with invalid category reference`);
      allPassed = false;
    }
    if (storesWithInvalidSubcategory > 0) {
      console.log(`   ❌ ${storesWithInvalidSubcategory} stores with invalid subcategory reference`);
      allPassed = false;
    }

    if (storesWithoutCategory === 0 && storesWithoutSubcategory === 0 &&
        storesWithoutSubcategorySlug === 0 && storesWithInvalidCategory === 0 &&
        storesWithInvalidSubcategory === 0) {
      console.log('   ✅ All stores have valid category, subcategory, and subcategorySlug');
    }

    // Show store distribution
    console.log('\n   📊 Stores by Main Category:');
    for (const mainCat of mainCategories) {
      const storeCount = await storesCollection.countDocuments({ category: mainCat._id });
      if (storeCount > 0) {
        console.log(`      ${mainCat.name}: ${storeCount} stores`);
      }
    }

    // ========================================
    // CHECK 4: Products
    // ========================================
    console.log('\n========================================');
    console.log('CHECK 4: Products');
    console.log('========================================\n');

    const products = await productsCollection.find({}).toArray();
    console.log(`   Found: ${products.length} products\n`);

    let productsWithoutStore = 0;
    let productsWithoutCategory = 0;
    let productsWithoutSubCategory = 0;
    let productsWithoutSubSubCategory = 0;
    let productsWithInvalidStore = 0;
    let productsWithInvalidCategory = 0;
    let productsWithInvalidSubCategory = 0;

    for (const product of products) {
      if (!product.store) {
        productsWithoutStore++;
      } else {
        const store = await storesCollection.findOne({ _id: product.store });
        if (!store) {
          productsWithInvalidStore++;
        }
      }

      if (!product.category) {
        productsWithoutCategory++;
      } else {
        const cat = await categoriesCollection.findOne({ _id: product.category });
        if (!cat) {
          productsWithInvalidCategory++;
        }
      }

      if (!product.subCategory) {
        productsWithoutSubCategory++;
      } else {
        const subcat = await categoriesCollection.findOne({ _id: product.subCategory });
        if (!subcat) {
          productsWithInvalidSubCategory++;
        }
      }

      if (!product.subSubCategory) {
        productsWithoutSubSubCategory++;
      }
    }

    if (productsWithoutStore > 0) {
      console.log(`   ❌ ${productsWithoutStore} products without store`);
      allPassed = false;
    }
    if (productsWithoutCategory > 0) {
      console.log(`   ❌ ${productsWithoutCategory} products without category`);
      allPassed = false;
    }
    if (productsWithoutSubCategory > 0) {
      console.log(`   ❌ ${productsWithoutSubCategory} products without subCategory`);
      allPassed = false;
    }
    if (productsWithoutSubSubCategory > 0) {
      console.log(`   ⚠️ ${productsWithoutSubSubCategory} products without subSubCategory (warning)`);
    }
    if (productsWithInvalidStore > 0) {
      console.log(`   ❌ ${productsWithInvalidStore} products with invalid store reference`);
      allPassed = false;
    }
    if (productsWithInvalidCategory > 0) {
      console.log(`   ❌ ${productsWithInvalidCategory} products with invalid category reference`);
      allPassed = false;
    }
    if (productsWithInvalidSubCategory > 0) {
      console.log(`   ❌ ${productsWithInvalidSubCategory} products with invalid subCategory reference`);
      allPassed = false;
    }

    if (productsWithoutStore === 0 && productsWithoutCategory === 0 &&
        productsWithoutSubCategory === 0 && productsWithInvalidStore === 0 &&
        productsWithInvalidCategory === 0 && productsWithInvalidSubCategory === 0) {
      console.log('   ✅ All products have valid store, category, and subCategory references');
    }

    // Show product distribution
    console.log('\n   📊 Products by Main Category:');
    for (const mainCat of mainCategories) {
      const productCount = await productsCollection.countDocuments({ category: mainCat._id });
      if (productCount > 0) {
        console.log(`      ${mainCat.name}: ${productCount} products`);
      }
    }

    // ========================================
    // CHECK 5: Products per Store
    // ========================================
    console.log('\n========================================');
    console.log('CHECK 5: Products per Store');
    console.log('========================================\n');

    let storesWithNoProducts = 0;
    let storesWithFewProducts = 0;
    const storesWithNoProductsList: string[] = [];

    for (const store of stores) {
      const productCount = await productsCollection.countDocuments({ store: store._id });
      if (productCount === 0) {
        storesWithNoProducts++;
        storesWithNoProductsList.push(store.name);
      } else if (productCount < 3) {
        storesWithFewProducts++;
      }
    }

    if (storesWithNoProducts > 0) {
      console.log(`   ❌ ${storesWithNoProducts} stores with 0 products:`);
      storesWithNoProductsList.forEach(name => console.log(`      - ${name}`));
      allPassed = false;
    } else {
      console.log('   ✅ All stores have at least 1 product');
    }

    if (storesWithFewProducts > 0) {
      console.log(`   ⚠️ ${storesWithFewProducts} stores with fewer than 3 products (warning)`);
    }

    // ========================================
    // FINAL SUMMARY
    // ========================================
    console.log('\n========================================');
    console.log('📊 FINAL VERIFICATION SUMMARY');
    console.log('========================================');
    console.log(`Categories: ${mainCategories.length} main + ${subcategories.length} subcategories = ${mainCategories.length + subcategories.length} total`);
    console.log(`Stores: ${stores.length} total`);
    console.log(`Products: ${products.length} total`);
    console.log('========================================\n');

    if (allPassed) {
      console.log('✅✅✅ ALL CHECKS PASSED! ✅✅✅');
      console.log('🎉 Data is PRODUCTION READY! 🎉\n');
    } else {
      console.log('❌❌❌ SOME CHECKS FAILED ❌❌❌');
      console.log(`Found ${issues.length} issues:\n`);
      issues.slice(0, 20).forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
      if (issues.length > 20) {
        console.log(`   ... and ${issues.length - 20} more issues`);
      }
      console.log('\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

verifyProductionData()
  .then(() => {
    console.log('✅ Verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
