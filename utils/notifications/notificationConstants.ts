/**
 * Notification Constants
 *
 * All notification-related constants:
 * - Notification type configurations
 * - Channel configurations
 * - Priority levels
 * - Retention periods
 * - Grouping options
 */

import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../../types/notifications';

// ============================================================================
// NOTIFICATION TYPE CONFIGURATIONS
// ============================================================================

export interface NotificationTypeConfig {
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultPriority: NotificationPriority;
  defaultChannels: NotificationChannel[];
  requiresAction: boolean;
}

export const NOTIFICATION_TYPES: Record<NotificationType, NotificationTypeConfig> = {
  [NotificationType.ORDER]: {
    label: 'Orders',
    description: 'Order updates and notifications',
    icon: 'cart',
    color: '#34C759',
    defaultPriority: NotificationPriority.HIGH,
    defaultChannels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ],
    requiresAction: true,
  },
  [NotificationType.PRODUCT]: {
    label: 'Products',
    description: 'Product-related notifications',
    icon: 'cube',
    color: '#007AFF',
    defaultPriority: NotificationPriority.MEDIUM,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    requiresAction: false,
  },
  [NotificationType.CASHBACK]: {
    label: 'Cashback',
    description: 'Cashback requests and updates',
    icon: 'wallet',
    color: '#FF9500',
    defaultPriority: NotificationPriority.HIGH,
    defaultChannels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ],
    requiresAction: true,
  },
  [NotificationType.TEAM]: {
    label: 'Team',
    description: 'Team member activities',
    icon: 'people',
    color: '#5856D6',
    defaultPriority: NotificationPriority.MEDIUM,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    requiresAction: false,
  },
  [NotificationType.SYSTEM]: {
    label: 'System',
    description: 'System updates and alerts',
    icon: 'settings',
    color: '#666',
    defaultPriority: NotificationPriority.LOW,
    defaultChannels: [NotificationChannel.IN_APP],
    requiresAction: false,
  },
  [NotificationType.PAYMENT]: {
    label: 'Payments',
    description: 'Payment and transaction notifications',
    icon: 'card',
    color: '#FF3B30',
    defaultPriority: NotificationPriority.HIGH,
    defaultChannels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ],
    requiresAction: true,
  },
  [NotificationType.MARKETING]: {
    label: 'Marketing',
    description: 'Marketing campaigns and promotions',
    icon: 'megaphone',
    color: '#FF2D55',
    defaultPriority: NotificationPriority.LOW,
    defaultChannels: [NotificationChannel.EMAIL],
    requiresAction: false,
  },
  [NotificationType.REVIEW]: {
    label: 'Reviews',
    description: 'Customer reviews and ratings',
    icon: 'star',
    color: '#FF9500',
    defaultPriority: NotificationPriority.MEDIUM,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    requiresAction: false,
  },
  [NotificationType.INVENTORY]: {
    label: 'Inventory',
    description: 'Stock alerts and inventory updates',
    icon: 'layers',
    color: '#007AFF',
    defaultPriority: NotificationPriority.HIGH,
    defaultChannels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ],
    requiresAction: true,
  },
  [NotificationType.ANALYTICS]: {
    label: 'Analytics',
    description: 'Analytics reports and insights',
    icon: 'stats-chart',
    color: '#34C759',
    defaultPriority: NotificationPriority.LOW,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    requiresAction: false,
  },
};

// ============================================================================
// CHANNEL CONFIGURATIONS
// ============================================================================

export interface ChannelConfig {
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  requiresSetup: boolean;
}

export const NOTIFICATION_CHANNELS: Record<NotificationChannel, ChannelConfig> = {
  [NotificationChannel.IN_APP]: {
    label: 'In-App',
    description: 'Show notifications inside the app',
    icon: 'notifications',
    enabled: true,
    requiresSetup: false,
  },
  [NotificationChannel.EMAIL]: {
    label: 'Email',
    description: 'Send email notifications',
    icon: 'mail',
    enabled: true,
    requiresSetup: true,
  },
  [NotificationChannel.SMS]: {
    label: 'SMS',
    description: 'Send text message notifications',
    icon: 'chatbubble',
    enabled: false,
    requiresSetup: true,
  },
  [NotificationChannel.PUSH]: {
    label: 'Push',
    description: 'Send push notifications',
    icon: 'phone-portrait',
    enabled: true,
    requiresSetup: true,
  },
};

// ============================================================================
// PRIORITY CONFIGURATIONS
// ============================================================================

