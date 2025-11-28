/**
 * Notifications Types
 * Comprehensive type definitions for merchant notification system
 *
 * Features:
 * - Multiple notification channels (email, SMS, in-app)
 * - 11+ email templates support
 * - Preference management
 * - Notification tracking and read status
 * - SendGrid and Twilio integration
 */

// ============================================================================
// Notification Type Enums
// ============================================================================

/**
 * Main notification category types
 */
export enum NotificationType {
  ORDER = 'order',
  PRODUCT = 'product',
  CASHBACK = 'cashback',
  TEAM = 'team',
  SYSTEM = 'system',
  PAYMENT = 'payment',
  MARKETING = 'marketing',
  REVIEW = 'review',
  INVENTORY = 'inventory',
  ANALYTICS = 'analytics',
}

/**
 * Notification delivery channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
  PUSH = 'push',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Email template types (11+ templates)
 */
export enum EmailTemplate {
  // Order Notifications
  NEW_ORDER = 'new_order',
  ORDER_STATUS_UPDATE = 'order_status_update',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',

  // Cashback Notifications
  CASHBACK_REQUEST_RECEIVED = 'cashback_request_received',
  CASHBACK_APPROVED = 'cashback_approved',
  CASHBACK_REJECTED = 'cashback_rejected',
  CASHBACK_PENDING_REVIEW = 'cashback_pending_review',

  // Product Notifications
  PRODUCT_OUT_OF_STOCK = 'product_out_of_stock',
  PRODUCT_LOW_STOCK = 'product_low_stock',
  PRODUCT_APPROVED = 'product_approved',
  PRODUCT_REJECTED = 'product_rejected',

  // Team & Account
  TEAM_MEMBER_INVITED = 'team_member_invited',
  TEAM_MEMBER_REMOVED = 'team_member_removed',
  ACCOUNT_VERIFICATION_COMPLETE = 'account_verification_complete',
  ACCOUNT_VERIFICATION_FAILED = 'account_verification_failed',

  // Payment & Finance
  PAYMENT_RECEIVED = 'payment_received',
  PAYOUT_INITIATED = 'payout_initiated',
  PAYOUT_COMPLETED = 'payout_completed',
  PAYOUT_FAILED = 'payout_failed',

  // Marketing
  PROMOTION_CREATED = 'promotion_created',
  PROMOTION_ENDED = 'promotion_ended',
  MARKETING_CAMPAIGN_STARTED = 'marketing_campaign_started',

  // System
  SYSTEM_ALERT = 'system_alert',
  MAINTENANCE_ALERT = 'maintenance_alert',
  SECURITY_ALERT = 'security_alert',
}

/**
 * Notification read status
 */
export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
  DISMISSED = 'dismissed',
}

// ============================================================================
// Core Notification Interfaces
// ============================================================================

/**
 * Base notification object
 */
export interface Notification {
  id: string;
  merchantId: string;
  type: NotificationType;
  title: string;
  message: string;
  description?: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  channels: NotificationChannel[];

  // Template information
  templateId?: string;
  templateVariables?: Record<string, any>;

  // Related entity references
  relatedEntityType?: 'order' | 'product' | 'cashback' | 'team_member' | 'promotion';
  relatedEntityId?: string;
  relatedEntityData?: Record<string, any>;

  // Metadata
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;

  // Timestamps
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
  updatedAt: string;

  // Delivery tracking
  deliveryStatus: NotificationDeliveryStatus;
  sentAt?: string;
  failureReason?: string;
}

/**
 * Notification with delivery details
 */
export interface NotificationWithDelivery extends Notification {
  deliveryDetails: {
    email?: {
      status: 'pending' | 'sent' | 'failed' | 'bounced';
      sentAt?: string;
      deliveredAt?: string;
      failureReason?: string;
      messageId?: string;
    };
    sms?: {
      status: 'pending' | 'sent' | 'failed' | 'delivered';
      sentAt?: string;
      deliveredAt?: string;
      failureReason?: string;
      messageId?: string;
    };
    inApp?: {
      status: 'created' | 'displayed' | 'read';
      displayedAt?: string;
      readAt?: string;
    };
    push?: {
      status: 'pending' | 'sent' | 'failed';
      sentAt?: string;
      failureReason?: string;
    };
  };
}

/**
 * Notification delivery status
 */
export enum NotificationDeliveryStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

// ============================================================================
// Order Notification Types
// ============================================================================

