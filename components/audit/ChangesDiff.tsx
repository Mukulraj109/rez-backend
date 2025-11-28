import React from 'react';
import { View, Text, ScrollView, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../ui/ThemeProvider';

interface ChangesDiffProps {
  before: any;
  after: any;
  fields?: string[]; // Optional: only show specific fields
  testID?: string;
}

export const ChangesDiff: React.FC<ChangesDiffProps> = ({
  before,
  after,
  fields,
  testID,
}) => {
  const styles = useThemedStyles((theme) => ({
    container: {
      gap: theme.spacing.sm,
    } as ViewStyle,
    diffRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
    } as ViewStyle,
    column: {
      flex: 1,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    } as ViewStyle,
    beforeColumn: {
      backgroundColor: '#FEE2E215',
      borderWidth: 1,
      borderColor: '#FEE2E2',
    } as ViewStyle,
    afterColumn: {
      backgroundColor: '#D1FAE515',
      borderWidth: 1,
      borderColor: '#D1FAE5',
    } as ViewStyle,
    unchangedColumn: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    } as ViewStyle,
    columnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    } as ViewStyle,
    columnTitle: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase' as const,
    },
    fieldName: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semiBold,
      color: theme.colors.text,
      marginBottom: 4,
    },
    valueText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontFamily: 'monospace',
    },
    beforeValue: {
      color: '#DC2626',
      textDecorationLine: 'line-through' as const,
    },
    afterValue: {
      color: '#059669',
      fontWeight: theme.typography.fontWeight.medium,
    },
    nullValue: {
      fontStyle: 'italic' as const,
      color: theme.colors.textSecondary,
      opacity: 0.6,
    },
    emptyState: {
      padding: theme.spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    emptyText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center' as const,
    },
    sideBySide: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    } as ViewStyle,
    changeIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    } as ViewStyle,
    changeText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
    },
  }));

  // Get all changed fields
  const getChangedFields = () => {
    const changes: Array<{ field: string; before: any; after: any; changed: boolean }> = [];
    const allFields = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);

    allFields.forEach((field) => {
      // Skip if fields filter is provided and field is not in the list
      if (fields && !fields.includes(field)) return;

      const beforeValue = before?.[field];
      const afterValue = after?.[field];
      const changed = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);

      changes.push({ field, before: beforeValue, after: afterValue, changed });
    });

    return changes;
  };

  // Format value for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  };

  // Check if value is complex (object or array)
  const isComplexValue = (value: any): boolean => {
    return value !== null && typeof value === 'object';
  };

  const changedFields = getChangedFields();
  const hasChanges = changedFields.some((f) => f.changed);

  if (!hasChanges) {
    return (
      <View style={styles.emptyState} testID={testID}>
        <Ionicons name="checkmark-circle" size={32} color="#10B981" />
        <Text style={styles.emptyText}>No changes detected</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} testID={testID}>
      {changedFields.map((change, index) => {
        if (!change.changed) return null;

        return (
          <View key={`${change.field}-${index}`} style={styles.diffRow}>
            {/* Before Column */}
            <View style={[styles.column, styles.beforeColumn]}>
              <View style={styles.columnHeader}>
                <Ionicons name="remove-circle" size={12} color="#DC2626" />
                <Text style={styles.columnTitle}>Before</Text>
              </View>
              <Text style={styles.fieldName}>{change.field}</Text>
              <Text
                style={[
                  styles.valueText,
                  styles.beforeValue,
                  change.before === null && styles.nullValue,
                ]}
                numberOfLines={isComplexValue(change.before) ? undefined : 3}
              >
                {formatValue(change.before)}
              </Text>
            </View>

            {/* After Column */}
            <View style={[styles.column, styles.afterColumn]}>
              <View style={styles.columnHeader}>
                <Ionicons name="add-circle" size={12} color="#059669" />
                <Text style={styles.columnTitle}>After</Text>
              </View>
              <Text style={styles.fieldName}>{change.field}</Text>
              <Text
                style={[
                  styles.valueText,
                  styles.afterValue,
                  change.after === null && styles.nullValue,
                ]}
                numberOfLines={isComplexValue(change.after) ? undefined : 3}
              >
                {formatValue(change.after)}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Summary */}
      <View style={styles.changeIndicator}>
        <Ionicons name="swap-horizontal" size={14} color="#6B7280" />
        <Text style={styles.changeText}>
          {changedFields.filter((f) => f.changed).length} field(s) changed
        </Text>
      </View>
    </ScrollView>
  );
};
