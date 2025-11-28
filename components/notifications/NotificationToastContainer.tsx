import React from 'react';
import { router } from 'expo-router';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { NotificationToast } from './NotificationToast';

/**
 * Container component that wraps the NotificationToast
 * and connects it to the NotificationContext
 */
export function NotificationToastContainer() {
  const { latestNotification, clearLatestNotification } = useNotificationContext();

  if (!latestNotification) {
    return null;
  }

  const handlePress = () => {
    clearLatestNotification();
    router.push(`/notifications/${latestNotification.id}`);
  };

  return (
    <NotificationToast
      notification={latestNotification}
      duration={5000}
      onPress={handlePress}
      onDismiss={clearLatestNotification}
      testID="notification-toast"
    />
  );
}
