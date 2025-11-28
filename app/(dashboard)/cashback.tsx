import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { cashbackService } from '@/services';
import { CashbackRequest, CashbackMetrics, CashbackStatus } from '@/types/api';

export default function CashbackScreen() {
  const [cashbackRequests, setCashbackRequests] = useState<CashbackRequest[]>([]);
  const [metrics, setMetrics] = useState<CashbackMetrics | null>(null);
  const [activeFilter, setActiveFilter] = useState<CashbackStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setIsLoading(true);

      console.log('🔄 Fetching cashback data...');

      // Fetch metrics and requests in parallel
      const [metricsData, requestsData] = await Promise.all([
        cashbackService.getMetrics(),
        cashbackService.getCashbackRequests({
          status: activeFilter !== 'all' ? activeFilter : undefined,
          limit: 50,
          page: 1,
          sortBy: 'created',
          sortOrder: 'desc'
        })
      ]);

      console.log('✅ Cashback data received:', { metricsData, requestsData });
      
      setMetrics(metricsData);
      setCashbackRequests(requestsData.requests || []);
    } catch (error) {
      console.error('❌ Error fetching cashback data:', error);
      Alert.alert('Error', 'Failed to load cashback data. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleQuickAction = useCallback(async (requestId: string, action: 'approve' | 'reject') => {
    try {
      console.log(`🔄 ${action}ing cashback request ${requestId}...`);
      
      if (action === 'approve') {
        const request = cashbackRequests.find(r => r.id === requestId);
        if (!request) {
          Alert.alert('Error', 'Request not found');
          return;
        }
        
        await cashbackService.approveCashbackRequest(requestId, {
          approvedAmount: request.requestedAmount
        });
      } else {
        await cashbackService.rejectCashbackRequest(requestId, {
          rejectionReason: 'Quick rejection via mobile app'
        });
      }

      console.log(`✅ Cashback request ${action}d successfully`);
      await fetchData();
      Alert.alert('Success', `Cashback request ${action}d successfully`);
    } catch (error) {
      console.error(`❌ Error ${action}ing request:`, error);
      Alert.alert('Error', `Failed to ${action} request. Please try again.`);
    }
  }, [cashbackRequests, fetchData]);

  const generateSampleData = useCallback(async () => {
    try {
      console.log('🎲 Generating sample cashback data...');
      await cashbackService.createSampleData();
      await fetchData();
      Alert.alert('Success', 'Sample cashback requests generated successfully');
    } catch (error) {
      console.error('❌ Error generating sample data:', error);
      Alert.alert('Error', 'Failed to generate sample data. Please try again.');
    }
  }, [fetchData]);

  const getStatusColor = (status: CashbackStatus) => {
    switch (status) {
      case 'pending': return Colors.light.warning;
      case 'approved': return Colors.light.success;
      case 'rejected': return Colors.light.error;
      case 'paid': return Colors.light.primary;
      default: return Colors.light.textSecondary;
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return Colors.light.error;
    if (riskScore >= 40) return Colors.light.warning;
    return Colors.light.success;
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
  const formatDate = (date: string | Date) => new Date(date).toLocaleDateString();

  const filteredRequests = activeFilter === 'all' 
    ? cashbackRequests 
    : cashbackRequests.filter(req => req.status === activeFilter);

  const statusTabs: Array<{ key: CashbackStatus | 'all'; label: string; count?: number }> = [
    { key: 'all', label: 'All', count: cashbackRequests.length },
    { key: 'pending', label: 'Pending', count: cashbackRequests.filter(r => r.status === 'pending').length },
    { key: 'approved', label: 'Approved', count: cashbackRequests.filter(r => r.status === 'approved').length },
    { key: 'paid', label: 'Paid', count: cashbackRequests.filter(r => r.status === 'paid').length },
    { key: 'rejected', label: 'Rejected', count: cashbackRequests.filter(r => r.status === 'rejected').length },
  ];

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ThemedText>Loading cashback data...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <ThemedView style={styles.content}>
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.title}>
              Cashback Management
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Review and manage customer cashback requests
            </ThemedText>
          </View>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(cashback)/analytics')}
          >
            <Ionicons name="analytics" size={20} color={Colors.light.background} />
          </TouchableOpacity>
        </View>

        {/* Metrics Cards */}
        {metrics && (
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <ThemedText style={styles.metricValue}>
                {metrics.totalPendingRequests}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>Pending</ThemedText>
            </View>
            <View style={styles.metricCard}>
              <ThemedText style={styles.metricValue}>
                {formatCurrency(metrics.totalPendingAmount)}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>Pending Amount</ThemedText>
            </View>
            <View style={styles.metricCard}>
              <ThemedText style={[styles.metricValue, { color: Colors.light.error }]}>
                {metrics.highRiskRequests}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>High Risk</ThemedText>
            </View>
            <View style={styles.metricCard}>
              <ThemedText style={[styles.metricValue, { color: Colors.light.success }]}>
                {metrics.autoApprovedToday}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>Auto Approved</ThemedText>
            </View>
          </View>
        )}

        {/* Status Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {statusTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeFilter === tab.key && styles.activeTab
              ]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeFilter === tab.key && styles.activeTabText
                ]}
              >
                {tab.label} {tab.count !== undefined && `(${tab.count})`}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={generateSampleData}>
            <Ionicons name="flask" size={16} color={Colors.light.primary} />
            <ThemedText style={styles.quickActionText}>Generate Sample Data</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('/(cashback)/bulk-actions')}
          >
            <Ionicons name="checkmark-done" size={16} color={Colors.light.primary} />
            <ThemedText style={styles.quickActionText}>Bulk Actions</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Cashback Requests List */}
        <View style={styles.requestsContainer}>
          {filteredRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cash" size={48} color={Colors.light.textSecondary} />
              <ThemedText style={styles.emptyStateText}>
                No cashback requests found
              </ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                {activeFilter === 'all' 
                  ? 'Generate sample data to get started' 
                  : `No ${activeFilter} requests found`}
              </ThemedText>
            </View>
          ) : (
            filteredRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => router.push(`/(cashback)/${request.id}`)}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.requestInfo}>
                    <ThemedText style={styles.requestNumber}>
                      #{request.requestNumber}
                    </ThemedText>
                    <View style={styles.statusBadge}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(request.status) }
                      ]} />
                      <ThemedText style={[
                        styles.statusText,
                        { color: getStatusColor(request.status) }
                      ]}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.requestAmount}>
                    {formatCurrency(request.requestedAmount)}
                  </ThemedText>
                </View>

                <View style={styles.requestDetails}>
                  <View style={styles.customerInfo}>
                    <ThemedText style={styles.customerName}>
                      {request.customer.name}
                    </ThemedText>
                    <ThemedText style={styles.orderNumber}>
                      Order: {request.order.orderNumber}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.requestDate}>
                    {formatDate(request.createdAt)}
                  </ThemedText>
                </View>

                <View style={styles.requestFooter}>
                  <View style={styles.riskIndicator}>
                    <View style={[
                      styles.riskDot,
                      { backgroundColor: getRiskColor(request.riskScore) }
                    ]} />
                    <ThemedText style={styles.riskText}>
                      Risk: {request.riskScore}/100
                    </ThemedText>
                    {request.flaggedForReview && (
                      <View style={styles.flaggedBadge}>
                        <Ionicons name="flag" size={12} color={Colors.light.error} />
                      </View>
                    )}
                  </View>

                  {request.status === 'pending' && (
                    <View style={styles.quickActionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => handleQuickAction(request.id, 'approve')}
                      >
                        <Ionicons name="checkmark" size={16} color={Colors.light.background} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleQuickAction(request.id, 'reject')}
                      >
                        <Ionicons name="close" size={16} color={Colors.light.background} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: Colors.light.primary,
    padding: 12,
    borderRadius: 8,
  },
  metricsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
  },
  activeTab: {
    backgroundColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  activeTabText: {
    color: Colors.light.background,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  requestsContainer: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  requestAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  requestDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  requestDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  riskText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  flaggedBadge: {
    marginLeft: 4,
  },
  quickActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 6,
  },
  approveBtn: {
    backgroundColor: Colors.light.success,
  },
  rejectBtn: {
    backgroundColor: Colors.light.error,
  },
});