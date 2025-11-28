/**
 * ValidationErrorDisplay Component
 * Display validation errors from form or API
 */

import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export interface ValidationErrorDisplayProps {
  errors: Record<string, string>;
  warnings?: Record<string, string>;
  title?: string;
  scrollable?: boolean;
  compact?: boolean;
}

const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  errors,
  warnings,
  title = 'Please fix the following issues:',
  scrollable = false,
  compact = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const errorEntries = Object.entries(errors);
  const warningEntries = warnings ? Object.entries(warnings) : [];

  if (errorEntries.length === 0 && warningEntries.length === 0) {
    return null;
  }

  const getFieldLabel = (fieldName: string): string => {
    return fieldName
      .split('.')
      .pop()!
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const ErrorsList = () => (
    <>
      {/* Title */}
      {!compact && (
        <View style={styles.header}>
          <Ionicons name="alert-circle" size={20} color={colors.danger} />
          <Text style={[styles.title, { color: colors.danger }]}>{title}</Text>
        </View>
      )}

      {/* Errors */}
      {errorEntries.length > 0 && (
        <View style={styles.errorsContainer}>
          {errorEntries.map(([field, message], index) => (
            <View
              key={field}
              style={[
                styles.errorItem,
                {
                  backgroundColor: compact
                    ? 'transparent'
                    : colors.backgroundSecondary,
                  borderLeftColor: colors.danger,
                },
              ]}
            >
              <Ionicons
                name="close-circle"
                size={compact ? 16 : 18}
                color={colors.danger}
                style={styles.errorIcon}
              />
              <View style={styles.errorTextContainer}>
                {!compact && (
                  <Text style={[styles.fieldName, { color: colors.text }]}>
                    {getFieldLabel(field)}
                  </Text>
                )}
                <Text
                  style={[
                    styles.errorMessage,
                    { color: colors.danger, fontSize: compact ? 12 : 13 },
                  ]}
                >
                  {message}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Warnings */}
      {warningEntries.length > 0 && (
        <View style={styles.warningsContainer}>
          {!compact && (
            <View style={styles.header}>
              <Ionicons name="warning" size={18} color={colors.warning} />
              <Text style={[styles.warningTitle, { color: colors.warning }]}>
                Warnings:
              </Text>
            </View>
          )}
          {warningEntries.map(([field, message]) => (
            <View
              key={field}
              style={[
                styles.errorItem,
                {
                  backgroundColor: compact
                    ? 'transparent'
                    : colors.backgroundSecondary,
                  borderLeftColor: colors.warning,
                },
              ]}
            >
              <Ionicons
                name="alert-circle"
                size={compact ? 16 : 18}
                color={colors.warning}
                style={styles.errorIcon}
              />
              <View style={styles.errorTextContainer}>
                {!compact && (
                  <Text style={[styles.fieldName, { color: colors.text }]}>
                    {getFieldLabel(field)}
                  </Text>
                )}
                <Text
                  style={[
                    styles.errorMessage,
                    { color: colors.warning, fontSize: compact ? 12 : 13 },
                  ]}
                >
                  {message}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={[
          styles.scrollContainer,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.danger },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ErrorsList />
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        styles.container,
        compact ? styles.compactContainer : {},
        {
          backgroundColor: compact ? 'transparent' : colors.backgroundSecondary,
          borderColor: colors.danger,
        },
      ]}
    >
      <ErrorsList />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  compactContainer: {
    padding: 0,
    borderWidth: 0,
    borderRadius: 0,
  },
  scrollContainer: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 250,
    marginBottom: 16,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorsContainer: {
    gap: 8,
  },
  warningsContainer: {
    marginTop: 12,
    gap: 8,
  },
  errorItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  errorIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  errorTextContainer: {
    flex: 1,
  },
  fieldName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  errorMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default ValidationErrorDisplay;