export interface OrderNotification extends Notification {
  type: NotificationType.ORDER;
  orderId: string;
  orderNumber: string;
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  orderAmount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface NewOrderNotification extends OrderNotification {
  templateId: EmailTemplate.NEW_ORDER;
  templateVariables: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    itemCount: number;
    orderDate: string;
  };
}

export interface OrderStatusUpdateNotification extends OrderNotification {
  templateId: EmailTemplate.ORDER_STATUS_UPDATE;
  templateVariables: {
    orderId: string;
    newStatus: string;
    previousStatus: string;
    updatedAt: string;
    estimatedDelivery?: string;
  };
}

// ============================================================================
// Cashback Notification Types
// ============================================================================

export interface CashbackNotification extends Notification {
  type: NotificationType.CASHBACK;
  cashbackRequestId: string;
  cashbackAmount: number;
  cashbackStatus: 'pending' | 'approved' | 'rejected' | 'paid';
  customerId?: string;
  orderId?: string;
}

export interface CashbackApprovedNotification extends CashbackNotification {
  templateId: EmailTemplate.CASHBACK_APPROVED;
  templateVariables: {
    requestId: string;
    amount: number;
    approvedAt: string;
    payoutDate: string;
    customerId: string;
  };
}

export interface CashbackRejectedNotification extends CashbackNotification {
  templateId: EmailTemplate.CASHBACK_REJECTED;
  templateVariables: {
    requestId: string;
    amount: number;
    rejectionReason: string;
    rejectedAt: string;
  };
}

// ============================================================================
// Product Notification Types
// ============================================================================

export interface ProductNotification extends Notification {
  type: NotificationType.PRODUCT;
  productId: string;
  productName: string;
  productSku?: string;
  currentStock?: number;
  reorderLevel?: number;
}

export interface ProductStockNotification extends ProductNotification {
  templateId: EmailTemplate.PRODUCT_LOW_STOCK | EmailTemplate.PRODUCT_OUT_OF_STOCK;
  templateVariables: {
    productId: string;
    productName: string;
    currentStock: number;
    reorderLevel: number;
    lastRestockDate?: string;
  };
}

// ============================================================================
// Team Notification Types
// ============================================================================

export interface TeamNotification extends Notification {
  type: NotificationType.TEAM;
  teamMemberId?: string;
  memberName?: string;
  memberEmail?: string;
  role?: string;
}

export interface TeamMemberInvitedNotification extends TeamNotification {
  templateId: EmailTemplate.TEAM_MEMBER_INVITED;
  templateVariables: {
    inviteToken: string;
    memberEmail: string;
    role: string;
    inviteLink: string;
    expiresAt: string;
  };
}

// ============================================================================
// Payment Notification Types
// ============================================================================

export interface PaymentNotification extends Notification {
  type: NotificationType.PAYMENT;
  paymentId: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  transactionStatus: 'pending' | 'successful' | 'failed' | 'refunded';
}

export interface PaymentReceivedNotification extends PaymentNotification {
  templateId: EmailTemplate.PAYMENT_RECEIVED;
  templateVariables: {
    paymentId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    receivedAt: string;
  };
}

// ============================================================================
// Notification Preferences
// ============================================================================

/**
 * Notification preference channel settings
 */
export interface NotificationChannelPreference {
  enabled: boolean;
  frequency?: 'immediate' | 'daily_digest' | 'weekly_digest' | 'never';
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;   // HH:mm format
  };
  unsubscribeToken?: string;
}

/**
 * Notification category preference
 */
export interface NotificationCategoryPreference {
  type: NotificationType;
  enabled: boolean;
  channels: {
    email: NotificationChannelPreference;
    sms: NotificationChannelPreference;
    inApp: NotificationChannelPreference;
    push: NotificationChannelPreference;
  };
  priority: NotificationPriority;
}

/**
 * Complete notification preferences for a merchant
 */
export interface NotificationPreferences {
  merchantId: string;

  // Global settings
  globalMute: boolean;
  globalQuietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };

  // Category-specific preferences
  categories: {
    [key in NotificationType]?: NotificationCategoryPreference;
  };

  // Email specific settings
  email: {
    subscribed: boolean;
    verifiedEmail?: string;
    unsubscribeToken?: string;
    marketingEmails: boolean;
  };

  // SMS specific settings
  sms: {
    subscribed: boolean;
    verifiedPhone?: string;
    unsubscribeToken?: string;
  };

  // Frequency settings
  dailyDigest: {
    enabled: boolean;
    time: string;
    includeCategories: NotificationType[];
  };

  weeklyDigest: {
    enabled: boolean;
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    time: string;
    includeCategories: NotificationType[];
  };

  // Do Not Disturb settings
  doNotDisturb: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    allowUrgent: boolean;
  };

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Get notifications request
 */
