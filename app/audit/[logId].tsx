/**
 * Audit Log Detail Screen
 * Shows complete details of a single audit log entry
 * Permissions required: logs:view
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissions';
import {
  useAuditLogs,
  useResourceHistory,
  useExportAuditLogs,
  useFormatAuditLog,
} from '@/hooks/queries/useAudit';
import { AuditLog, AuditSeverity, AuditChangeDetail } from '@/types/audit';

export default function AuditLogDetailScreen() {
  const { logId } = useLocalSearchParams();
  const { user } = useAuth();
  const formatLog = useFormatAuditLog();

  // Permission check
  const canView = user?.role ? hasPermission(user.role as any, 'logs:view') : false;
  const canExport = user?.role ? hasPermission(user.role as any, 'logs:export') : false;

  // Fetch the specific log (we'll fetch with filters)
  const {
    data: logsData,
    isLoading,
    isError,
    error,
  } = useAuditLogs(
    { limit: 100 }, // Fetch recent logs and find ours
    { enabled: canView && !!logId }
  );

  // Find the specific log
  const log = useMemo(() => {
    if (!logsData?.logs) return null;
    return logsData.logs.find((l) => l.id === logId);
  }, [logsData, logId]);

  // Fetch related logs (other actions on same resource)
  const {
    data: relatedLogsData,
    isLoading: relatedLoading,
  } = useResourceHistory(
    log?.resourceType || '',
    log?.resourceId || '',
    {
      enabled: !!log?.resourceType && !!log?.resourceId,
    }
  );

  const {
    refetch: exportLog,
    isFetching: isExporting,
  } = useExportAuditLogs(
    { format: 'json' },
    { enabled: false }
  );

  // Get severity styling
  const getSeverityColor = (severity: AuditSeverity): string => {
    const colors: Record<AuditSeverity, string> = {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      critical: '#991b1b',
    };
    return colors[severity] || '#3b82f6';
  };

  const getSeverityIcon = (severity: AuditSeverity): string => {
    const icons: Record<AuditSeverity, string> = {
      info: 'information-circle',
      warning: 'warning',
      error: 'close-circle',
      critical: 'alert-circle',
    };
    return icons[severity] || 'information-circle';
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      relative: formatLog({ timestamp } as AuditLog).displayTime,
      absolute: date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
  };

  // Handle export single log
  const handleExport = async () => {
    if (!canExport || !log) return;

    Alert.alert(
      'Export Log',
      'Export this audit log entry to JSON?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              // Export as JSON for single log
              const jsonData = JSON.stringify(log, null, 2);
              Alert.alert('Success', 'Log exported. In production, this would trigger a download.');
              // In real app: download or share the JSON
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to export log');
            }
          },
        },
      ]
    );
  };

  // Navigate to related resource
  const handleNavigateToResource = () => {
    if (!log?.resourceType || !log?.resourceId) return;

    // Map resource types to routes
    const routes: Record<string, string> = {
      product: `/products/${log.resourceId}`,
      order: `/orders/${log.resourceId}`,
      user: `/team/${log.resourceId}`,
      // Add more as needed
    };

    const route = routes[log.resourceType];
    if (route) {
      router.push(route as any);
    } else {
      Alert.alert('Navigation', `Cannot navigate to ${log.resourceType} resource`);
    }
  };

  // Render sections
  const renderUserInfo = () => {
    if (!log?.user) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>User Information</ThemedText>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle-outline" size={48} color={Colors.light.primary} />
            </View>
            <View style={styles.userInfo}>
              <ThemedText style={styles.userName}>{log.user.name}</ThemedText>
              <ThemedText style={styles.userEmail}>{log.user.email}</ThemedText>
              <View style={styles.roleBadge}>
                <ThemedText style={styles.roleBadgeText}>{log.user.role}</ThemedText>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderActionInfo = () => {
    if (!log) return null;

    const formatted = formatLog(log);
    const severityColor = getSeverityColor(log.severity);
    const severityIcon = getSeverityIcon(log.severity);
    const timestamps = formatTimestamp(log.timestamp);

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Action Details</ThemedText>
        <View style={styles.card}>
          <View style={styles.actionHeader}>
            <Ionicons name={severityIcon as any} size={32} color={severityColor} />
            <View style={styles.actionTitleContainer}>
              <ThemedText style={styles.actionTitle}>{formatted.displayAction}</ThemedText>
              <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
                <ThemedText style={styles.severityBadgeText}>
                  {log.severity.toUpperCase()}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="pricetag-outline" size={16} color="#666" />
              <ThemedText style={styles.infoLabel}>Action Type</ThemedText>
              <ThemedText style={styles.infoValue}>{log.action}</ThemedText>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="cube-outline" size={16} color="#666" />
              <ThemedText style={styles.infoLabel}>Resource Type</ThemedText>
              <ThemedText style={styles.infoValue}>{log.resourceType}</ThemedText>
            </View>

            {log.resourceId && (
              <View style={styles.infoItem}>
                <Ionicons name="key-outline" size={16} color="#666" />
                <ThemedText style={styles.infoLabel}>Resource ID</ThemedText>
                <ThemedText style={styles.infoValue} numberOfLines={1}>
                  {log.resourceId}
                </ThemedText>
              </View>
            )}

            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <ThemedText style={styles.infoLabel}>Timestamp</ThemedText>
              <ThemedText style={styles.infoValue}>{timestamps.relative}</ThemedText>
              <ThemedText style={styles.infoSubvalue}>{timestamps.absolute}</ThemedText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderTechnicalDetails = () => {
    if (!log) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Technical Details</ThemedText>
        <View style={styles.card}>
          {log.ipAddress && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color="#666" />
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>IP Address</ThemedText>
                <ThemedText style={styles.detailValue}>{log.ipAddress}</ThemedText>
              </View>
            </View>
          )}

          {log.userAgent && (
            <View style={styles.detailRow}>
              <Ionicons name="desktop-outline" size={18} color="#666" />
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>User Agent</ThemedText>
                <ThemedText style={styles.detailValue} numberOfLines={2}>
                  {log.userAgent}
                </ThemedText>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="finger-print-outline" size={18} color="#666" />
            <View style={styles.detailContent}>
              <ThemedText style={styles.detailLabel}>Log ID</ThemedText>
              <ThemedText style={styles.detailValue}>{log.id}</ThemedText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderChanges = () => {
    if (!log?.details?.changes || log.details.changes.length === 0) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Changes Made</ThemedText>
        <View style={styles.card}>
          {log.details.changes.map((change: AuditChangeDetail, index: number) => (
            <View key={index} style={styles.changeItem}>
              <ThemedText style={styles.changeField}>{change.field}</ThemedText>
              <View style={styles.changeComparison}>
                <View style={styles.changeBeforeContainer}>
                  <ThemedText style={styles.changeLabel}>Before</ThemedText>
                  <ThemedText style={styles.changeValue} numberOfLines={3}>
                    {JSON.stringify(change.before || change.oldValue, null, 2)}
                  </ThemedText>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#999" />
                <View style={styles.changeAfterContainer}>
                  <ThemedText style={styles.changeLabel}>After</ThemedText>
                  <ThemedText style={styles.changeValue} numberOfLines={3}>
                    {JSON.stringify(change.after || change.newValue, null, 2)}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMetadata = () => {
    if (!log?.details?.metadata) return null;

    const metadata = log.details.metadata;
    const entries = Object.entries(metadata);

    if (entries.length === 0) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Additional Context</ThemedText>
        <View style={styles.card}>
          {entries.map(([key, value], index) => (
            <View key={index} style={styles.metadataRow}>
              <ThemedText style={styles.metadataKey}>{key}:</ThemedText>
              <ThemedText style={styles.metadataValue}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderRelatedLogs = () => {
    if (relatedLoading) {
      return (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Related Logs</ThemedText>
          <ActivityIndicator size="small" color={Colors.light.primary} />
        </View>
      );
    }

    if (!relatedLogsData?.history || relatedLogsData.history.length <= 1) return null;

    // Filter out current log
    const otherLogs = relatedLogsData.history.filter((l) => l.id !== logId).slice(0, 5);

    if (otherLogs.length === 0) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>
          Related Logs ({otherLogs.length})
        </ThemedText>
        <View style={styles.card}>
          {otherLogs.map((relatedLog) => {
            const formatted = formatLog(relatedLog);
            return (
              <TouchableOpacity
                key={relatedLog.id}
                style={styles.relatedLogItem}
                onPress={() => router.push(`/audit/${relatedLog.id}`)}
              >
                <View style={styles.relatedLogContent}>
                  <ThemedText style={styles.relatedLogAction}>
                    {formatted.displayAction}
                  </ThemedText>
                  <ThemedText style={styles.relatedLogTime}>
                    {formatted.displayTime}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <ThemedText style={styles.loadingText}>Loading log details...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Error or not found
  if (isError || !log) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <ThemedText style={styles.errorText}>Log Not Found</ThemedText>
          <ThemedText style={styles.errorSubtext}>
            {error?.message || 'The requested audit log could not be found'}
          </ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!canView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
          <ThemedText style={styles.errorText}>Permission Denied</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderUserInfo()}
        {renderActionInfo()}
        {renderChanges()}
        {renderMetadata()}
        {renderTechnicalDetails()}
        {renderRelatedLogs()}

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          {log.resourceId && log.resourceType && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleNavigateToResource}
            >
              <Ionicons name="open-outline" size={20} color="#fff" />
              <ThemedText style={styles.actionButtonText}>View Resource</ThemedText>
            </TouchableOpacity>
          )}

          {canExport && (
            <TouchableOpacity
              style={[styles.actionButton, styles.exportActionButton]}
              onPress={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <ThemedText style={styles.actionButtonText}>Export Log</ThemedText>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: Colors.light.primary,
    borderRadius: 4,
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionTitleContainer: {
    flex: 1,
    gap: 6,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 4,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  infoSubvalue: {
    fontSize: 12,
    color: '#666',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailContent: {
    flex: 1,
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#000',
  },
  changeItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  changeField: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  changeComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  changeBeforeContainer: {
    flex: 1,
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    gap: 4,
  },
  changeAfterContainer: {
    flex: 1,
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    gap: 4,
  },
  changeLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  changeValue: {
    fontSize: 12,
    color: '#000',
    fontFamily: 'monospace',
  },
  metadataRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  metadataKey: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  metadataValue: {
    flex: 1,
    fontSize: 13,
    color: '#000',
  },
  relatedLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  relatedLogContent: {
    flex: 1,
    gap: 4,
  },
  relatedLogAction: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  relatedLogTime: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  exportActionButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
