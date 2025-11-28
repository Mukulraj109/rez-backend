import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/contexts/StoreContext';
import { storeService, Store } from '@/services/api/stores';
import { Colors } from '@/constants/Colors';
import { BottomNav, BOTTOM_NAV_HEIGHT_CONSTANT } from '@/components/navigation/BottomNav';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StoreDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { activeStore, setActiveStore } = useStore();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerFlatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id) {
      loadStoreDetails();
      setCurrentBannerIndex(0);
    }
  }, [id]);

  const loadStoreDetails = async () => {
    try {
      setLoading(true);
      const storeData = await storeService.getStoreById(id as string);
      setStore(storeData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load store details');
      router.back();
    } finally {
      setLoading(false);
    }
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

  const renderRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={16} color="#FFB800" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={16} color="#FFB800" />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={16} color="#E5E7EB" />
        );
      }
    }
    return stars;
  };

  // Get banners as array (support both string and array)
  const getBanners = (): string[] => {
    if (!store?.banner) return [];
    if (Array.isArray(store.banner)) {
      return store.banner;
    }
    return [store.banner];
  };

  const banners = getBanners();

  const handleBannerScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = SCREEN_WIDTH;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentBannerIndex(index);
  };

  const renderBannerItem = ({ item }: { item: string }) => (
    <Image source={{ uri: item }} style={styles.banner} />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading store details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!store) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.light.error} />
          <Text style={styles.errorText}>Store not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = getStoreStatus(store);
  const rating = store.ratings?.average || 0;
  const ratingCount = store.ratings?.count || 0;
  const isActive = activeStore?._id === store._id;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store Details</Text>
        <TouchableOpacity
          onPress={() => router.push(`/stores/${store._id}`)}
          style={styles.editButton}
        >
          <Ionicons name="pencil" size={20} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Section */}
        <View style={styles.bannerSection}>
          {banners.length > 0 ? (
            <>
              <FlatList
                ref={bannerFlatListRef}
                data={banners}
                renderItem={renderBannerItem}
                keyExtractor={(item, index) => `banner-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleBannerScroll}
                scrollEventThrottle={16}
                snapToInterval={SCREEN_WIDTH}
                decelerationRate="fast"
                getItemLayout={(data, index) => ({
                  length: SCREEN_WIDTH,
                  offset: SCREEN_WIDTH * index,
                  index,
                })}
              />
              {/* Pagination Dots */}
              {banners.length > 1 && (
                <View style={styles.paginationContainer}>
                  {banners.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.paginationDot,
                        index === currentBannerIndex && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Ionicons name="storefront" size={64} color="#9CA3AF" />
            </View>
          )}
          {isActive && (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.activeBadgeText}>Active Store</Text>
            </View>
          )}
        </View>

        {/* Store Info Card */}
        <View style={styles.infoCard}>
          {/* Logo and Basic Info */}
          <View style={styles.logoSection}>
            {store.logo ? (
              <Image source={{ uri: store.logo }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="storefront" size={32} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.basicInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.storeName}>{store.name}</Text>
                {store.isVerified && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.light.primary} />
                )}
              </View>
              {store.category && (
                <Text style={styles.category}>
                  {typeof store.category === 'object' ? store.category.name : 'Category'}
                </Text>
              )}
            </View>
          </View>

          {/* Rating and Status */}
          <View style={styles.ratingStatusSection}>
            {rating > 0 && (
              <View style={styles.ratingSection}>
                <View style={styles.starsContainer}>
                  {renderRatingStars(rating)}
                </View>
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                {ratingCount > 0 && (
                  <Text style={styles.ratingCount}>({ratingCount} reviews)</Text>
                )}
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
            {store.isFeatured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {store.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{store.description}</Text>
            </View>
          )}

          {/* Location */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color={Colors.light.primary} />
              <Text style={styles.sectionTitle}>Location</Text>
            </View>
            <Text style={styles.locationText}>{store.location.address}</Text>
            <Text style={styles.locationText}>
              {store.location.city}
              {store.location.state && `, ${store.location.state}`}
              {store.location.pincode && ` - ${store.location.pincode}`}
            </Text>
            {store.location.landmark && (
              <Text style={styles.landmarkText}>Near {store.location.landmark}</Text>
            )}
            {store.location.deliveryRadius && (
              <Text style={styles.deliveryRadius}>
                Delivery radius: {store.location.deliveryRadius} km
              </Text>
            )}
          </View>

          {/* Contact Information */}
          {(store.contact?.phone || store.contact?.email || store.contact?.website) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="call" size={20} color={Colors.light.primary} />
                <Text style={styles.sectionTitle}>Contact</Text>
              </View>
              {store.contact.phone && (
                <View style={styles.contactItem}>
                  <Ionicons name="call-outline" size={16} color={Colors.light.textSecondary} />
                  <Text style={styles.contactText}>{store.contact.phone}</Text>
                </View>
              )}
              {store.contact.email && (
                <View style={styles.contactItem}>
                  <Ionicons name="mail-outline" size={16} color={Colors.light.textSecondary} />
                  <Text style={styles.contactText}>{store.contact.email}</Text>
                </View>
              )}
              {store.contact.website && (
                <View style={styles.contactItem}>
                  <Ionicons name="globe-outline" size={16} color={Colors.light.textSecondary} />
                  <Text style={styles.contactText}>{store.contact.website}</Text>
                </View>
              )}
              {store.contact.whatsapp && (
                <View style={styles.contactItem}>
                  <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                  <Text style={styles.contactText}>{store.contact.whatsapp}</Text>
                </View>
              )}
            </View>
          )}

          {/* Operational Info */}
          {store.operationalInfo && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time" size={20} color={Colors.light.primary} />
                <Text style={styles.sectionTitle}>Operational Details</Text>
              </View>
              {store.operationalInfo.deliveryTime && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Delivery Time:</Text>
                  <Text style={styles.infoValue}>{store.operationalInfo.deliveryTime}</Text>
                </View>
              )}
              {store.operationalInfo.minimumOrder !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Minimum Order:</Text>
                  <Text style={styles.infoValue}>₹{store.operationalInfo.minimumOrder}</Text>
                </View>
              )}
              {store.operationalInfo.deliveryFee !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Delivery Fee:</Text>
                  <Text style={styles.infoValue}>₹{store.operationalInfo.deliveryFee}</Text>
                </View>
              )}
              {store.operationalInfo.freeDeliveryAbove && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Free Delivery Above:</Text>
                  <Text style={styles.infoValue}>₹{store.operationalInfo.freeDeliveryAbove}</Text>
                </View>
              )}
              {store.operationalInfo.hours && (
                <View style={styles.hoursSection}>
                  <Text style={styles.hoursTitle}>Store Hours</Text>
                  {Object.entries(store.operationalInfo.hours).map(([day, hours]: [string, any]) => (
                    <View key={day} style={styles.hourRow}>
                      <Text style={styles.dayName}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                      {hours.closed ? (
                        <Text style={styles.closedText}>Closed</Text>
                      ) : (
                        <Text style={styles.hoursText}>
                          {hours.open} - {hours.close}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Offers */}
          {store.offers && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="gift" size={20} color={Colors.light.primary} />
                <Text style={styles.sectionTitle}>Offers & Cashback</Text>
              </View>
              {store.offers.cashback && (
                <View style={styles.offerCard}>
                  <Ionicons name="cash" size={24} color={Colors.light.success} />
                  <View style={styles.offerInfo}>
                    <Text style={styles.offerTitle}>{store.offers.cashback}% Cashback</Text>
                    {store.offers.minOrderAmount && (
                      <Text style={styles.offerSubtitle}>
                        On orders above ₹{store.offers.minOrderAmount}
                      </Text>
                    )}
                  </View>
                </View>
              )}
              {store.offers.isPartner && (
                <View style={styles.partnerBadge}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.partnerText}>
                    Partner Store {store.offers.partnerLevel && `(${store.offers.partnerLevel})`}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Analytics */}
          {store.analytics && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="stats-chart" size={20} color={Colors.light.primary} />
                <Text style={styles.sectionTitle}>Analytics</Text>
              </View>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsCard}>
                  <Ionicons name="receipt-outline" size={24} color={Colors.light.primary} />
                  <Text style={styles.analyticsValue}>{store.analytics.totalOrders || 0}</Text>
                  <Text style={styles.analyticsLabel}>Total Orders</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Ionicons name="cash-outline" size={24} color={Colors.light.success} />
                  <Text style={styles.analyticsValue}>
                    ₹{((store.analytics.totalRevenue || 0) / 1000).toFixed(1)}K
                  </Text>
                  <Text style={styles.analyticsLabel}>Total Revenue</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Ionicons name="people-outline" size={24} color={Colors.light.warning} />
                  <Text style={styles.analyticsValue}>{store.analytics.repeatCustomers || 0}</Text>
                  <Text style={styles.analyticsLabel}>Repeat Customers</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Ionicons name="cart-outline" size={24} color={Colors.light.error} />
                  <Text style={styles.analyticsValue}>
                    ₹{((store.analytics.avgOrderValue || 0)).toFixed(0)}
                  </Text>
                  <Text style={styles.analyticsLabel}>Avg Order Value</Text>
                </View>
              </View>
            </View>
          )}

          {/* Tags */}
          {store.tags && store.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {store.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reviews & UGC Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={20} color={Colors.light.primary} />
              <Text style={styles.sectionTitle}>Reviews & UGC</Text>
            </View>
            <Text style={styles.sectionSubtext}>
              View customer reviews and user-generated content for your store
            </Text>
            
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push(`/stores/${store._id}/reviews`)}
            >
              <View style={styles.actionCardContent}>
                <View style={styles.actionCardLeft}>
                  <Ionicons name="star" size={24} color="#FFB800" />
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>Store Reviews</Text>
                    <Text style={styles.actionCardSubtitle}>
                      {ratingCount > 0 ? `${ratingCount} reviews` : 'No reviews yet'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push(`/stores/${store._id}/ugc`)}
            >
              <View style={styles.actionCardContent}>
                <View style={styles.actionCardLeft}>
                  <Ionicons name="images" size={24} color="#10B981" />
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>UGC Content</Text>
                    <Text style={styles.actionCardSubtitle}>User-generated photos and videos</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Gallery Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images-outline" size={20} color={Colors.light.primary} />
              <Text style={styles.sectionTitle}>Store Gallery</Text>
            </View>
            <Text style={styles.sectionSubtext}>
              Manage your store gallery with images and videos
            </Text>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push(`/stores/${store._id}/gallery`)}
            >
              <View style={styles.actionCardContent}>
                <View style={styles.actionCardLeft}>
                  <Ionicons name="grid" size={24} color="#8B5CF6" />
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>Manage Gallery</Text>
                    <Text style={styles.actionCardSubtitle}>Upload and organize store images</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* UPI Payment Discounts Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={20} color={Colors.light.primary} />
              <Text style={styles.sectionTitle}>UPI Payment Discounts</Text>
            </View>
            <Text style={styles.sectionSubtext}>
              Manage UPI payment discounts for this store
            </Text>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push({
                pathname: `/stores/${store._id}/discounts`,
                params: { paymentMethod: 'upi' }
              } as any)}
            >
              <View style={styles.actionCardContent}>
                <View style={styles.actionCardLeft}>
                  <Ionicons name="flash" size={24} color="#10B981" />
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>Manage Discounts</Text>
                    <Text style={styles.actionCardSubtitle}>Create and manage UPI payment discounts</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Card Offers Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card" size={20} color={Colors.light.primary} />
              <Text style={styles.sectionTitle}>Card Offers</Text>
            </View>
            <Text style={styles.sectionSubtext}>
              Manage card payment offers for this store
            </Text>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push({
                pathname: `/stores/${store._id}/discounts`,
                params: { paymentMethod: 'card' }
              } as any)}
            >
              <View style={styles.actionCardContent}>
                <View style={styles.actionCardLeft}>
                  <Ionicons name="card" size={24} color="#3B82F6" />
                  <View style={styles.actionCardText}>
                    <Text style={styles.actionCardTitle}>Manage Card Offers</Text>
                    <Text style={styles.actionCardSubtitle}>Create and manage card payment offers</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            {!isActive && (
              <TouchableOpacity
                style={styles.activateButton}
                onPress={async () => {
                  try {
                    await setActiveStore(store);
                    Alert.alert('Success', `${store.name} is now your active store.`);
                  } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to activate store');
                  }
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.activateButtonText}>Set as Active Store</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.editButtonFull}
              onPress={() => router.push(`/stores/${store._id}`)}
            >
              <Ionicons name="pencil" size={20} color={Colors.light.primary} />
              <Text style={styles.editButtonText}>Edit Store</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  editButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: BOTTOM_NAV_HEIGHT_CONSTANT + 16,
  },
  bannerSection: {
    height: 200,
    position: 'relative',
    backgroundColor: Colors.light.backgroundSecondary,
    overflow: 'hidden',
  },
  banner: {
    width: SCREEN_WIDTH,
    height: 200,
    resizeMode: 'cover',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  activeBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: Colors.light.background,
    marginTop: -40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  logoSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  basicInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginRight: 8,
  },
  category: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  ratingStatusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  ratingCount: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  description: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  locationText: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 4,
  },
  landmarkText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  deliveryRadius: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  hoursSection: {
    marginTop: 12,
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  hoursText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  closedText: {
    fontSize: 14,
    color: Colors.light.error,
    fontWeight: '500',
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.success,
    marginBottom: 4,
  },
  offerSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  partnerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 8,
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  actionsSection: {
    marginTop: 8,
    gap: 12,
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.success,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    gap: 8,
  },
  editButtonText: {
    color: Colors.light.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionCardText: {
    marginLeft: 12,
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});


