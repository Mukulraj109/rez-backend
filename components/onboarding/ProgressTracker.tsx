/**
 * ProgressTracker Component
 * Overall onboarding progress tracker with visual indicators
 */

import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export interface ProgressTrackerProps {
  currentStep: number;
  totalSteps: number;
  overallProgress: number; // 0-100
  completedSteps?: number[];
  showPercentage?: boolean;
  showStepCount?: boolean;
  variant?: 'default' | 'minimal' | 'detailed';
  size?: 'small' | 'medium' | 'large';
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  currentStep,
  totalSteps,
  overallProgress,
  completedSteps = [],
  showPercentage = true,
  showStepCount = true,
  variant = 'default',
  size = 'medium',
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getProgressColor = () => {
    if (overallProgress >= 75) return colors.success;
    if (overallProgress >= 50) return colors.primary;
    if (overallProgress >= 25) return colors.warning;
    return colors.textMuted;
  };

  const getProgressIcon = () => {
    if (overallProgress === 100) return 'checkmark-circle';
    if (overallProgress >= 75) return 'trending-up';
    if (overallProgress >= 50) return 'stats-chart';
    return 'rocket';
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          progressHeight: 6,
          fontSize: 12,
          iconSize: 16,
          padding: 12,
        };
      case 'large':
        return {
          progressHeight: 12,
          fontSize: 16,
          iconSize: 24,
          padding: 20,
        };
      default:
        return {
          progressHeight: 8,
          fontSize: 14,
          iconSize: 20,
          padding: 16,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const progressColor = getProgressColor();

  if (variant === 'minimal') {
    return (
      <View style={styles.minimalContainer}>
        <View
          style={[
            styles.progressBarBackground,
            {
              height: sizeStyles.progressHeight,
              backgroundColor: colors.borderLight,
            },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${overallProgress}%`,
                backgroundColor: progressColor,
                height: sizeStyles.progressHeight,
              },
            ]}
          />
        </View>
        {showPercentage && (
          <Text
            style={[
              styles.minimalPercentage,
              { color: progressColor, fontSize: sizeStyles.fontSize },
            ]}
          >
            {Math.round(overallProgress)}%
          </Text>
        )}
      </View>
    );
  }

  if (variant === 'detailed') {
    return (
      <View
        style={[
          styles.detailedContainer,
          { backgroundColor: colors.backgroundSecondary, padding: sizeStyles.padding },
        ]}
      >
        {/* Header */}
        <View style={styles.detailedHeader}>
          <View style={styles.detailedTitleContainer}>
            <Ionicons name={getProgressIcon()} size={sizeStyles.iconSize} color={progressColor} />
            <Text
              style={[
                styles.detailedTitle,
                { color: colors.text, fontSize: sizeStyles.fontSize + 2 },
              ]}
            >
              Onboarding Progress
            </Text>
          </View>
          <Text
            style={[
              styles.detailedPercentage,
              { color: progressColor, fontSize: sizeStyles.fontSize + 4 },
            ]}
          >
            {Math.round(overallProgress)}%
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.detailedProgressContainer}>
          <View
            style={[
              styles.progressBarBackground,
              {
                height: sizeStyles.progressHeight,
                backgroundColor: colors.borderLight,
              },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${overallProgress}%`,
                  backgroundColor: progressColor,
                  height: sizeStyles.progressHeight,
                },
              ]}
            />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text
              style={[styles.statValue, { color: colors.text, fontSize: sizeStyles.fontSize }]}
            >
              {completedSteps.length}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: colors.textSecondary, fontSize: sizeStyles.fontSize - 2 },
              ]}
            >
              Completed
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text
              style={[styles.statValue, { color: colors.text, fontSize: sizeStyles.fontSize }]}
            >
              {currentStep}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: colors.textSecondary, fontSize: sizeStyles.fontSize - 2 },
              ]}
            >
              Current Step
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text
              style={[styles.statValue, { color: colors.text, fontSize: sizeStyles.fontSize }]}
            >
              {totalSteps - completedSteps.length}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: colors.textSecondary, fontSize: sizeStyles.fontSize - 2 },
              ]}
            >
              Remaining
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Default variant
  return (
    <View style={[styles.container, { padding: sizeStyles.padding }]}>
      {/* Header */}
      <View style={styles.header}>
        {showStepCount && (
          <Text style={[styles.stepText, { color: colors.text, fontSize: sizeStyles.fontSize }]}>
            Step {currentStep} of {totalSteps}
          </Text>
        )}
        {showPercentage && (
          <Text
            style={[
              styles.percentage,
              { color: progressColor, fontSize: sizeStyles.fontSize + 2 },
            ]}
          >
            {Math.round(overallProgress)}%
          </Text>
        )}
      </View>

      {/* Progress Bar */}
      <View
        style={[
          styles.progressBarBackground,
          {
            height: sizeStyles.progressHeight,
            backgroundColor: colors.borderLight,
          },
        ]}
      >
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${overallProgress}%`,
              backgroundColor: progressColor,
              height: sizeStyles.progressHeight,
            },
          ]}
        />
      </View>

      {/* Progress Description */}
      <Text
        style={[
          styles.description,
          { color: colors.textSecondary, fontSize: sizeStyles.fontSize - 2 },
        ]}
      >
        {completedSteps.length} of {totalSteps} steps completed
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Minimal variant
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  minimalPercentage: {
    fontWeight: '600',
    minWidth: 40,
  },

  // Default variant
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepText: {
    fontWeight: '500',
  },
  percentage: {
    fontWeight: '700',
  },
  description: {
    marginTop: 6,
  },

  // Detailed variant
  detailedContainer: {
    borderRadius: 12,
    marginBottom: 16,
  },
  detailedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailedTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailedTitle: {
    fontWeight: '600',
  },
  detailedPercentage: {
    fontWeight: '700',
  },
  detailedProgressContainer: {
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },

  // Common
  progressBarBackground: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    borderRadius: 4,
  },
});

export default ProgressTracker;
