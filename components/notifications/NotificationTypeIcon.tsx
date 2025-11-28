import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NotificationType } from '../../types/notifications';

type IconName = keyof typeof Ionicons.glyphMap;

interface NotificationTypeIconProps {
  type: NotificationType | string;
  size?: number;
  color?: string;
  testID?: string;
}

export const NotificationTypeIcon: React.FC<NotificationTypeIconProps> = ({
  type,
  size = 24,
  color = '#6B7280',
  testID,
}) => {
  // Get icon name based on notification type
  const getIconName = (notificationType: NotificationType | string): IconName => {
    switch (notificationType) {
      case NotificationType.ORDER:
      case 'order':
        return 'receipt-outline';
      case NotificationType.PRODUCT:
      case 'product':
        return 'cube-outline';
      case NotificationType.CASHBACK:
      case 'cashback':
        return 'cash-outline';
      case NotificationType.TEAM:
      case 'team':
        return 'people-outline';
      case NotificationType.SYSTEM:
      case 'system':
        return 'settings-outline';
      case NotificationType.PAYMENT:
      case 'payment':
        return 'card-outline';
      case NotificationType.MARKETING:
      case 'marketing':
        return 'megaphone-outline';
      case NotificationType.REVIEW:
      case 'review':
        return 'star-outline';
      case NotificationType.INVENTORY:
      case 'inventory':
        return 'archive-outline';
      case NotificationType.ANALYTICS:
      case 'analytics':
        return 'analytics-outline';
      default:
        return 'notifications-outline';
    }
  };

  const iconName = getIconName(type);

  return <Ionicons name={iconName} size={size} color={color} testID={testID} />;
};