export interface PriorityConfig {
  label: string;
  description: string;
  icon: string;
  color: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export const NOTIFICATION_PRIORITIES: Record<NotificationPriority, PriorityConfig> = {
  [NotificationPriority.LOW]: {
    label: 'Low',
    description: 'Can wait, non-urgent',
    icon: 'arrow-down',
    color: '#666',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  [NotificationPriority.MEDIUM]: {
    label: 'Medium',
    description: 'Normal priority',
    icon: 'remove',
    color: '#007AFF',
    soundEnabled: false,
    vibrationEnabled: true,
  },
  [NotificationPriority.HIGH]: {
    label: 'High',
    description: 'Important, needs attention',
    icon: 'arrow-up',
    color: '#FF9500',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  [NotificationPriority.URGENT]: {
    label: 'Urgent',
    description: 'Critical, immediate action required',
    icon: 'warning',
    color: '#FF3B30',
    soundEnabled: true,
    vibrationEnabled: true,
  },
};

// ============================================================================
// RETENTION PERIODS
// ============================================================================

export const RETENTION_PERIODS = [
  { value: 7, label: '7 days', description: 'Keep for 1 week' },
  { value: 30, label: '30 days', description: 'Keep for 1 month' },
  { value: 90, label: '90 days', description: 'Keep for 3 months' },
  { value: 365, label: '1 year', description: 'Keep for 1 year' },
  { value: -1, label: 'Forever', description: 'Never delete' },
];

// ============================================================================
// GROUPING OPTIONS
// ============================================================================

export const GROUPING_OPTIONS = [
  { value: 'none', label: 'No Grouping', icon: 'list' },
  { value: 'by_type', label: 'Group by Type', icon: 'folder' },
  { value: 'by_date', label: 'Group by Date', icon: 'calendar' },
  { value: 'by_priority', label: 'Group by Priority', icon: 'flag' },
];

// ============================================================================
// DIGEST SETTINGS
// ============================================================================

export const DIGEST_FREQUENCIES = [
  { value: 'immediate', label: 'Immediate', description: 'Send right away' },
  {
    value: 'daily_digest',
    label: 'Daily Digest',
    description: 'Once per day summary',
  },
  {
    value: 'weekly_digest',
    label: 'Weekly Digest',
    description: 'Once per week summary',
  },
  { value: 'never', label: 'Never', description: 'Do not send' },
];

export const DIGEST_TIMES = [
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '20:00', label: '8:00 PM' },
];

export const WEEKDAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

// ============================================================================
// QUIET HOURS PRESETS
// ============================================================================

export const QUIET_HOURS_PRESETS = [
  {
    label: 'Night (10 PM - 7 AM)',
    startTime: '22:00',
    endTime: '07:00',
  },
  {
    label: 'Sleeping (11 PM - 8 AM)',
    startTime: '23:00',
    endTime: '08:00',
  },
  {
    label: 'Work Hours (9 AM - 5 PM)',
    startTime: '09:00',
    endTime: '17:00',
  },
  {
    label: 'Custom',
    startTime: '22:00',
    endTime: '07:00',
  },
];

// ============================================================================
// SOUND & VIBRATION PATTERNS
// ============================================================================

export const NOTIFICATION_SOUNDS = [
  { value: 'default', label: 'Default' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'chime', label: 'Chime' },
  { value: 'none', label: 'Silent' },
];

export const VIBRATION_PATTERNS = [
  { value: 'default', label: 'Default', pattern: [0, 200, 100, 200] },
  { value: 'short', label: 'Short', pattern: [0, 100] },
  { value: 'long', label: 'Long', pattern: [0, 500] },
  { value: 'double', label: 'Double', pattern: [0, 200, 100, 200] },
  { value: 'triple', label: 'Triple', pattern: [0, 200, 100, 200, 100, 200] },
  { value: 'none', label: 'None', pattern: [] },
];

// ============================================================================
// EMAIL TEMPLATE CATEGORIES
// ============================================================================

export const EMAIL_TEMPLATE_CATEGORIES = {
  ORDER: [
    'new_order',
    'order_status_update',
    'order_cancelled',
    'order_shipped',
    'order_delivered',
  ],
  CASHBACK: [
    'cashback_request_received',
    'cashback_approved',
    'cashback_rejected',
    'cashback_pending_review',
  ],
  PRODUCT: [
    'product_out_of_stock',
    'product_low_stock',
    'product_approved',
    'product_rejected',
  ],
  TEAM: [
    'team_member_invited',
    'team_member_removed',
    'account_verification_complete',
    'account_verification_failed',
  ],
  PAYMENT: [
    'payment_received',
    'payout_initiated',
    'payout_completed',
    'payout_failed',
  ],
  MARKETING: [
    'promotion_created',
    'promotion_ended',
    'marketing_campaign_started',
  ],
  SYSTEM: ['system_alert', 'maintenance_alert', 'security_alert'],
};

// ============================================================================
// NOTIFICATION LIMITS
// ============================================================================

export const NOTIFICATION_LIMITS = {
  MAX_TITLE_LENGTH: 100,
  MAX_MESSAGE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_BATCH_SIZE: 1000,
  RATE_LIMIT_PER_MINUTE: 60,
  RATE_LIMIT_PER_HOUR: 1000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000,
};

// ============================================================================
// BADGE SETTINGS
// ============================================================================

export const BADGE_SETTINGS = {
  MAX_BADGE_COUNT: 99,
  BADGE_DISPLAY_FORMAT: '99+',
  SHOW_BADGE_FOR_TYPES: [
    NotificationType.ORDER,
    NotificationType.CASHBACK,
    NotificationType.PAYMENT,
    NotificationType.INVENTORY,
  ],
  URGENT_BADGE_COLOR: '#FF3B30',
  DEFAULT_BADGE_COLOR: '#007AFF',
};

// ============================================================================
// FILTER DEFAULTS
// ============================================================================

export const FILTER_DEFAULTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_SORT_BY: 'createdAt',
  DEFAULT_SORT_ORDER: 'desc',
  SORT_OPTIONS: [
    { value: 'createdAt', label: 'Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
    { value: 'type', label: 'Type' },
  ],
};

// ============================================================================
// DELIVERY STATUS ICONS
// ============================================================================

export const DELIVERY_STATUS_ICONS = {
  pending: 'time-outline',
  queued: 'hourglass-outline',
  sent: 'checkmark-outline',
  delivered: 'checkmark-done-outline',
  failed: 'close-circle-outline',
  bounced: 'alert-circle-outline',
};

export const DELIVERY_STATUS_COLORS = {
  pending: '#FF9500',
  queued: '#007AFF',
  sent: '#34C759',
  delivered: '#34C759',
  failed: '#FF3B30',
  bounced: '#FF3B30',
};

// ============================================================================
// ACTION BUTTON PRESETS
// ============================================================================

export const ACTION_BUTTON_PRESETS = {
  VIEW: { label: 'View', icon: 'eye', color: '#007AFF' },
  APPROVE: { label: 'Approve', icon: 'checkmark-circle', color: '#34C759' },
  REJECT: { label: 'Reject', icon: 'close-circle', color: '#FF3B30' },
  REVIEW: { label: 'Review', icon: 'document-text', color: '#007AFF' },
  DISMISS: { label: 'Dismiss', icon: 'close', color: '#666' },
  REPLY: { label: 'Reply', icon: 'chatbubble', color: '#007AFF' },
  SHARE: { label: 'Share', icon: 'share', color: '#007AFF' },
};

// ============================================================================
// ANALYTICS TRACKING EVENTS
// ============================================================================

export const NOTIFICATION_EVENTS = {
  RECEIVED: 'notification_received',
  VIEWED: 'notification_viewed',
  CLICKED: 'notification_clicked',
  DISMISSED: 'notification_dismissed',
  ACTION_TAKEN: 'notification_action_taken',
  SETTINGS_CHANGED: 'notification_settings_changed',
  UNSUBSCRIBED: 'notification_unsubscribed',
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const NOTIFICATION_ERRORS = {
  SEND_FAILED: 'Failed to send notification',
  INVALID_CHANNEL: 'Invalid notification channel',
  INVALID_TYPE: 'Invalid notification type',
  INVALID_PRIORITY: 'Invalid priority level',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  RECIPIENT_NOT_FOUND: 'Recipient not found',
  TEMPLATE_NOT_FOUND: 'Template not found',
  PREFERENCES_NOT_FOUND: 'Notification preferences not found',
};

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const NOTIFICATION_SUCCESS = {
  SENT: 'Notification sent successfully',
  MARKED_READ: 'Marked as read',
  MARKED_ALL_READ: 'All notifications marked as read',
  DELETED: 'Notification deleted',
  PREFERENCES_UPDATED: 'Notification preferences updated',
  SUBSCRIBED: 'Successfully subscribed',
  UNSUBSCRIBED: 'Successfully unsubscribed',
};
