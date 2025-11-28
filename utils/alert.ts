import { Platform, Alert } from 'react-native';

/**
 * Cross-platform alert utility
 * Uses window.alert for web and Alert.alert for native
 */
export const showAlert = (title: string, message?: string, buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
    // For web, use simple alert (buttons not supported)
    const fullMessage = message ? `${title}\n\n${message}` : title;
    window.alert(fullMessage);
    // Execute onPress for first button if provided
    if (buttons && buttons.length > 0 && buttons[0].onPress) {
      setTimeout(() => buttons[0].onPress!(), 100);
    }
  } else {
    // For native, use Alert.alert with full button support
    if (buttons && buttons.length > 0) {
      Alert.alert(title, message, buttons);
    } else {
      Alert.alert(title, message);
    }
  }
};

/**
 * Cross-platform confirm dialog
 * Uses window.confirm for web and Alert.alert for native
 */
export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'OK',
          onPress: onConfirm,
        },
      ]
    );
  }
};

