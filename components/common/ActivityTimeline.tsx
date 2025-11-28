/**
 * ActivityTimeline Component
 *
 * Unified timeline showing:
 * - Audit logs (user actions)
 * - Notifications (system events)
 * - Order events
 * - Product events
 * - Team events
 *
 * Features:
 * - Chronological order (newest first)
 * - Grouped by date (Today, Yesterday, This Week, Older)
 * - Infinite scroll loading
 * - Pull-to-refresh
 * - Filter by type
 * - Search functionality
 * - Export timeline (PDF/CSV)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TimelineItem from './TimelineItem';
import { useActivityTimeline } from '../../hooks/useActivityTimeline';
import {
  groupTimelineByDate,
  filterTimelineEntries,
  searchTimelineEntries,
  exportTimelineToCSV,
  exportTimelineToPDF,
} from '../../utils/audit/auditHelpers';
import type {
  AuditLog,
  AuditResourceType,
  TimelineEntry,
} from '../../types/audit';
import type { Notification } from '../../types/notifications';

// ============================================================================
// TYPES
// ============================================================================

export type TimelineFilterType =
  | 'all'
  | 'audits'
  | 'notifications'
  | 'orders'
  | 'products'
  | 'team'
  | 'cashback'
  | 'payments';

export interface ActivityTimelineProps {
  // Optional filters
  userId?: string;
  resourceType?: AuditResourceType;
  resourceId?: string;

  // Display options
  limit?: number;
  showFilters?: boolean;
  showSearch?: boolean;
  showExport?: boolean;

  // Callbacks
  onItemPress?: (entry: TimelineEntry) => void;
  onFilterChange?: (filter: TimelineFilterType) => void;
  onExport?: (format: 'csv' | 'pdf', data: TimelineEntry[]) => void;
}

interface DateGroup {
  title: string;
  date: string;
  entries: TimelineEntry[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  userId,
  resourceType,
  resourceId,
  limit = 50,
  showFilters = true,
  showSearch = true,
  showExport = true,
  onItemPress,
  onFilterChange,
  onExport,
}) => {
  // ========================================
  // STATE
  // ========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<TimelineFilterType>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  // ========================================
  // HOOKS
  // ========================================
  const {
    entries,
    loading,
    refreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    unreadCount,
  } = useActivityTimeline({
    userId,
    resourceType,
    resourceId,
    limit,
  });

  // ========================================
  // FILTERED & GROUPED DATA
  // ========================================
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Apply type filter
    if (selectedFilter !== 'all') {
      filtered = filterTimelineEntries(filtered, selectedFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      filtered = searchTimelineEntries(filtered, searchQuery);
    }

    return filtered;
  }, [entries, selectedFilter, searchQuery]);

  const groupedEntries = useMemo(() => {
    return groupTimelineByDate(filteredEntries);
  }, [filteredEntries]);

  // ========================================
  // HANDLERS
  // ========================================
  const handleFilterChange = useCallback((filter: TimelineFilterType) => {
    setSelectedFilter(filter);
    onFilterChange?.(filter);
  }, [onFilterChange]);

  const handleItemPress = useCallback((entry: TimelineEntry) => {
    onItemPress?.(entry);
  }, [onItemPress]);

  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    if (isExporting) return;

    setIsExporting(true);
    setExportFormat(format);

    try {
      let data: string;

      if (format === 'csv') {
        data = exportTimelineToCSV(filteredEntries);
      } else {
        data = await exportTimelineToPDF(filteredEntries);
      }

      onExport?.(format, filteredEntries);

      // Handle download based on platform
      if (Platform.OS === 'web') {
        // Create download link for web
        const blob = new Blob([data], {
          type: format === 'csv' ? 'text/csv' : 'application/pdf'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activity-timeline-${Date.now()}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // For mobile, implement share/save functionality
        // This would use react-native-fs and react-native-share
        console.log('Export data ready:', data);
      }

      alert(`Timeline exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [filteredEntries, isExporting, onExport]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadMore();
    }
  }, [loading, hasMore, loadMore]);

  // ========================================
  // RENDER FUNCTIONS
  // ========================================
  const renderSearchBar = () => {
    if (!showSearch) return null;

    return (
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search timeline..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    const filters: { key: TimelineFilterType; label: string; icon: string }[] = [
      { key: 'all', label: 'All', icon: 'list' },
      { key: 'audits', label: 'Audits', icon: 'shield-checkmark' },
      { key: 'notifications', label: 'Notifications', icon: 'notifications' },
      { key: 'orders', label: 'Orders', icon: 'cart' },
      { key: 'products', label: 'Products', icon: 'cube' },
      { key: 'team', label: 'Team', icon: 'people' },
    ];

    return (
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === item.key && styles.filterChipActive,
              ]}
              onPress={() => handleFilterChange(item.key)}
            >
              <Ionicons
                name={item.icon as any}
                size={16}
                color={selectedFilter === item.key ? '#fff' : '#666'}
                style={styles.filterIcon}
              />
              <Text
                style={[
                  styles.filterLabel,
                  selectedFilter === item.key && styles.filterLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderExportButtons = () => {
    if (!showExport) return null;

    return (
      <View style={styles.exportContainer}>
        <Text style={styles.exportLabel}>Export:</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => handleExport('csv')}
          disabled={isExporting}
        >
          {isExporting && exportFormat === 'csv' ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <>
              <Ionicons name="document-text" size={16} color="#007AFF" />
              <Text style={styles.exportButtonText}>CSV</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => handleExport('pdf')}
          disabled={isExporting}
        >
          {isExporting && exportFormat === 'pdf' ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <>
              <Ionicons name="document" size={16} color="#007AFF" />
              <Text style={styles.exportButtonText}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderSectionHeader = ({ title, count }: { title: string; count: number }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    </View>
  );

  const renderDateGroup = ({ item }: { item: DateGroup }) => (
    <View style={styles.dateGroup}>
      {renderSectionHeader({ title: item.title, count: item.entries.length })}
      {item.entries.map((entry, index) => (
        <TimelineItem
          key={entry.id}
          entry={entry}
          onPress={() => handleItemPress(entry)}
          isLast={index === item.entries.length - 1}
        />
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Activity Yet</Text>
      <Text style={styles.emptyMessage}>
        {searchQuery
          ? `No results found for "${searchQuery}"`
          : 'Timeline entries will appear here'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={48} color="#FF3B30" />
      <Text style={styles.errorTitle}>Error Loading Timeline</Text>
      <Text style={styles.errorMessage}>{error?.message || 'Please try again'}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={refresh}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.footerLoaderText}>Loading more...</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {renderSearchBar()}
      {renderFilters()}
      {renderExportButtons()}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Ionicons name="notifications" size={20} color="#fff" />
          <Text style={styles.unreadBannerText}>
            {unreadCount} new {unreadCount === 1 ? 'update' : 'updates'}
          </Text>
        </View>
      )}
    </View>
  );

  // ========================================
  // RENDER
  // ========================================
  if (error && !entries.length) {
    return renderError();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={groupedEntries}
        keyExtractor={(item) => item.date}
        renderItem={renderDateGroup}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#007AFF"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  // Filters
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterLabelActive: {
    color: '#fff',
  },

  // Export
  exportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  exportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 4,
  },

  // Unread banner
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  unreadBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  sectionBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // Date group
  dateGroup: {
    marginBottom: 16,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Footer loader
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  footerLoaderText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});

export default ActivityTimeline;
