import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  ScrollView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import { useStore } from '@/contexts/StoreContext';
import { Store } from '@/services/api/stores';
import { Colors } from '@/constants/Colors';
import { BottomNav, BOTTOM_NAV_HEIGHT_CONSTANT } from '@/components/navigation/BottomNav';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StoresScreen() {
  const router = useRouter();
  const { stores, isLoading, refreshStores, deleteStore, activeStore, setActiveStore } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [bannerIndices, setBannerIndices] = useState<Record<string, number>>({});

  useEffect(() => {
    refreshStores();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshStores();
    setRefreshing(false);
  };

  const handleDelete = (store: Store) => {
    Alert.alert(
      'Delete Store',
      `Are you sure you want to delete "${store.name}"? This will deactivate the store.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStore(store._id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete store');
            }
          },
        },
      ]
    );
  };

  const getStoreStatus = (store: Store) => {
    // If store is not active, show inactive status
    if (!store.isActive) {
      return { text: 'Inactive', color: '#6B7280' };
    }
    
    // If operational hours are set, check if store is currently open
    if (store.operationalInfo?.hours) {
      const now = new Date();
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.toTimeString().slice(0, 5);
      const todayHours = store.operationalInfo.hours[dayName as keyof typeof store.operationalInfo.hours];
      
      if (!todayHours || todayHours.closed) {
        return { text: 'Closed', color: '#EF4444' };
      }
      
      if (currentTime >= todayHours.open && currentTime <= todayHours.close) {
        return { text: 'Open', color: '#10B981' };
      }
      
      return { text: 'Closed', color: '#EF4444' };
    }
    
    // If no operational hours but store is active, show as "Open"
    return { text: 'Open', color: '#10B981' };
  };

  // Get banners as array (support both string and array)
  const getBanners = (store: Store): string[] => {
    if (!store.banner) return [];
    if (Array.isArray(store.banner)) {
      return store.banner;
    }
    return [store.banner];
  };

  const handleBannerScroll = (storeId: string, event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const cardWidth = viewMode === 'grid' ? (SCREEN_WIDTH - 48) / 2 : SCREEN_WIDTH - 32;
    const index = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    setBannerIndices(prev => ({ ...prev, [storeId]: index }));
  };

  const renderBannerItem = (item: string, cardWidth: number) => (
    <Image source={{ uri: item }} style={[styles.storeBanner, { width: cardWidth }]} />
  );

  const renderStoreCard = ({ item, index }: { item: Store; index: number }) => {
    const isActive = activeStore?._id === item._id;
    const status = getStoreStatus(item);
    const rating = item.ratings?.average || 0;
    const ratingCount = item.ratings?.count || 0;
    const banners = getBanners(item);
    const cardWidth = viewMode === 'grid' ? (SCREEN_WIDTH - 48) / 2 : SCREEN_WIDTH - 32;
    const currentBannerIndex = bannerIndices[item._id] || 0;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100).springify()}
        style={viewMode === 'grid' ? styles.gridItemContainer : styles.listItemContainer}
      >
        <TouchableOpacity
          style={[
            styles.storeCard, 
            isActive && styles.activeStoreCard,
            viewMode === 'grid' && styles.gridCard
          ]}
          onPress={() => router.push(`/stores/${item._id}/details`)}
          activeOpacity={0.8}
        >
        {/* Store Banner/Logo Section */}
        <View style={styles.storeBannerSection}>
          {banners.length > 0 ? (
            <>
              <View style={styles.bannerImageContainer}>
                <FlatList
                  data={banners}
                  renderItem={({ item: bannerUrl }) => renderBannerItem(bannerUrl, cardWidth)}
                  keyExtractor={(bannerUrl, idx) => `banner-${item._id}-${idx}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => handleBannerScroll(item._id, e)}
                  scrollEventThrottle={16}
                  snapToInterval={cardWidth}
                  decelerationRate="fast"
                  getItemLayout={(data, idx) => ({
                    length: cardWidth,
                    offset: cardWidth * idx,
                    index: idx,
                  })}
                />
              </View>
              {/* Pagination Dots */}
              {banners.length > 1 && (
                <View style={styles.paginationContainer}>
                  {banners.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.paginationDot,
                        idx === currentBannerIndex && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.storeBannerPlaceholder}>
              <Ionicons name="storefront" size={48} color="#9CA3AF" />
            </View>
          )}
          {item.logo && (
            <View style={styles.logoContainer}>
              <Image source={{ uri: item.logo }} style={styles.storeLogo} />
            </View>
          )}
          {/* View Details Icon Button - Always visible, top right */}
          <TouchableOpacity
            style={styles.viewDetailsIconButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/stores/${item._id}/details`);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="information-circle" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {/* Active Badge - Positioned below the icon button */}
          {isActive && (
            <View style={styles.activeBadgeOverlay}>
              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
              <Text style={styles.activeBadgeOverlayText}>Active</Text>
            </View>
          )}
        </View>

        {/* Store Info Section */}
        <View style={styles.storeInfoSection}>
          <View style={styles.storeHeader}>
            <View style={styles.storeTitleRow}>
              <Text style={styles.storeCardName} numberOfLines={1}>{item.name}</Text>
              {item.isVerified && (
                <Ionicons name="checkmark-circle" size={20} color="#3B82F6" style={styles.verifiedIcon} />
              )}
            </View>
            {item.category && (
              <Text style={styles.storeCategory}>
                {typeof item.category === 'object' ? item.category.name : 'Category'}
              </Text>
            )}
          </View>

          {/* Rating and Status Row */}
          <View style={styles.ratingStatusRow}>
            {rating > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                {ratingCount > 0 && (
                  <Text style={styles.ratingCount}>({ratingCount})</Text>
                )}
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
            {item.isFeatured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location.address}, {item.location.city}
              {item.location.state && `, ${item.location.state}`}
            </Text>
          </View>

          {/* Description */}
          {item.description && (
            <Text style={styles.storeCardDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats Row */}
          <View style={styles.storeCardStats}>
            <View style={styles.statItem}>
              <Ionicons name="cube-outline" size={16} color="#6B7280" />
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="receipt-outline" size={16} color="#6B7280" />
              <Text style={styles.statLabel}>
                {item.analytics?.totalOrders || 0} Orders
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={16} color="#6B7280" />
              <Text style={styles.statLabel}>
                ₹{((item.analytics?.totalRevenue || 0) / 1000).toFixed(1)}K
              </Text>
            </View>
            {item.offers?.cashback && (
              <View style={styles.statItem}>
                <Ionicons name="gift-outline" size={16} color="#10B981" />
                <Text style={[styles.statLabel, styles.cashbackText]}>
                  {item.offers.cashback}% Cashback
                </Text>
              </View>
            )}
          </View>

          {/* Quick Info */}
          <View style={styles.quickInfoRow}>
            {item.operationalInfo?.deliveryTime && (
              <View style={styles.quickInfoItem}>
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <Text style={styles.quickInfoText}>{item.operationalInfo.deliveryTime}</Text>
              </View>
            )}
            {item.operationalInfo?.freeDeliveryAbove && (
              <View style={styles.quickInfoItem}>
                <Ionicons name="car-outline" size={14} color="#10B981" />
                <Text style={styles.quickInfoText}>
                  Free delivery above ₹{item.operationalInfo.freeDeliveryAbove}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.storeCardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.addProductButton]}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/products/add?storeId=${item._id}`);
            }}
          >
            <Ionicons name="add-circle-outline" size={16} color="#10B981" />
            <Text style={[styles.actionButtonText, styles.addProductButtonText]}>
              Add
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/stores/${item._id}/details`);
            }}
          >
            <Ionicons name="eye-outline" size={16} color="#3B82F6" />
            <Text style={[styles.actionButtonText, styles.viewButtonText]}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/stores/${item._id}`);
            }}
          >
            <Ionicons name="pencil" size={16} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          {!isActive && (
            <TouchableOpacity
              style={[styles.actionButton, styles.activateButton]}
              onPress={async (e) => {
                e.stopPropagation();
                try {
                  await setActiveStore(item);
                  Alert.alert('Success', `${item.name} is now your active store.`);
                } catch (error: any) {
                  Alert.alert('Error', error.message || 'Failed to activate store');
                }
              }}
            >
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.actionButtonText, styles.activateButtonText]}>
                Activate
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(item);
            }}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7C3AED', '#6366F1', '#F3F4F6']}
        locations={[0, 0.3, 1]}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Modern Header */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>My Stores</Text>
              {stores.length > 0 && (
                <View style={styles.storeCountBadge}>
                  <Text style={styles.storeCountText}>
                    {stores.length} {stores.length === 1 ? 'store' : 'stores'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.viewModeButton}
                onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} 
                  size={22} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/stores/add')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#7C3AED', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addButton}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Add Store</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

      {isLoading && stores.length === 0 ? (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading stores...</Text>
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No stores yet</Text>
          <Text style={styles.emptyDescription}>
            Create your first store to start managing products and orders. Your stores will appear here and be visible to customers.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/stores/add')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Create Your First Store</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={stores}
          renderItem={renderStoreCard}
          keyExtractor={(item) => item._id}
          key={viewMode}
          numColumns={viewMode === 'grid' ? 2 : 1}
          contentContainerStyle={[styles.listContent, { paddingBottom: BOTTOM_NAV_HEIGHT_CONSTANT + 16 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      </SafeAreaView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'column',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  storeCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  storeCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  viewModeButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: BOTTOM_NAV_HEIGHT_CONSTANT + 20,
  },
  listItemContainer: {
    width: '100%',
  },
  gridItemContainer: {
    flex: 1,
    maxWidth: '50%',
  },
  storeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    marginBottom: 20,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  gridCard: {
    marginHorizontal: 8,
  },
  activeStoreCard: {
    borderColor: '#7C3AED',
    borderWidth: 2,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  storeBannerSection: {
    height: 120,
    position: 'relative',
    backgroundColor: Colors.light.backgroundSecondary,
    overflow: 'hidden',
  },
  bannerImageContainer: {
    height: 120,
    overflow: 'hidden',
  },
  storeBanner: {
    height: 120,
    resizeMode: 'cover',
  },
  storeBannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    width: 16,
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    position: 'absolute',
    bottom: -8,
    left: 16,
    width: 66,
    height: 66,
    borderRadius: 15,
    backgroundColor: Colors.light.background,
    padding: 5,
    borderWidth: 4,
    borderColor: Colors.light.background,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 5,
  },
  storeLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'contain',
  },
  viewDetailsIconButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124, 58, 237, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  activeBadgeOverlay: {
    position: 'absolute',
    top: 66,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    zIndex: 9,
  },
  activeBadgeOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  storeInfoSection: {
    padding: 10,
    paddingTop: 20,
  },
  storeHeader: {
    marginBottom: 12,
  },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeCardName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
  },
  verifiedIcon: {
    marginLeft: 6,
  },
  storeCategory: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  ratingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  ratingCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  storeCardDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  storeCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  cashbackText: {
    color: Colors.light.success,
    fontWeight: '600',
  },
  quickInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickInfoText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  storeCardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    padding: 12,
    paddingTop: 8,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    gap: 4,
    minWidth: 70,
    justifyContent: 'center',
  },
  addProductButton: {
    borderColor: Colors.light.success,
    backgroundColor: `${Colors.light.success}10`,
  },
  viewButton: {
    borderColor: Colors.light.primary,
  },
  editButton: {
    borderColor: Colors.light.primary,
  },
  activateButton: {
    borderColor: Colors.light.success,
  },
  deleteButton: {
    borderColor: Colors.light.error,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  addProductButtonText: {
    color: Colors.light.success,
  },
  viewButtonText: {
    color: Colors.light.primary,
  },
  activateButtonText: {
    color: Colors.light.success,
  },
  deleteButtonText: {
    color: Colors.light.error,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

