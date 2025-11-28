// API Services
export { apiClient } from './api/index';
export { authService } from './api/auth';
export { dashboardService } from './api/dashboard';
export { ordersService } from './api/orders';
export { cashbackService } from './api/cashback';
export { productsService } from './api/products';
export { uploadsService } from './api/uploads';
export { socketService } from './api/socket';
export { documentsService } from './api/documents';

// Storage Service
export { storageService } from './storage';

// Offline Service
export { offlineService } from './offline';

// Re-import for local use
import { authService } from './api/auth';
import { dashboardService } from './api/dashboard';
import { ordersService } from './api/orders';
import { cashbackService } from './api/cashback';
import { productsService } from './api/products';
import { uploadsService } from './api/uploads';
import { socketService } from './api/socket';
import { documentsService } from './api/documents';
import { storageService } from './storage';
import { offlineService } from './offline';

// API Service Collection
export const apiServices = {
  auth: authService,
  dashboard: dashboardService,
  orders: ordersService,
  cashback: cashbackService,
  products: productsService,
  uploads: uploadsService,
  socket: socketService,
  documents: documentsService,
};

// Storage utilities
export const storage = storageService;

// Offline utilities
export const offline = offlineService;