import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { CashbackRequest, CashbackStatus } from '@/shared/types';

export default function BulkActionsScreen() {
  const [cashbackRequests, setCashbackRequests] = useState<CashbackRequest[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<CashbackStatus | 'all'>('pending');
  const [bulkNotes, setBulkNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchCashbackRequests();
  }, [filterStatus]);

  const fetchCashbackRequests = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.set('status', filterStatus);
      }
      params.set('limit', '100');

      const response = await fetch(`/api/cashback?${params}`);
      const data = await response.json();
      if (data.success) {
        setCashbackRequests(data.data.requests);
      }
    } catch (error) {
      console.error('Error fetching cashback requests:', error);
      Alert.alert('Error', 'Failed to load cashback requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedRequests.size === cashbackRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(cashbackRequests.map(req => req.id)));
    }
  };

  const handleSelectRequest = (requestId: string) => {
    const newSelection = new Set(selectedRequests);
    if (newSelection.has(requestId)) {
      newSelection.delete(requestId);
    } else {
      newSelection.add(requestId);
    }
    setSelectedRequests(newSelection);
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedRequests.size === 0) {
      Alert.alert('Error', 'Please select at least one request');
      return;
    }

    if (action === 'reject' && !rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }

    const actionText = action === 'approve' ? 'approve' : 'reject';
    const confirmMessage = `Are you sure you want to ${actionText} ${selectedRequests.size} cashback request(s)?`;

    Alert.alert(
      'Confirm Bulk Action',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              setIsProcessing(true);
              
              const requestBody = {
                requestIds: Array.from(selectedRequests),
                action,
                notes: bulkNotes || undefined,
                rejectionReason: action === 'reject' ? rejectionReason : undefined
              };

              const response = await fetch('/api/cashback/bulk-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
              });

              const data = await response.json();
              if (data.success) {
                const { summary } = data.data;
                Alert.alert(
                  'Bulk Action Complete',
                  `Successfully ${actionText}d ${summary.successful} request(s). ${summary.failed} failed.`,
                  [{ text: 'OK', onPress: () => {
                    setSelectedRequests(new Set());
                    setBulkNotes('');
                    setRejectionReason('');
                    fetchCashbackRequests();
                  }}]
                );
              } else {
                Alert.alert('Error', data.message || `Failed to ${actionText} requests`);
              }
            } catch (error) {
              Alert.alert('Error', `Failed to ${actionText} requests`);
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

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
  const formatDate = (date: Date) => new Date(date).toLocaleDateString();

  const statusOptions: Array<{ key: CashbackStatus | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'paid', label: 'Paid' },
  ];

  const canApprove = selectedRequests.size > 0 && 
    Array.from(selectedRequests).every(id => {
      const request = cashbackRequests.find(r => r.id === id);
      return request?.status === 'pending';
    });

  const canReject = selectedRequests.size > 0 && 
    Array.from(selectedRequests).every(id => {
      const request = cashbackRequests.find(r => r.id === id);
      return request?.status === 'pending';
    });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ThemedText>Loading cashback requests...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Bulk Actions
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Select multiple requests to approve or reject
          </ThemedText>
        </View>

        {/* Status Filter */}
        <View style={styles.filterContainer}>
          <ThemedText style={styles.filterLabel}>Filter by Status:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterTab,
                  filterStatus === option.key && styles.activeFilterTab
                ]}
                onPress={() => setFilterStatus(option.key)}
              >
                <ThemedText
                  style={[
                    styles.filterTabText,
                    filterStatus === option.key && styles.activeFilterTabText
                  ]}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Selection Controls */}
        <View style={styles.selectionControls}>
          <TouchableOpacity style={styles.selectAllButton} onPress={handleSelectAll}>
            <Ionicons 
              name={selectedRequests.size === cashbackRequests.length ? "checkbox" : "square-outline"} 
              size={20} 
              color={Colors.light.primary} 
            />
            <ThemedText style={styles.selectAllText}>
              {selectedRequests.size === cashbackRequests.length ? 'Deselect All' : 'Select All'}
            </ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.selectionCount}>
            {selectedRequests.size} selected
          </ThemedText>
        </View>

        {/* Action Forms */}
        {selectedRequests.size > 0 && (
          <View style={styles.actionForms}>
            {/* Bulk Notes */}
            <View style={styles.formSection}>
              <ThemedText style={styles.formLabel}>Notes (Optional)</ThemedText>
              <TextInput
                style={styles.textInput}
                value={bulkNotes}
                onChangeText={setBulkNotes}
                placeholder="Add notes for selected requests..."
                placeholderTextColor={Colors.light.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Rejection Reason (for bulk reject) */}
            <View style={styles.formSection}>
              <ThemedText style={styles.formLabel}>Rejection Reason (Required for Reject)</ThemedText>
              <TextInput
                style={styles.textInput}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="Reason for rejection..."
                placeholderTextColor={Colors.light.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton, !canApprove && styles.disabledButton]}
                onPress={() => handleBulkAction('approve')}
                disabled={!canApprove || isProcessing}
              >
                <Ionicons name="checkmark" size={20} color={Colors.light.background} />
                <ThemedText style={styles.actionButtonText}>
                  Approve {selectedRequests.size}
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton, !canReject && styles.disabledButton]}
                onPress={() => handleBulkAction('reject')}
                disabled={!canReject || isProcessing}
              >
                <Ionicons name="close" size={20} color={Colors.light.background} />
                <ThemedText style={styles.actionButtonText}>
                  Reject {selectedRequests.size}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Request List */}
        <View style={styles.requestsContainer}>
          {cashbackRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cash" size={48} color={Colors.light.textSecondary} />
              <ThemedText style={styles.emptyStateText}>
                No requests found
              </ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                Try changing the filter or generate sample data
              </ThemedText>
            </View>
          ) : (
            cashbackRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={[
                  styles.requestCard,
                  selectedRequests.has(request.id) && styles.selectedCard
                ]}
                onPress={() => handleSelectRequest(request.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.checkbox}>
                    <Ionicons 
                      name={selectedRequests.has(request.id) ? "checkbox" : "square-outline"} 
                      size={20} 
                      color={selectedRequests.has(request.id) ? Colors.light.primary : Colors.light.textSecondary} 
                    />
                  </View>
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

                <View style={styles.cardContent}>
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

                <View style={styles.cardFooter}>
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
                  
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => router.push(`/(cashback)/${request.id}`)}
                  >
                    <Ionicons name="eye" size={16} color={Colors.light.primary} />
                  </TouchableOpacity>
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
  filterContainer: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  filterTabs: {
    flexDirection: 'row',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
  },
  activeFilterTab: {
    backgroundColor: Colors.light.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  activeFilterTabText: {
    color: Colors.light.background,
    fontWeight: '600',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.primary,
  },
  selectionCount: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  actionForms: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundSecondary,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  approveButton: {
    backgroundColor: Colors.light.success,
  },
  rejectButton: {
    backgroundColor: Colors.light.error,
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
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
  selectedCard: {
    borderColor: Colors.light.primary,
    backgroundColor: `${Colors.light.primary}10`,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  checkbox: {
    paddingTop: 2,
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
  cardContent: {
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
  cardFooter: {
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
  detailsButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: Colors.light.backgroundSecondary,
  },
});