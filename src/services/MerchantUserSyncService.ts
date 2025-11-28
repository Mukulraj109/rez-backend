import { Merchant } from '../models/Merchant';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { MProduct } from '../models/MerchantProduct';
import { Product } from '../models/Product';

export class MerchantUserSyncService {
  /**
   * Sync all existing merchants to create corresponding stores
   */
  static async syncAllMerchantsToStores(): Promise<void> {
    try {
      console.log('🔄 Starting sync of all merchants to stores...');
      
      const merchants = await Merchant.find({});
      let syncedCount = 0;
      let skippedCount = 0;

      for (const merchant of merchants) {
        // Check if store already exists for this merchant
        const existingStore = await Store.findOne({ merchantId: merchant._id });
        if (existingStore) {
          skippedCount++;
          continue;
        }

        await this.createStoreForMerchant(merchant);
        syncedCount++;
      }

      console.log(`✅ Sync complete: ${syncedCount} stores created, ${skippedCount} skipped (already exist)`);
    } catch (error) {
      console.error('❌ Error syncing merchants to stores:', error);
    }
  }

  /**
   * Sync all merchant products to user-side products
   */
  static async syncAllMerchantProductsToUserProducts(): Promise<void> {
    try {
      console.log('🔄 Starting sync of all merchant products to user products...');
      
      const merchantProducts = await MProduct.find({});
      let syncedCount = 0;
      let skippedCount = 0;

      for (const merchantProduct of merchantProducts) {
        // Check if user product already exists with this SKU
        const existingProduct = await Product.findOne({ sku: merchantProduct.sku });
        if (existingProduct) {
          skippedCount++;
          continue;
        }

        await this.createUserSideProduct(merchantProduct, merchantProduct.merchantId.toString());
        syncedCount++;
      }

      console.log(`✅ Product sync complete: ${syncedCount} products created, ${skippedCount} skipped (already exist)`);
    } catch (error) {
      console.error('❌ Error syncing merchant products to user products:', error);
    }
  }

