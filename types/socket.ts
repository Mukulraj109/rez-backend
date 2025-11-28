// Socket.IO event types for real-time updates
import { DashboardMetrics, DashboardOverview, DashboardNotification } from './dashboard';
import { OrderEvent } from './orders';
import { CashbackEvent } from './cashback';
import { ProductEvent } from './products';

// Client to Server Events
export interface ClientToServerEvents {
  // Dashboard subscriptions
  'join-merchant-dashboard': (merchantId: string) => void;
  'leave-merchant-dashboard': (merchantId: string) => void;
  
  // Specific data subscriptions
  'subscribe-metrics': (merchantId: string) => void;
  'subscribe-orders': (merchantId: string) => void;
  'subscribe-cashback': (merchantId: string) => void;
  'subscribe-products': (merchantId: string) => void;
  'subscribe-notifications': (merchantId: string) => void;
  
  // Unsubscribe from updates
  'unsubscribe-metrics': (merchantId: string) => void;
  'unsubscribe-orders': (merchantId: string) => void;
  'unsubscribe-cashback': (merchantId: string) => void;
  'unsubscribe-products': (merchantId: string) => void;
  'unsubscribe-notifications': (merchantId: string) => void;
  
  // Ping for connection testing
  'ping': (timestamp: number) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  // Initial data when joining dashboard
  'initial-dashboard-data': (data: {
    metrics: DashboardMetrics;
    overview: DashboardOverview;
    notifications: DashboardNotification[];
  }) => void;
  
  // Live metrics updates (every 30 seconds)
  'metrics-updated': (data: DashboardMetrics) => void;
  
  // Overview updates (every 60 seconds)
  'overview-updated': (data: DashboardOverview) => void;
  
  // Real-time event streams
  'order-event': (event: OrderEvent) => void;
  'cashback-event': (event: CashbackEvent) => void;
  'product-event': (event: ProductEvent) => void;
  
  // System notifications
  'system-notification': (notification: DashboardNotification) => void;
  'notification-read': (notificationId: string) => void;
  'notification-deleted': (notificationId: string) => void;
  
  // Connection events
  'connection-status': (status: 'connected' | 'disconnected' | 'reconnecting') => void;
  'error': (error: SocketError) => void;
  'pong': (timestamp: number) => void;
  
  // Merchant-specific events
  'merchant-settings-updated': (settings: any) => void;
  'merchant-status-changed': (status: 'active' | 'inactive' | 'suspended') => void;
  
  // Bulk operation updates
  'bulk-operation-progress': (data: BulkOperationProgress) => void;
  'bulk-operation-completed': (data: BulkOperationResult) => void;
  
  // Analytics updates
  'analytics-updated': (data: {
    type: 'dashboard' | 'orders' | 'cashback' | 'products';
    data: any;
  }) => void;
}

// Socket error types
export interface SocketError {
  type: 'authentication' | 'permission' | 'rate_limit' | 'server_error' | 'validation';
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

// Bulk operation progress tracking
export interface BulkOperationProgress {
  operationId: string;
  type: 'order_update' | 'cashback_action' | 'product_update' | 'export';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  status: 'in_progress' | 'paused' | 'cancelled';
  eta?: number; // Estimated time remaining in seconds
  message?: string;
}

export interface BulkOperationResult {
  operationId: string;
  type: 'order_update' | 'cashback_action' | 'product_update' | 'export';
  status: 'completed' | 'failed' | 'partial';
  results: {
    successful: number;
    failed: number;
    total: number;
  };
  errors?: Array<{
    item: string;
    error: string;
  }>;
  downloadUrl?: string; // For export operations
  completedAt: string;
}

// Real-time alert types
export interface RealTimeAlert {
  id: string;
  type: 'low_stock' | 'high_risk_cashback' | 'large_order' | 'system_issue' | 'payment_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  autoResolve: boolean;
  resolveAfter?: number; // Seconds
}

// Socket connection configuration
export interface SocketConfig {
  url: string;
  options: {
    auth: {
      token: string;
    };
    transports: ['websocket', 'polling'];
    timeout: number;
    reconnection: boolean;
    reconnectionDelay: number;
    reconnectionAttempts: number;
    maxReconnectionAttempts: number;
  };
}

// Socket connection states
export type SocketConnectionState = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error'
  | 'timeout';

// Socket event subscriptions management
export interface SocketSubscription {
  merchantId: string;
  subscriptions: {
    metrics: boolean;
    orders: boolean;
    cashback: boolean;
    products: boolean;
    notifications: boolean;
  };
  joinedAt: string;
  lastActivity: string;
}

// Live dashboard update types
export interface LiveDashboardUpdate {
  type: 'metrics' | 'overview' | 'notification' | 'alert';
  data: any;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
}

// Real-time statistics for connection monitoring
export interface SocketStats {
  connectionUptime: number;
  messagesReceived: number;
  messagesSent: number;
  reconnectionCount: number;
  lastReconnectionAt?: string;
  averageLatency: number;
  subscriptionCount: number;
}

// Socket middleware for authentication and validation
export interface SocketMiddleware {
  authenticate: (token: string) => Promise<boolean>;
  validateMerchant: (merchantId: string, userId: string) => Promise<boolean>;
  rateLimit: (socketId: string, action: string) => Promise<boolean>;
  logActivity: (socketId: string, event: string, data?: any) => void;
}