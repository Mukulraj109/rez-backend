/**
 * WizardStepIndicator Component
 * Visual step indicator showing progress through the onboarding wizard
 */

import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface Step {
  number: number;
  title: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface WizardStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  completedSteps?: number[];
  variant?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  compact?: boolean;
}

const WizardStepIndicator: React.FC<WizardStepIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
  completedSteps = [],
  variant = 'horizontal',
  showLabels = true,
  compact = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const steps: Step[] = Array.from({ length: totalSteps }, (_, index) => ({
    number: index + 1,
    title: stepTitles[index] || `Step ${index + 1}`,
    isCompleted: completedSteps.includes(index + 1) || index + 1 < currentStep,
    isCurrent: index + 1 === currentStep,
  }));

  const progress = (currentStep / totalSteps) * 100;

  const getStepColor = (step: Step) => {
    if (step.isCompleted) return colors.success;
    if (step.isCurrent) return colors.primary;
    return colors.textMuted;
  };

  const getStepIcon = (step: Step) => {
    if (step.isCompleted) return 'checkmark-circle';
    if (step.isCurrent) return 'radio-button-on';
    return 'ellipse-outline';
  };

  if (variant === 'vertical') {
    return (
      <View style={styles.verticalContainer}>
        {/* Progress Indicator */}
        <View style={styles.progressHeader}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            Step {currentStep} of {totalSteps}
          </Text>
          <Text style={[styles.progressPercentage, { color: colors.primary }]}>
            {Math.round(progress)}%
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarBackground,
              { backgroundColor: colors.borderLight },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
        </View>

        {/* Vertical Steps */}
        {steps.map((step, index) => (
          <View key={step.number} style={styles.verticalStepContainer}>
            <View style={styles.verticalStepIndicator}>
              <View
                style={[
                  styles.stepCircle,
                  {
                    backgroundColor: step.isCurrent
                      ? colors.primary
                      : step.isCompleted
                        ? colors.success
                        : colors.backgroundSecondary,
                    borderColor: getStepColor(step),
                  },
                ]}
              >
                {step.isCompleted ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      {
                        color: step.isCurrent ? '#FFFFFF' : colors.textMuted,
                      },
                    ]}
                  >
                    {step.number}
                  </Text>
                )}
              </View>

              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.verticalConnector,
                    {
                      backgroundColor: step.isCompleted
                        ? colors.success
                        : colors.borderMedium,
                    },
                  ]}
                />
              )}
            </View>

            <View style={styles.verticalStepContent}>
              <Text
                style={[
                  styles.stepTitle,
                  {
                    color: step.isCurrent ? colors.primary : colors.text,
                    fontWeight: step.isCurrent ? '600' : '500',
                  },
                ]}
              >
                {step.title}
              </Text>
              {step.isCurrent && (
                <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                  Current step
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  }

  // Horizontal variant
  return (
    <View style={styles.horizontalContainer}>
      {/* Progress Header */}
      <View style={styles.progressHeader}>
        <Text style={[styles.progressText, { color: colors.text }]}>
          Step {currentStep} of {totalSteps}
        </Text>
        <Text style={[styles.progressPercentage, { color: colors.primary }]}>
          {Math.round(progress)}%
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBarBackground,
            { backgroundColor: colors.borderLight },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
      </View>

      {/* Horizontal Steps */}
      {!compact && (
        <View style={styles.horizontalStepsContainer}>
          {steps.map((step, index) => (
            <View key={step.number} style={styles.horizontalStepItem}>
              <View style={styles.horizontalStepIndicator}>
                <Ionicons
                  name={getStepIcon(step)}
                  size={24}
                  color={getStepColor(step)}
                />
                {index < steps.length - 1 && (
                  <View
                    style={[
                      styles.horizontalConnector,
                      {
                        backgroundColor: step.isCompleted
                          ? colors.success
                          : colors.borderMedium,
                      },
                    ]}
                  />
                )}
              </View>

              {showLabels && (
                <Text
                  style={[
                    styles.horizontalStepLabel,
                    {
                      color: step.isCurrent ? colors.primary : colors.textSecondary,
                      fontWeight: step.isCurrent ? '600' : '400',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Common styles
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Vertical variant
  verticalContainer: {
    paddingVertical: 16,
  },
  verticalStepContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  verticalStepIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  verticalConnector: {
    width: 2,
    flex: 1,
    marginTop: 4,
    minHeight: 32,
  },
  verticalStepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 12,
  },

  // Horizontal variant
  horizontalContainer: {
    paddingVertical: 16,
  },
  horizontalStepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  horizontalStepItem: {
    flex: 1,
    alignItems: 'center',
  },
  horizontalStepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  horizontalConnector: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  horizontalStepLabel: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});

export default WizardStepIndicator;
