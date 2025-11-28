import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { offersService } from '@/services/api/offers';
import { useStore } from '@/contexts/StoreContext';

interface Deal {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  type: 'cashback' | 'discount' | 'voucher' | 'combo' | 'special';
  cashbackPercentage: number;
  originalPrice?: number;
  discountedPrice?: number;
  validity: {
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  restrictions: {
    minOrderValue?: number;
    maxDiscountAmount?: number;
  };
  metadata: {
    priority: number;
    featured?: boolean;
  };
}

export default function StoreDealsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.id as string;
  const { stores } = useStore();
  const store = stores.find(s => s._id === storeId);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDeals();
  }, [storeId]);

  const loadDeals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await offersService.getStoreOffers(storeId);
      if (response.success && response.data) {
        setDeals(response.data.deals || []);
      } else {
        setError(response.message || 'Failed to load deals');
      }
    } catch (err: any) {
      console.error('Error loading deals:', err);
      setError(err.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeals();
    setRefreshing(false);
  };

  const handleAddDeal = () => {
    router.push({
      pathname: '/stores/[id]/deals/add',
      params: { id: storeId }
    } as any);
  };

  const handleEditDeal = (dealId: string) => {
    router.push({
      pathname: '/stores/[id]/deals/[dealId]',
      params: { id: storeId, dealId }
    } as any);
  };

  const handleDeleteDeal = async (dealId: string) => {
    Alert.alert(
      'Delete Deal',
      'Are you sure you want to delete this deal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await offersService.deleteOffer(dealId);
              if (response.success) {
                Alert.alert('Success', 'Deal deleted successfully');
                loadDeals();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete deal');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete deal');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDealTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cashback: 'Cashback',
      discount: 'Discount',
      voucher: 'Voucher',
      combo: 'Combo',
      special: 'Special',
    };
    return labels[type] || type;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Walk-In Deals</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading deals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Walk-In Deals</Text>
        <TouchableOpacity onPress={handleAddDeal}>
          <Ionicons name="add-circle" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {store && (
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeSubtext}>Manage special deals for walk-in customers</Text>
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
            <TouchableOpacity onPress={loadDeals} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && deals.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Walk-In Deals</Text>
            <Text style={styles.emptyText}>
              Create special deals and offers for customers who visit your store in person.
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddDeal}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Create Your First Deal</Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && deals.map((deal) => (
          <View key={deal._id} style={styles.dealCard}>
            <View style={styles.dealHeader}>
              <View style={styles.dealTitleContainer}>
                <Text style={styles.dealTitle}>{deal.title}</Text>
                {deal.subtitle && (
                  <Text style={styles.dealSubtitle}>{deal.subtitle}</Text>
                )}
              </View>
              <View style={styles.dealActions}>
                <TouchableOpacity
                  onPress={() => handleEditDeal(deal._id)}
                  style={styles.actionButton}
                >
                  <Ionicons name="create-outline" size={20} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteDeal(deal._id)}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            {deal.description && (
              <Text style={styles.dealDescription}>{deal.description}</Text>
            )}

            <View style={styles.dealDetails}>
              <View style={styles.dealDetailRow}>
                <Ionicons name="pricetag" size={16} color="#6B7280" />
                <Text style={styles.dealDetailText}>
                  {getDealTypeLabel(deal.type)} • {deal.cashbackPercentage}% Cashback
                </Text>
              </View>

              {deal.restrictions.minOrderValue && (
                <View style={styles.dealDetailRow}>
                  <Ionicons name="cash" size={16} color="#6B7280" />
                  <Text style={styles.dealDetailText}>
                    Min Order: ₹{deal.restrictions.minOrderValue}
                  </Text>
                </View>
              )}

              <View style={styles.dealDetailRow}>
                <Ionicons 
                  name={deal.validity.isActive ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={deal.validity.isActive ? "#10B981" : "#EF4444"} 
                />
                <Text style={[
                  styles.dealDetailText,
                  { color: deal.validity.isActive ? "#10B981" : "#EF4444" }
                ]}>
                  {deal.validity.isActive ? 'Active' : 'Inactive'} • Valid until {formatDate(deal.validity.endDate)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {deals.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddDeal}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
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
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dealTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  dealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  dealSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  dealActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  dealDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  dealDetails: {
    gap: 8,
  },
  dealDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dealDetailText: {
    fontSize: 14,
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