  /**
   * Create a store for a merchant
   */
  static async createStoreForMerchant(merchant: any): Promise<void> {
    try {
      // Find a default category or create one if it doesn't exist
      let defaultCategory = await Category.findOne({ name: 'General' });
      if (!defaultCategory) {
        defaultCategory = await Category.create({
          name: 'General',
          slug: 'general',
          type: 'store',
          isActive: true
        });
      }

      // Create store slug from business name
      const storeSlug = merchant.businessName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .trim();

      // Check if store with this slug already exists and make it unique
      let finalSlug = storeSlug;
      let counter = 1;
      while (await Store.findOne({ slug: finalSlug })) {
        finalSlug = `${storeSlug}-${counter}`;
        counter++;
      }

      // Create the store
      const store = new Store({
        name: merchant.businessName,
        slug: finalSlug,
        description: `${merchant.businessName} - Your trusted local business`,
        category: defaultCategory._id,
        merchantId: merchant._id, // Link to merchant
        location: {
          address: `${merchant.businessAddress.street}, ${merchant.businessAddress.city}`,
          city: merchant.businessAddress.city,
          state: merchant.businessAddress.state,
          pincode: merchant.businessAddress.zipCode
        },
        contact: {
          phone: merchant.phone,
          email: merchant.email
        },
        ratings: {
          average: 0,
          count: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
        offers: {
          cashback: 5, // Default 5% cashback
          isPartner: true,
          partnerLevel: 'bronze'
        },
        operationalInfo: {
          hours: {
            monday: { open: '09:00', close: '18:00', closed: false },
            tuesday: { open: '09:00', close: '18:00', closed: false },
            wednesday: { open: '09:00', close: '18:00', closed: false },
            thursday: { open: '09:00', close: '18:00', closed: false },
            friday: { open: '09:00', close: '18:00', closed: false },
            saturday: { open: '09:00', close: '18:00', closed: false },
            sunday: { open: '10:00', close: '16:00', closed: false }
          },
          deliveryTime: '30-45 mins',
          minimumOrder: 0,
          deliveryFee: 0,
          freeDeliveryAbove: 500,
          acceptsWalletPayment: true,
          paymentMethods: ['cash', 'card', 'upi', 'wallet']
        },
        analytics: {
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
          repeatCustomers: 0
        },
        tags: ['new-store', 'local-business'],
        isActive: true,
        isFeatured: false,
        isVerified: merchant.verificationStatus === 'verified'
      });

      await store.save();
      
      console.log(`🏪 Created store "${merchant.businessName}" for merchant ${merchant._id}`);

    } catch (error) {
      console.error('Error creating store for merchant:', error);
      throw error;
    }
  }

  /**
   * Create user-side product from merchant product
   */
  static async createUserSideProduct(merchantProduct: any, merchantId: string): Promise<void> {
    try {
      // Find the store associated with this merchant
      const store = await Store.findOne({ merchantId: merchantId });
      if (!store) {
        console.error('No store found for merchant:', merchantId);
        return;
      }

      // Find or create the category
      // Use categoryType from product if available, otherwise default to 'general'
      const categoryType = (merchantProduct as any).categoryType || 'general';
      let category = await Category.findOne({ 
        name: merchantProduct.category,
        type: categoryType 
      });
      
      if (!category) {
        // Check if category exists with different type
        const existingCategory = await Category.findOne({ name: merchantProduct.category });
        if (existingCategory) {
          // Update existing category type if it's different
          existingCategory.type = categoryType as any;
          await existingCategory.save();
          category = existingCategory;
        } else {
          // Create new category with the specified type
          category = await Category.create({
            name: merchantProduct.category,
            slug: merchantProduct.category.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
            type: categoryType, // Use the category type from the product
            isActive: true
          });
        }
      }

      // Create unique slug for the product
      let productSlug = merchantProduct.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .trim();

      let counter = 1;
      while (await Product.findOne({ slug: productSlug })) {
        productSlug = `${merchantProduct.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}-${counter}`;
        counter++;
      }

      // Create the user-side product
      const userProduct = new Product({
        name: merchantProduct.name,
        slug: productSlug,
        description: merchantProduct.description,
        shortDescription: merchantProduct.shortDescription,
        category: category._id,
        store: store._id,
        brand: merchantProduct.brand,
        sku: merchantProduct.sku,
        barcode: merchantProduct.barcode,
        images: merchantProduct.images?.map((img: any) => img.url) || [],
        pricing: {
          original: merchantProduct.compareAtPrice || merchantProduct.price,
          selling: merchantProduct.price,
          currency: merchantProduct.currency || 'INR',
          discount: merchantProduct.compareAtPrice ? 
            Math.round(((merchantProduct.compareAtPrice - merchantProduct.price) / merchantProduct.compareAtPrice) * 100) : 0
        },
        inventory: {
          stock: merchantProduct.inventory.stock,
          isAvailable: merchantProduct.inventory.stock > 0,
          lowStockThreshold: merchantProduct.inventory.lowStockThreshold || 5,
          unlimited: false
        },
        ratings: {
          average: 0,
          count: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
        specifications: [],
        tags: merchantProduct.tags || [],
        seo: {
          title: merchantProduct.metaTitle || merchantProduct.name,
          description: merchantProduct.metaDescription || merchantProduct.shortDescription,
          keywords: merchantProduct.searchKeywords || []
        },
        analytics: {
          views: 0,
          purchases: 0,
          conversions: 0,
          wishlistAdds: 0,
          shareCount: 0,
          returnRate: 0,
          avgRating: 0
        },
        isActive: merchantProduct.status === 'active',
        isFeatured: merchantProduct.visibility === 'featured',
        isDigital: false,
        weight: merchantProduct.weight,
        dimensions: merchantProduct.dimensions ? {
          length: merchantProduct.dimensions.length,
          width: merchantProduct.dimensions.width,
          height: merchantProduct.dimensions.height,
          unit: merchantProduct.dimensions.unit
        } : undefined
      });

      await userProduct.save();
      
      console.log(`📦 Created user-side product "${merchantProduct.name}" for merchant ${merchantId}`);

    } catch (error) {
      console.error('Error creating user-side product:', error);
      throw error;
    }
  }

  /**
   * Get sync status and statistics
   */
  static async getSyncStatus() {
    try {
      const merchantCount = await Merchant.countDocuments({});
      const storeCount = await Store.countDocuments({});
      const merchantProductCount = await MProduct.countDocuments({});
      const userProductCount = await Product.countDocuments({});

      // Count stores that have merchantId (synced stores)
      const syncedStoreCount = await Store.countDocuments({ merchantId: { $exists: true, $ne: null } });

      // Count products that have matching SKUs
      const merchantSKUs = await MProduct.distinct('sku');
      const userProductsWithMerchantSKUs = await Product.countDocuments({ sku: { $in: merchantSKUs } });

      return {
        merchants: {
          total: merchantCount,
          withStores: syncedStoreCount,
          withoutStores: merchantCount - syncedStoreCount
        },
        stores: {
          total: storeCount,
          syncedFromMerchants: syncedStoreCount
        },
        products: {
          merchantSide: merchantProductCount,
          userSide: userProductCount,
          synced: userProductsWithMerchantSKUs,
          needsSync: merchantProductCount - userProductsWithMerchantSKUs
        },
        syncHealth: {
          merchantStoreSync: Math.round((syncedStoreCount / merchantCount) * 100),
          productSync: Math.round((userProductsWithMerchantSKUs / merchantProductCount) * 100)
        }
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }

  /**
   * Force full sync - sync all merchants and products
   */
  static async forceFullSync(): Promise<void> {
    console.log('🚀 Starting full sync process...');
    
    await this.syncAllMerchantsToStores();
    await this.syncAllMerchantProductsToUserProducts();
    
    console.log('✅ Full sync completed!');
  }
}