import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignTokens';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'default' | 'danger' | 'warning';
  loading?: boolean;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor,
  onConfirm,
  onCancel,
  type = 'default',
  loading = false,
}: ConfirmModalProps) {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return { name: 'alert-circle' as const, color: Colors.error[500] };
      case 'warning':
        return { name: 'warning' as const, color: Colors.warning[500] };
      default:
        return { name: 'help-circle' as const, color: Colors.primary[500] };
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'danger':
        return Colors.error[50];
      case 'warning':
        return Colors.warning[50];
      default:
        return Colors.primary[50];
    }
  };

  const getConfirmButtonColor = () => {
    if (confirmColor) return confirmColor;
    switch (type) {
      case 'danger':
        return Colors.error[500];
      case 'warning':
        return Colors.warning[500];
      default:
        return Colors.primary[500];
    }
  };

  const icon = getIcon();
  const iconBg = getIconBg();
  const buttonColor = getConfirmButtonColor();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContainer}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                <Ionicons name={icon.name} size={48} color={icon.color} />
              </View>

              {/* Title */}
              <ThemedText style={styles.title}>{title}</ThemedText>

              {/* Message */}
              <ThemedText style={styles.message}>{message}</ThemedText>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <ThemedText style={styles.cancelButtonText}>{cancelText}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.confirmButton, { backgroundColor: buttonColor }, loading && styles.buttonDisabled]}
                  onPress={onConfirm}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.text.inverse} />
                  ) : (
                    <ThemedText style={styles.confirmButtonText}>{confirmText}</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.base,
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    }),
  },
  modalContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Shadows.lg,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.lineHeight.base,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: Colors.gray[100],
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cancelButtonText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semiBold,
  },
  confirmButton: {
    ...Shadows.sm,
  },
  confirmButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semiBold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