export interface GetNotificationsRequest {
  page?: number;
  limit?: number;
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  startDate?: string;
  endDate?: string;
  unreadOnly?: boolean;
  sortBy?: 'createdAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get notifications response
 */
export interface GetNotificationsResponse {
  success: boolean;
  message: string;
  data?: {
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    unreadCount: number;
  };
  error?: string;
}

/**
 * Mark notification as read request
 */
export interface MarkNotificationReadRequest {
  notificationId: string;
}

/**
 * Mark notification as read response
 */
export interface MarkNotificationReadResponse {
  success: boolean;
  message: string;
  data?: {
    notificationId: string;
    readAt: string;
  };
  error?: string;
}

/**
 * Mark all notifications as read request
 */
export interface MarkAllNotificationsReadRequest {
  type?: NotificationType;
  beforeDate?: string;
}

/**
 * Mark all notifications as read response
 */
export interface MarkAllNotificationsReadResponse {
  success: boolean;
  message: string;
  data?: {
    markedCount: number;
    timestamp: string;
  };
  error?: string;
}

/**
 * Delete notification request
 */
export interface DeleteNotificationRequest {
  notificationId: string;
}

/**
 * Delete notification response
 */
export interface DeleteNotificationResponse {
  success: boolean;
  message: string;
  data?: {
    deletedId: string;
    timestamp: string;
  };
  error?: string;
}

/**
 * Get notification preferences response
 */
export interface GetNotificationPreferencesResponse {
  success: boolean;
  message: string;
  data?: NotificationPreferences;
  error?: string;
}

/**
 * Update notification preferences request
 */
export interface UpdateNotificationPreferencesRequest {
  globalMute?: boolean;
  globalQuietHours?: NotificationPreferences['globalQuietHours'];
  categories?: NotificationPreferences['categories'];
  email?: NotificationPreferences['email'];
  sms?: NotificationPreferences['sms'];
  dailyDigest?: NotificationPreferences['dailyDigest'];
  weeklyDigest?: NotificationPreferences['weeklyDigest'];
  doNotDisturb?: NotificationPreferences['doNotDisturb'];
}

/**
 * Update notification preferences response
 */
export interface UpdateNotificationPreferencesResponse {
  success: boolean;
  message: string;
  data?: NotificationPreferences;
  error?: string;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  totalNotifications: number;
  unreadCount: number;
  byType: {
    [key in NotificationType]?: number;
  };
  byStatus: {
    [key in NotificationStatus]?: number;
  };
  lastNotificationTime?: string;
}

/**
 * Get notification stats response
 */
export interface GetNotificationStatsResponse {
  success: boolean;
  message: string;
  data?: NotificationStats;
  error?: string;
}

// ============================================================================
// Internal Service Types
// ============================================================================

/**
 * Email sending configuration (SendGrid)
 */
export interface EmailSendConfig {
  to: string | string[];
  from?: string;
  subject: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  html?: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
  }>;
  categories?: string[];
  customArgs?: Record<string, string>;
}

/**
 * SMS sending configuration (Twilio)
 */
export interface SmsSendConfig {
  to: string | string[];
  from?: string;
  body: string;
  mediaUrl?: string[];
  statusCallback?: string;
  smartEncoding?: boolean;
}

/**
 * Notification sending result
 */
export interface NotificationSendResult {
  success: boolean;
  notificationId: string;
  channels: {
    email?: {
      success: boolean;
      messageId?: string;
      error?: string;
    };
    sms?: {
      success: boolean;
      messageId?: string;
      error?: string;
    };
    inApp?: {
      success: boolean;
      error?: string;
    };
    push?: {
      success: boolean;
      error?: string;
    };
  };
  timestamp: string;
}

/**
 * Notification template data
 */
export interface NotificationTemplate {
  id: string;
  type: EmailTemplate;
  name: string;
  description?: string;
  subject?: string;
  variables: string[];
  category: NotificationType;
  sendgridTemplateId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification queue item
 */
export interface QueuedNotification {
  id: string;
  notification: Notification;
  channels: NotificationChannel[];
  retryCount: number;
  maxRetries: number;
  nextRetryTime?: string;
  createdAt: string;
  updatedAt: string;
}
