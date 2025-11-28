/**
 * Error fallback UI component
 * Displays user-friendly error messages with retry and recovery options
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ErrorMessageConfig } from '@/utils/errorMessages';

interface ErrorFallbackProps {
  title: string;
  message: string;
  action?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  details?: string;
  showDetails?: boolean;
  recoverable?: boolean;
}

export const ErrorFallback = ({
  title,
  message,
  action = 'Retry',
  onRetry,
  onGoBack,
  details,
  showDetails = false,
  recoverable = true,
}: ErrorFallbackProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [showErrorDetails, setShowErrorDetails] = React.useState(showDetails);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    contentContainer: {
      width: '100%',
      maxWidth: 400,
    },
    icon: {
      fontSize: 48,
      textAlign: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    message: {
      fontSize: 14,
      color: colors.text,
      opacity: 0.7,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    detailsContainer: {
      backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
      borderRadius: 8,
      padding: 12,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: '#ff6b6b',
    },
    detailsText: {
      fontSize: 12,
      color: colors.text,
      opacity: 0.6,
      fontFamily: 'monospace',
    },
    detailsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      paddingVertical: 8,
    },
    detailsButtonText: {
      fontSize: 12,
      color: colors.tint,
      fontWeight: '500',
    },
    buttonContainer: {
      gap: 12,
    },
    primaryButton: {
      backgroundColor: colors.tint,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: isDark ? '#2a2a2a' : '#e8e8e8',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    disabledButton: {
      opacity: 0.5,
    },
  });

  const handleRetry = () => {
    setShowErrorDetails(false);
    onRetry?.();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
      >
        {/* Icon */}
        <Text style={styles.icon}>⚠️</Text>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Message */}
        <Text style={styles.message}>{message}</Text>

        {/* Error Details */}
        {details && (
          <>
            {showErrorDetails && (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsText}>{details}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => setShowErrorDetails(!showErrorDetails)}
              accessible={true}
              accessibilityLabel="Toggle error details"
            >
              <Text style={styles.detailsButtonText}>
                {showErrorDetails ? 'Hide Details' : 'Show Details'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {recoverable && onRetry && (
            <TouchableOpacity
              style={[styles.primaryButton]}
              onPress={handleRetry}
              accessible={true}
              accessibilityLabel={`${action} button`}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>{action}</Text>
            </TouchableOpacity>
          )}

          {onGoBack && (
            <TouchableOpacity
              style={[styles.secondaryButton]}
              onPress={onGoBack}
              accessible={true}
              accessibilityLabel="Go back button"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          )}

          {!recoverable && !onGoBack && (
            <TouchableOpacity
              style={[styles.secondaryButton]}
              onPress={() => {
                // Close app or navigate to home
                // This would typically be handled by navigation context
              }}
              accessible={true}
              accessibilityLabel="Close button"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export interface ErrorFallbackScreenProps {
  error: Error | ErrorMessageConfig;
  resetError?: () => void;
}

/**
 * Error fallback screen wrapper
 * Can be used as a full-screen error display
 */
export const ErrorFallbackScreen = ({
  error,
  resetError,
}: ErrorFallbackScreenProps) => {
  const isErrorMessage = 'title' in error && 'message' in error;
  const title = isErrorMessage ? (error as ErrorMessageConfig).title : 'Error';
  const message = isErrorMessage ? (error as ErrorMessageConfig).message : error.message;
  const action = isErrorMessage ? (error as ErrorMessageConfig).action : 'Retry';
  const recoverable = isErrorMessage ? (error as ErrorMessageConfig).recoverable : true;

  return (
    <ErrorFallback
      title={title}
      message={message}
      action={action}
      onRetry={resetError}
      onGoBack={resetError}
      details={!isErrorMessage && (error as Error).stack}
      showDetails={false}
      recoverable={recoverable}
    />
  );
};
