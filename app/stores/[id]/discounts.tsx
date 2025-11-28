import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { discountsService, MerchantDiscount } from '@/services/api/discounts';
import { useStore } from '@/contexts/StoreContext';
import ConfirmModal from '@/components/common/ConfirmModal';

// Safe back navigation - goes to store details if no history
const useSafeBack = (storeId: string) => {
  const router = useRouter();
  const navigation = useNavigation();

  return () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      // Fallback to store details page
      router.replace(`/stores/${storeId}/details`);
    }
  };
};

export default function StoreDiscountsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.id as string;
  const paymentMethod = (params.paymentMethod as 'upi' | 'card' | 'all') || 'upi'; // Default to UPI
  const { stores } = useStore();
  const store = stores.find(s => s._id === storeId);
  const handleBack = useSafeBack(storeId);

  const [discounts, setDiscounts] = useState<MerchantDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'default' | 'danger' | 'warning';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'default',
    onConfirm: () => {},
  });
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'default' | 'danger' | 'warning';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'default',
  });

  // Reload discounts when screen comes into focus (after creating/editing)
  useFocusEffect(
    useCallback(() => {
      loadDiscounts();
    }, [storeId, paymentMethod])
  );

  const loadDiscounts = async () => {
    try {
      setLoading(true);
      setError(null);
      // Only filter by applicableOn since that's the required field in backend
      // bill_payment = UPI discounts, card_payment = Card discounts
      const response = await discountsService.getDiscounts({
        storeId: storeId,
        scope: 'store',
        applicableOn: paymentMethod === 'card' ? 'card_payment' : 'bill_payment',
      });
      if (response.success && response.data) {
        setDiscounts(response.data.discounts || []);
      } else {
        setError(response.message || 'Failed to load discounts');
      }
    } catch (err: any) {
      console.error('Error loading discounts:', err);
      setError(err.message || 'Failed to load discounts');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDiscounts();
    setRefreshing(false);
  };

  const handleAddDiscount = () => {
    router.push({
      pathname: '/stores/[id]/discounts/add',
      params: { id: storeId, paymentMethod: paymentMethod }
    } as any);
  };

  const handleEditDiscount = (discountId: string) => {
    router.push({
      pathname: '/stores/[id]/discounts/[discountId]',
      params: { id: storeId, discountId }
    } as any);
  };

  const handleDeleteDiscount = async (discountId: string) => {
    setConfirmModal({
      visible: true,
      title: 'Delete Discount',
      message: 'Are you sure you want to delete this discount? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, visible: false });
        try {
          const response = await discountsService.deleteDiscount(discountId);
          if (response.success) {
            setAlertModal({
              visible: true,
              title: 'Success',
              message: 'Discount deleted successfully',
              type: 'default',
            });
            loadDiscounts();
          } else {
            setAlertModal({
              visible: true,
              title: 'Error',
              message: response.message || 'Failed to delete discount',
              type: 'danger',
            });
          }
        } catch (err: any) {
          setAlertModal({
            visible: true,
            title: 'Error',
            message: err.message || 'Failed to delete discount',
            type: 'danger',
          });
        }
      },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDiscountValue = (discount: MerchantDiscount) => {
    if (discount.type === 'percentage') {
      return `${discount.value}%`;
    }
    return `₹${discount.value}`;
  };

  const isCurrentlyValid = (discount: MerchantDiscount) => {
    const now = new Date();
    const validFrom = new Date(discount.validFrom);
    const validUntil = new Date(discount.validUntil);
    return discount.isActive && now >= validFrom && now <= validUntil;
  };

  // Dynamic title and text based on payment method
  const isCardMode = paymentMethod === 'card';
  const pageTitle = isCardMode ? 'Card Offers' : 'UPI Payment Discounts';
  const pageSubtext = isCardMode
    ? 'Manage card payment offers for this store'
    : 'Manage UPI payment discounts for this store';
  const emptyTitle = isCardMode ? 'No Card Offers' : 'No Discounts';
  const emptyText = isCardMode
    ? 'Create card payment offers to attract customers who prefer paying with credit or debit cards.'
    : 'Create UPI payment discounts to attract more customers and increase sales.';
  const createButtonText = isCardMode ? 'Create Your First Card Offer' : 'Create Your First Discount';

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading {isCardMode ? 'card offers' : 'discounts'}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <TouchableOpacity onPress={handleAddDiscount}>
          <Ionicons name="add-circle" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {store && (
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeSubtext}>{pageSubtext}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadDiscounts} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && discounts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name={isCardMode ? "card-outline" : "pricetag-outline"} size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyText}>{emptyText}</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddDiscount}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>{createButtonText}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && discounts.map((discount) => {
          const isValid = isCurrentlyValid(discount);
          return (
            <View key={discount._id} style={styles.discountCard}>
              <View style={styles.discountHeader}>
                <View style={styles.discountTitleContainer}>
                  <View style={styles.discountTitleRow}>
                    <Text style={styles.discountTitle}>{discount.name}</Text>
                    {discount.priority > 0 && (
                      <View style={styles.priorityBadge}>
                        <Text style={styles.priorityText}>Priority {discount.priority}</Text>
                      </View>
                    )}
                  </View>
                  {discount.description && (
                    <Text style={styles.discountSubtitle}>{discount.description}</Text>
                  )}
                </View>
                <View style={styles.discountActions}>
                  <TouchableOpacity
                    onPress={() => handleEditDiscount(discount._id)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="create-outline" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteDiscount(discount._id)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment Method Badge */}
              {(discount as any).paymentMethod && (discount as any).paymentMethod !== 'all' && (
                <View style={styles.paymentMethodBadge}>
                  <Ionicons 
                    name={(discount as any).paymentMethod === 'card' ? 'card' : 'flash'} 
                    size={14} 
                    color="#8B5CF6" 
                  />
                  <Text style={styles.paymentMethodText}>
                    {(discount as any).paymentMethod === 'card' ? 'Card Offer' : 'UPI Offer'}
                  </Text>
                </View>
              )}

              <View style={styles.discountValueContainer}>
                <View style={styles.discountValueBadge}>
                  <Ionicons name="flash" size={20} color="#F59E0B" />
                  <Text style={styles.discountValueText}>
                    {formatDiscountValue(discount)} Off
                  </Text>
                </View>
                {discount.metadata?.displayText && (
                  <Text style={styles.displayText}>{discount.metadata.displayText}</Text>
                )}
              </View>

              <View style={styles.discountDetails}>
                <View style={styles.discountDetailRow}>
                  <Ionicons name="cash" size={16} color="#6B7280" />
                  <Text style={styles.discountDetailText}>
                    Min Order: ₹{discount.minOrderValue}
                  </Text>
                </View>

                {discount.maxDiscountAmount && (
                  <View style={styles.discountDetailRow}>
                    <Ionicons name="trending-down" size={16} color="#6B7280" />
                    <Text style={styles.discountDetailText}>
                      Max Discount: ₹{discount.maxDiscountAmount}
                    </Text>
                  </View>
                )}

                <View style={styles.discountDetailRow}>
                  <Ionicons name="people" size={16} color="#6B7280" />
                  <Text style={styles.discountDetailText}>
                    {discount.usageLimitPerUser} use{discount.usageLimitPerUser > 1 ? 's' : ''} per user
                    {discount.usageLimit && ` • ${discount.usageLimit} total uses`}
                  </Text>
                </View>

                <View style={styles.discountDetailRow}>
                  <Ionicons name="time" size={16} color="#6B7280" />
                  <Text style={styles.discountDetailText}>
                    Valid: {formatDate(discount.validFrom)} - {formatDate(discount.validUntil)}
                  </Text>
                </View>

                <View style={styles.discountDetailRow}>
                  <Ionicons 
                    name={isValid ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={isValid ? "#10B981" : "#EF4444"} 
                  />
                  <Text style={[
                    styles.discountDetailText,
                    { color: isValid ? "#10B981" : "#EF4444" }
                  ]}>
                    {isValid ? 'Active' : discount.isActive ? 'Expired' : 'Inactive'}
                    {discount.usedCount > 0 && ` • ${discount.usedCount} used`}
                  </Text>
                </View>

                {discount.restrictions && (
                  <View style={styles.restrictionsContainer}>
                    {discount.restrictions.isOfflineOnly && (
                      <View style={styles.restrictionTag}>
                        <Ionicons name="storefront" size={12} color="#6B7280" />
                        <Text style={styles.restrictionText}>Offline Only</Text>
                      </View>
                    )}
                    {discount.restrictions.singleVoucherPerBill && (
                      <View style={styles.restrictionTag}>
                        <Ionicons name="document-text" size={12} color="#6B7280" />
                        <Text style={styles.restrictionText}>Single per bill</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {discounts.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddDiscount}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
      />

      {/* Alert Modal (for success/error messages) */}
      <ConfirmModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        confirmText="OK"
        onConfirm={() => setAlertModal({ ...alertModal, visible: false })}
        onCancel={() => setAlertModal({ ...alertModal, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  storeInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  storeSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  discountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  discountTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  discountTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  discountTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  priorityBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  discountSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  discountActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  discountValueContainer: {
    marginBottom: 12,
  },
  discountValueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  discountValueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 6,
  },
  displayText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  discountDetails: {
    gap: 8,
  },
  discountDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountDetailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  restrictionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  restrictionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  restrictionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

