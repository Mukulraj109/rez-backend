/**
 * Audit Log List Screen
 * Displays paginated list of audit logs with filtering, search, and stats
 * Permissions required: logs:view
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissions';
import { useAuditLogs, useAuditStatistics, useExportAuditLogs, useFormatAuditLog } from '@/hooks/queries/useAudit';
import { AuditLog, AuditLogFilters, AuditSeverity, AuditAction, AuditResourceType } from '@/types/audit';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AuditLogListScreen() {
  const { user } = useAuth();
  const formatLog = useFormatAuditLog();

  // Permission check
  const canView = user?.role ? hasPermission(user.role as any, 'logs:view') : false;
  const canExport = user?.role ? hasPermission(user.role as any, 'logs:export') : false;

  // State
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });
  const [showStatsCards, setShowStatsCards] = useState(true);

  // Queries
  const {
    data: logsData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAuditLogs(filters, {
    enabled: canView,
  });

  const {
    data: statsData,
    isLoading: statsLoading,
  } = useAuditStatistics(undefined, undefined, {
    enabled: canView && showStatsCards,
  });

  const {
    refetch: exportLogs,
    isFetching: isExporting,
  } = useExportAuditLogs(
    { format: 'csv', ...filters },
    {
      enabled: false,
    }
  );

  // Handlers
  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    setFilters(prev => ({
      ...prev,
      search: text.trim() || undefined,
      page: 1,
    }));
  }, []);

  const handleFilterPress = useCallback(() => {
    router.push('/audit/filters');
  }, []);

  const handleLogPress = useCallback((log: AuditLog) => {
    router.push(`/audit/${log.id}`);
  }, []);

  const handleExport = useCallback(async () => {
    if (!canExport) {
      Alert.alert('Permission Denied', 'You do not have permission to export audit logs.');
      return;
    }

    Alert.alert(
      'Export Audit Logs',
      'This will export all filtered audit logs to a CSV file. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              const result = await exportLogs();
              if (result.data?.downloadUrl) {
                Alert.alert('Success', 'Audit logs exported successfully. Download will begin shortly.');
                // In a real app, trigger download here
              }
            } catch (err: any) {
              Alert.alert('Export Failed', err.message || 'Failed to export audit logs');
            }
          },
        },
      ]
    );
  }, [canExport, exportLogs]);

  const handleSortChange = useCallback((sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: sortBy as any,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  }, []);

  const handlePageChange = useCallback((direction: 'next' | 'prev') => {
    setFilters(prev => ({
      ...prev,
      page: direction === 'next' ? (prev.page || 1) + 1 : Math.max((prev.page || 1) - 1, 1),
    }));
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    if (!statsData) return null;

    const totalToday = statsData.activityTrend?.find(
      (t: any) => new Date(t.date).toDateString() === new Date().toDateString()
    )?.count || 0;

    const criticalCount = statsData.logsBySeverity?.critical || 0;
    const uniqueUsers = statsData.logsByUser?.length || 0;
    const mostActiveResource = statsData.topChangedResources?.[0];

    return {
      totalToday,
      criticalCount,
      uniqueUsers,
      mostActiveResource: mostActiveResource?.resourceType || 'N/A',
    };
  }, [statsData]);

  // Render functions
  const renderStatsCards = () => {
    if (!showStatsCards || statsLoading || !stats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardBlue]}>
            <Ionicons name="calendar-outline" size={24} color="#3b82f6" />
            <ThemedText style={styles.statValue}>{stats.totalToday}</ThemedText>
            <ThemedText style={styles.statLabel}>Logs Today</ThemedText>
          </View>

          <View style={[styles.statCard, styles.statCardRed]}>
            <Ionicons name="alert-circle-outline" size={24} color="#ef4444" />
            <ThemedText style={styles.statValue}>{stats.criticalCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Critical Events</ThemedText>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Ionicons name="people-outline" size={24} color="#10b981" />
            <ThemedText style={styles.statValue}>{stats.uniqueUsers}</ThemedText>
            <ThemedText style={styles.statLabel}>Unique Users</ThemedText>
          </View>

          <View style={[styles.statCard, styles.statCardPurple]}>
            <Ionicons name="cube-outline" size={24} color="#8b5cf6" />
            <ThemedText style={styles.statValue}>{stats.mostActiveResource}</ThemedText>
            <ThemedText style={styles.statLabel}>Most Active</ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by user, action, resource..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.filterButton} onPress={handleFilterPress}>
        <Ionicons name="filter-outline" size={20} color="#fff" />
      </TouchableOpacity>

      {canExport && (
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="download-outline" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSortBar = () => (
    <View style={styles.sortBar}>
      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => handleSortChange('timestamp')}
      >
        <ThemedText style={styles.sortButtonText}>Date</ThemedText>
        {filters.sortBy === 'timestamp' && (
          <Ionicons
            name={filters.sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'}
            size={16}
            color={Colors.light.primary}
          />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => handleSortChange('action')}
      >
        <ThemedText style={styles.sortButtonText}>Action</ThemedText>
        {filters.sortBy === 'action' && (
          <Ionicons
            name={filters.sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'}
            size={16}
            color={Colors.light.primary}
          />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => handleSortChange('severity')}
      >
        <ThemedText style={styles.sortButtonText}>Severity</ThemedText>
        {filters.sortBy === 'severity' && (
          <Ionicons
            name={filters.sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'}
            size={16}
            color={Colors.light.primary}
          />
        )}
      </TouchableOpacity>
    </View>
  );

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

  const renderLogItem = ({ item }: { item: AuditLog }) => {
    const formatted = formatLog(item);
    const severityColor = getSeverityColor(item.severity);
    const severityIcon = getSeverityIcon(item.severity);

    return (
      <TouchableOpacity
        style={styles.logItem}
        onPress={() => handleLogPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.severityIndicator, { backgroundColor: severityColor }]} />

        <View style={styles.logContent}>
          <View style={styles.logHeader}>
            <View style={styles.logTitleRow}>
              <Ionicons
                name={severityIcon as any}
                size={18}
                color={severityColor}
                style={styles.severityIconStyle}
              />
              <ThemedText style={styles.logAction}>{formatted.displayAction}</ThemedText>
            </View>
            <ThemedText style={styles.logTime}>{formatted.displayTime}</ThemedText>
          </View>

          <View style={styles.logDetails}>
            <View style={styles.logDetailRow}>
              <Ionicons name="cube-outline" size={14} color="#666" />
              <ThemedText style={styles.logDetailText}>
                {formatted.displayResource}
                {item.resourceId && ` #${item.resourceId.substring(0, 8)}`}
              </ThemedText>
            </View>

            {item.user && (
              <View style={styles.logDetailRow}>
                <Ionicons name="person-outline" size={14} color="#666" />
                <ThemedText style={styles.logDetailText}>
                  {item.user.name || item.user.email}
                </ThemedText>
              </View>
            )}

            {item.ipAddress && (
              <View style={styles.logDetailRow}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <ThemedText style={styles.logDetailText}>{item.ipAddress}</ThemedText>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#ccc" />
      <ThemedText style={styles.emptyText}>No audit logs found</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        {search ? 'Try adjusting your search or filters' : 'No activity has been logged yet'}
      </ThemedText>
    </View>
  );

  const renderFooter = () => {
    if (!logsData?.pagination) return null;

    const { page, totalPages, hasNext, hasPrev } = logsData.pagination;

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.paginationButton, !hasPrev && styles.paginationButtonDisabled]}
          onPress={() => handlePageChange('prev')}
          disabled={!hasPrev || isFetching}
        >
          <Ionicons name="chevron-back" size={20} color={!hasPrev ? '#ccc' : '#fff'} />
          <ThemedText style={[styles.paginationButtonText, !hasPrev && styles.paginationButtonTextDisabled]}>
            Previous
          </ThemedText>
        </TouchableOpacity>

        <ThemedText style={styles.paginationText}>
          Page {page} of {totalPages}
        </ThemedText>

        <TouchableOpacity
          style={[styles.paginationButton, !hasNext && styles.paginationButtonDisabled]}
          onPress={() => handlePageChange('next')}
          disabled={!hasNext || isFetching}
        >
          <ThemedText style={[styles.paginationButtonText, !hasNext && styles.paginationButtonTextDisabled]}>
            Next
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={!hasNext ? '#ccc' : '#fff'} />
        </TouchableOpacity>
      </View>
    );
  };

  // Permission denied screen
  if (!canView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionDenied}>
          <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
          <ThemedText style={styles.permissionDeniedText}>
            You don't have permission to view audit logs
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <ThemedText style={styles.errorText}>Failed to load audit logs</ThemedText>
          <ThemedText style={styles.errorSubtext}>
            {error?.message || 'An unexpected error occurred'}
          </ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {renderSearchBar()}
        {renderStatsCards()}
        {renderSortBar()}

        <FlatList
          data={logsData?.logs || []}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={Colors.light.primary}
            />
          }
          ListEmptyComponent={isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
              <ThemedText style={styles.loadingText}>Loading audit logs...</ThemedText>
            </View>
          ) : renderEmpty()}
          ListFooterComponent={renderFooter()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#000',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  statCardBlue: {
    backgroundColor: '#eff6ff',
  },
  statCardRed: {
    backgroundColor: '#fef2f2',
  },
  statCardGreen: {
    backgroundColor: '#f0fdf4',
  },
  statCardPurple: {
    backgroundColor: '#faf5ff',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  sortBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    gap: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  logItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  severityIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
  logContent: {
    flex: 1,
    marginLeft: 8,
    gap: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  severityIconStyle: {
    marginTop: 2,
  },
  logAction: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  logTime: {
    fontSize: 12,
    color: '#999',
  },
  logDetails: {
    gap: 4,
  },
  logDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logDetailText: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    color: '#ef4444',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  permissionDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  permissionDeniedText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.primary,
    borderRadius: 6,
  },
  paginationButtonDisabled: {
    backgroundColor: '#e5e5e5',
  },
  paginationButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  paginationButtonTextDisabled: {
    color: '#ccc',
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
});
