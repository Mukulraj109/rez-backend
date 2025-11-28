import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { CashbackRequest } from '@/shared/types';
import { cashbackService } from '@/services';

export default function CashbackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<CashbackRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    fetchCashbackRequest();
  }, [id]);

  const fetchCashbackRequest = async () => {
    try {
      // Import API client for proper network calls
      const { cashbackService } = await import('@/services/api/cashback');
      const requestData = await cashbackService.getCashbackRequest(id);
      
      if (requestData) {
        setRequest(requestData);
        setCustomAmount(requestData.requestedAmount.toString());
      } else {
        Alert.alert('Error', 'Cashback request not found');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching cashback request:', error);
      Alert.alert('Error', 'Failed to load cashback request');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const approvedAmount = parseFloat(customAmount);
      if (isNaN(approvedAmount) || approvedAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      const updatedRequest = await cashbackService.approveCashbackRequest(id, {
        approvedAmount,
        notes: approvalNotes
      });
      
      setRequest(updatedRequest);
      setShowApprovalModal(false);
      Alert.alert('Success', 'Cashback request approved successfully');
    } catch (error: any) {
      console.error('Error approving cashback request:', error);
      Alert.alert('Error', error.message || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      const updatedRequest = await cashbackService.rejectCashbackRequest(id, {
        rejectionReason,
        notes: rejectionReason
      });
      
      setRequest(updatedRequest);
      setShowRejectionModal(false);
      Alert.alert('Success', 'Cashback request rejected');
    } catch (error: any) {
      console.error('Error rejecting cashback request:', error);
      Alert.alert('Error', error.message || 'Failed to reject request');
    }
  };

  const handleMarkAsPaid = async () => {
    Alert.alert(
      'Mark as Paid',
      'Mark this cashback as paid to the customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Mark Paid', 
          onPress: async () => {
            try {
              const updatedRequest = await cashbackService.markCashbackPaid(id, {
                paymentMethod: 'wallet',
                paymentReference: `AUTO-${Date.now()}`
              });
              
              setRequest(updatedRequest);
              Alert.alert('Success', 'Cashback marked as paid');
            } catch (error: any) {
              console.error('Error marking cashback as paid:', error);
              Alert.alert('Error', error.message || 'Failed to mark as paid');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
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
  const formatDate = (date: Date) => new Date(date).toLocaleString();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ThemedText>Loading cashback request...</ThemedText>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ThemedText>Cashback request not found</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.title}>
              #{request.requestNumber}
            </ThemedText>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(request.status) }]} />
              <ThemedText style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                {request.status.replace('_', ' ').toUpperCase()}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.amount}>
            {formatCurrency(request.requestedAmount)}
          </ThemedText>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Customer Information</ThemedText>
          <View style={styles.card}>
            <View style={styles.customerHeader}>
              <View style={styles.customerInfo}>
                <ThemedText style={styles.customerName}>{request.customer.name}</ThemedText>
                <ThemedText style={styles.customerEmail}>{request.customer.email}</ThemedText>
                <ThemedText style={styles.customerPhone}>{request.customer.phone}</ThemedText>
              </View>
              <View style={styles.customerStats}>
                <ThemedText style={styles.statValue}>
                  {formatCurrency((request.customer as any)?.totalCashbackEarned || 0)}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Total Earned</ThemedText>
              </View>
            </View>
            <View style={styles.customerDetails}>
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Account Age</ThemedText>
                <ThemedText style={styles.detailValue}>{(request.customer as any)?.accountAge || 'N/A'} days</ThemedText>
              </View>
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Verification</ThemedText>
                <ThemedText style={[
                  styles.detailValue,
                  { color: (request.customer as any)?.verificationStatus === 'verified' ? Colors.light.success : Colors.light.warning }
                ]}>
                  {(request.customer as any)?.verificationStatus || 'unverified'}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Order Information */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Order Information</ThemedText>
          <View style={styles.card}>
            <View style={styles.orderHeader}>
              <ThemedText style={styles.orderNumber}>
                Order #{request.order.orderNumber}
              </ThemedText>
              <ThemedText style={styles.orderAmount}>
                {formatCurrency(request.order.totalAmount)}
              </ThemedText>
            </View>
            <ThemedText style={styles.orderDate}>
              {formatDate(request.order.orderDate)}
            </ThemedText>
            <View style={styles.orderItems}>
              {((request.order as any)?.items || []).map((item: any, index: number) => (
                <View key={index} style={styles.orderItem}>
                  <View style={styles.itemInfo}>
                    <ThemedText style={styles.itemName}>{item.productName}</ThemedText>
                    <ThemedText style={styles.itemPrice}>
                      {item.quantity}x {formatCurrency(item.price)}
                    </ThemedText>
                  </View>
                  {item?.cashbackEligible && (
                    <View style={styles.eligibleBadge}>
                      <ThemedText style={styles.eligibleText}>Eligible</ThemedText>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Risk Assessment */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Risk Assessment</ThemedText>
          <View style={styles.card}>
            <View style={styles.riskHeader}>
              <View style={styles.riskScore}>
                <ThemedText style={[styles.riskValue, { color: getRiskColor(request.riskScore) }]}>
                  {request.riskScore}/100
                </ThemedText>
                <ThemedText style={styles.riskLabel}>Risk Score</ThemedText>
              </View>
              {request.flaggedForReview && (
                <View style={styles.flaggedBadge}>
                  <Ionicons name="flag" size={16} color={Colors.light.error} />
                  <ThemedText style={styles.flaggedText}>Flagged for Review</ThemedText>
                </View>
              )}
            </View>
            {(request as any)?.riskFactors?.length > 0 && (
              <View style={styles.riskFactors}>
                {((request as any)?.riskFactors || []).map((factor: any, index: number) => (
                  <View key={index} style={styles.riskFactor}>
                    <View style={[
                      styles.factorDot,
                      { backgroundColor: factor.severity === 'high' ? Colors.light.error : 
                                       factor.severity === 'medium' ? Colors.light.warning : Colors.light.success }
                    ]} />
                    <View style={styles.factorInfo}>
                      <ThemedText style={styles.factorDescription}>{factor.description}</ThemedText>
                      <ThemedText style={styles.factorValue}>
                        {factor.type} • {factor.severity} • {factor.value}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Cashback Calculation */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Cashback Calculation</ThemedText>
          <View style={styles.card}>
            <View style={styles.calculationHeader}>
              <ThemedText style={styles.calculationRate}>
                {(request as any)?.cashbackRate || 0}% Rate
              </ThemedText>
              {request.approvedAmount && request.approvedAmount !== request.requestedAmount && (
                <ThemedText style={styles.adjustedAmount}>
                  Adjusted to {formatCurrency(request.approvedAmount)}
                </ThemedText>
              )}
            </View>
            {((request as any)?.calculationBreakdown || []).map((calc: any, index: number) => (
              <View key={index} style={styles.calculationItem}>
                <View style={styles.calcInfo}>
                  <ThemedText style={styles.calcProduct}>{calc.productName}</ThemedText>
                  <ThemedText style={styles.calcDetails}>
                    {calc.quantity}x {formatCurrency(calc.productPrice)} @ {calc.cashbackRate}%
                  </ThemedText>
                </View>
                <ThemedText style={styles.calcAmount}>
                  {formatCurrency(calc.cashbackAmount)}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Processing Information */}
        {(request.reviewedBy || request.reviewedAt) && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Processing Information</ThemedText>
            <View style={styles.card}>
              {request.reviewedBy && (
                <View style={styles.processingItem}>
                  <ThemedText style={styles.processingLabel}>Reviewed By</ThemedText>
                  <ThemedText style={styles.processingValue}>{request.reviewedBy}</ThemedText>
                </View>
              )}
              {request.reviewedAt && (
                <View style={styles.processingItem}>
                  <ThemedText style={styles.processingLabel}>Reviewed At</ThemedText>
                  <ThemedText style={styles.processingValue}>{formatDate(request.reviewedAt)}</ThemedText>
                </View>
              )}
              {request.approvalNotes && (
                <View style={styles.processingItem}>
                  <ThemedText style={styles.processingLabel}>Notes</ThemedText>
                  <ThemedText style={styles.processingValue}>{request.approvalNotes}</ThemedText>
                </View>
              )}
              {request.rejectionReason && (
                <View style={styles.processingItem}>
                  <ThemedText style={styles.processingLabel}>Rejection Reason</ThemedText>
                  <ThemedText style={[styles.processingValue, { color: Colors.light.error }]}>
                    {request.rejectionReason}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {request.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => setShowApprovalModal(true)}
            >
              <Ionicons name="checkmark" size={20} color={Colors.light.background} />
              <ThemedText style={styles.actionButtonText}>Approve</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => setShowRejectionModal(true)}
            >
              <Ionicons name="close" size={20} color={Colors.light.background} />
              <ThemedText style={styles.actionButtonText}>Reject</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {request.status === 'approved' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.paidButton]}
              onPress={handleMarkAsPaid}
            >
              <Ionicons name="card" size={20} color={Colors.light.background} />
              <ThemedText style={styles.actionButtonText}>Mark as Paid</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ThemedView>

      {/* Approval Modal */}
      <Modal
        visible={showApprovalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApprovalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Approve Cashback Request</ThemedText>
              <TouchableOpacity onPress={() => setShowApprovalModal(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Approved Amount</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  placeholder="Enter amount"
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Notes (Optional)</ThemedText>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={approvalNotes}
                  onChangeText={setApprovalNotes}
                  placeholder="Add approval notes..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowApprovalModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.approveButton]}
                onPress={handleApprove}
              >
                <ThemedText style={styles.approveButtonText}>Approve</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        visible={showRejectionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Reject Cashback Request</ThemedText>
              <TouchableOpacity onPress={() => setShowRejectionModal(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Rejection Reason *</ThemedText>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  placeholder="Explain why this request is being rejected..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRejectionModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectButton]}
                onPress={handleReject}
              >
                <ThemedText style={styles.rejectButtonText}>Reject</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  customerStats: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.success,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  customerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  orderDate: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  orderItems: {
    gap: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  eligibleBadge: {
    backgroundColor: Colors.light.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eligibleText: {
    fontSize: 10,
    color: Colors.light.background,
    fontWeight: '600',
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  riskScore: {
    alignItems: 'center',
  },
  riskValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  riskLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  flaggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  flaggedText: {
    fontSize: 12,
    color: Colors.light.background,
    fontWeight: '600',
  },
  riskFactors: {
    gap: 12,
  },
  riskFactor: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  factorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  factorInfo: {
    flex: 1,
  },
  factorDescription: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 2,
  },
  factorValue: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  calculationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calculationRate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  adjustedAmount: {
    fontSize: 14,
    color: Colors.light.warning,
    fontWeight: '500',
  },
  calculationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  calcInfo: {
    flex: 1,
  },
  calcProduct: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  calcDetails: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  calcAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.success,
  },
  processingItem: {
    marginBottom: 12,
  },
  processingLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  processingValue: {
    fontSize: 14,
    color: Colors.light.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
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
  paidButton: {
    backgroundColor: Colors.light.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
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
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '500',
  },
  approveButton: {
    backgroundColor: Colors.light.success,
  },
  approveButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: Colors.light.error,
  },
  rejectButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
});