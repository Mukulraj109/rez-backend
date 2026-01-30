import * as cron from 'node-cron';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import merchantNotificationService from '../services/merchantNotificationService';

/**
 * Inventory Alerts Background Job
 *
 * This job runs daily to scan all merchant products and send notifications
 * for low stock and out of stock items.
 *
 * Schedule: Daily at 8:00 AM (before business hours)
 */

// Job instance
let inventoryAlertJob: ReturnType<typeof cron.schedule> | null = null;

// Execution flag to prevent concurrent runs
let isJobRunning = false;

// Configuration
const INVENTORY_ALERT_SCHEDULE = '0 8 * * *'; // Daily at 8:00 AM

interface AlertStats {
  lowStockAlerts: number;
  outOfStockAlerts: number;
  merchantsNotified: number;
  errors: string[];
  duration: number;
}

/**
 * Run the inventory alerts job
 */
async function runInventoryAlerts(): Promise<AlertStats> {
  const startTime = Date.now();
  const stats: AlertStats = {
    lowStockAlerts: 0,
    outOfStockAlerts: 0,
    merchantsNotified: 0,
    errors: [],
    duration: 0,
  };

  const merchantsNotifiedSet = new Set<string>();

  try {
    console.log('📦 [INVENTORY JOB] Running inventory alerts scan...');

    // Find all products with low stock or out of stock
    const lowStockProducts = await Product.find({
      isActive: true,
      $or: [
        // Out of stock
        { 'inventory.stock': 0 },
        // Low stock (stock <= threshold)
        {
          $expr: {
            $and: [
              { $gt: ['$inventory.stock', 0] },
              { $lte: ['$inventory.stock', { $ifNull: ['$inventory.lowStockThreshold', 5] }] }
            ]
          }
        }
      ]
    })
      .populate('store', 'merchantId name')
      .select('name inventory store')
      .lean();

    console.log(`📦 [INVENTORY JOB] Found ${lowStockProducts.length} products with stock issues`);

    // Process each product
    for (const product of lowStockProducts) {
      try {
        const store = product.store as any;
        const merchantId = store?.merchantId?.toString();

        if (!merchantId) {
          console.warn(`⚠️ [INVENTORY JOB] No merchant found for product ${product._id}`);
          continue;
        }

        const stock = product.inventory?.stock ?? 0;
        const threshold = product.inventory?.lowStockThreshold ?? 5;

        if (stock === 0) {
          // Out of stock notification
          await merchantNotificationService.notifyOutOfStock({
            merchantId,
            productId: (product._id as any).toString(),
            productName: product.name,
            storeId: store._id?.toString(),
          });
          stats.outOfStockAlerts++;
          console.log(`🚨 [INVENTORY JOB] Out of stock: ${product.name}`);
        } else if (stock <= threshold) {
          // Low stock notification
          await merchantNotificationService.notifyLowStock({
            merchantId,
            productId: (product._id as any).toString(),
            productName: product.name,
            currentStock: stock,
            threshold,
            storeId: store._id?.toString(),
          });
          stats.lowStockAlerts++;
          console.log(`⚠️ [INVENTORY JOB] Low stock: ${product.name} (${stock} units)`);
        }

        merchantsNotifiedSet.add(merchantId);
      } catch (productError: any) {
        stats.errors.push(`Product ${product._id}: ${productError.message}`);
        console.error(`❌ [INVENTORY JOB] Error processing product ${product._id}:`, productError.message);
      }
    }

    stats.merchantsNotified = merchantsNotifiedSet.size;
    stats.duration = Date.now() - startTime;

    console.log(`✅ [INVENTORY JOB] Completed:`, {
      lowStockAlerts: stats.lowStockAlerts,
      outOfStockAlerts: stats.outOfStockAlerts,
      merchantsNotified: stats.merchantsNotified,
      errors: stats.errors.length,
      duration: `${stats.duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return stats;
  } catch (error: any) {
    stats.duration = Date.now() - startTime;
    stats.errors.push(error.message || 'Unknown error');

    console.error('❌ [INVENTORY JOB] Job failed:', {
      error: error.message,
      duration: `${stats.duration}ms`,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Start the inventory alert job
 */
export function startInventoryAlertJob(): void {
  if (inventoryAlertJob) {
    console.log('⚠️ [INVENTORY JOB] Job already running');
    return;
  }

  console.log(`📦 [INVENTORY JOB] Starting inventory alert job (runs daily at 8:00 AM)`);

  inventoryAlertJob = cron.schedule(INVENTORY_ALERT_SCHEDULE, async () => {
    if (isJobRunning) {
      console.log('⏭️ [INVENTORY JOB] Previous job still running, skipping');
      return;
    }

    isJobRunning = true;

    try {
      await runInventoryAlerts();
    } catch (error) {
      // Error already logged in runInventoryAlerts
    } finally {
      isJobRunning = false;
    }
  });

  console.log('✅ [INVENTORY JOB] Job started');
}

/**
 * Stop the inventory alert job
 */
export function stopInventoryAlertJob(): void {
  if (inventoryAlertJob) {
    inventoryAlertJob.stop();
    inventoryAlertJob = null;
    console.log('🛑 [INVENTORY JOB] Job stopped');
  }
}

/**
 * Get job status
 */
export function getInventoryAlertJobStatus(): {
  running: boolean;
  executing: boolean;
  schedule: string;
} {
  return {
    running: inventoryAlertJob !== null,
    executing: isJobRunning,
    schedule: INVENTORY_ALERT_SCHEDULE,
  };
}

/**
 * Manually trigger inventory alerts (for testing/maintenance)
 */
export async function triggerManualInventoryAlerts(): Promise<AlertStats> {
  if (isJobRunning) {
    throw new Error('Inventory alert job already in progress');
  }

  console.log('📦 [INVENTORY JOB] Manual inventory alerts triggered');

  isJobRunning = true;

  try {
    return await runInventoryAlerts();
  } finally {
    isJobRunning = false;
  }
}

/**
 * Initialize inventory alert job
 * Called from server startup after database connection
 */
export function initializeInventoryAlertJob(): void {
  startInventoryAlertJob();
}

export default {
  initialize: initializeInventoryAlertJob,
  start: startInventoryAlertJob,
  stop: stopInventoryAlertJob,
  getStatus: getInventoryAlertJobStatus,
  triggerManual: triggerManualInventoryAlerts,
};
