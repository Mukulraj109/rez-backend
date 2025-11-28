import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { reviewsService } from '@/services/api/reviews';
import { useStore } from '@/contexts/StoreContext';
import { BottomNav, BOTTOM_NAV_HEIGHT_CONSTANT } from '@/components/navigation/BottomNav';
import { Colors, Spacing, Shadows, BorderRadius, Typography } from '@/constants/DesignTokens';
import { Card, Heading2, Heading3, BodyText, Caption, Badge } from '@/components/ui/DesignSystemComponents';
import ConfirmModal from '@/components/common/ConfirmModal';
import SuccessModal from '@/components/common/SuccessModal';
import ErrorModal from '@/components/common/ErrorModal';

const { width } = Dimensions.get('window');

interface StoreReview {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  rating: number;
  title: string;
  comment: string;
  images: string[];
  verified: boolean;
  helpful: number;
  createdAt: string;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  moderatedBy?: string;
  moderatedAt?: string;
  moderationReason?: string;
  merchantResponse?: {
    message: string;
    respondedAt: string;
    respondedBy: string;
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export default function StoreReviewsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.id as string;
  const { stores } = useStore();
  const store = stores.find(s => s._id === storeId);

  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'with_images' | 'verified' | '5' | '4' | '3' | '2' | '1'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful'>('newest');
  const [moderationFilter, setModerationFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processingReview, setProcessingReview] = useState<string | null>(null);
  
  // Modal states
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
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    loadReviews();
  }, [storeId, filter, sort, moderationFilter]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reviewsService.getStoreReviews(storeId, {
        page: 1,
        limit: 50,
        filter: filter === 'all' ? undefined : filter,
        sort,
        moderationStatus: moderationFilter === 'all' ? undefined : moderationFilter,
      });
      if (response.reviews) {
        setReviews(response.reviews as any);
        setStats(response.stats as any);
      } else {
        setError('Failed to load reviews');
      }
    } catch (err: any) {
      console.error('Error loading reviews:', err);
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const reviewDate = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - reviewDate.getTime();
    const diffMs = Math.abs(diffTime);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Same day - show time
    if (diffDays === 0) {
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
      if (diffHours < 24) {
        const timeStr = reviewDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        return `Today at ${timeStr}`;
      }
    }
    
    // Yesterday - show time
    if (diffDays === 1) {
      const timeStr = reviewDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `Yesterday at ${timeStr}`;
    }
    
    // Within a week - show day and time
    if (diffDays < 7) {
      const timeStr = reviewDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const dayName = reviewDate.toLocaleDateString('en-US', { weekday: 'short' });
      return `${dayName} at ${timeStr}`;
    }
    
    // Older - show date and time
    if (diffDays < 365) {
      const dateStr = reviewDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      const timeStr = reviewDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `${dateStr} at ${timeStr}`;
    }
    
    // Very old - show full date
    return reviewDate.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleApproveReview = async (reviewId: string) => {
    setConfirmModal({
      visible: true,
      title: 'Approve Review',
      message: 'Are you sure you want to approve this review? The user will receive 10 rezcoins as a reward.',
      type: 'default',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, visible: false });
        try {
          setProcessingReview(reviewId);
          await reviewsService.approveReview(storeId, reviewId);
          setSuccessModal({
            visible: true,
            title: 'Success',
            message: 'Review approved successfully! User has been rewarded with 10 rezcoins.',
          });
          await loadReviews();
        } catch (error: any) {
          setErrorModal({
            visible: true,
            title: 'Error',
            message: error.message || 'Failed to approve review',
          });
        } finally {
          setProcessingReview(null);
        }
      },
    });
  };

  const handleRejectReview = async (reviewId: string) => {
    setConfirmModal({
      visible: true,
      title: 'Reject Review',
      message: 'Are you sure you want to reject this review? You can provide a reason (optional).',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, visible: false });
        try {
          setProcessingReview(reviewId);
          await reviewsService.rejectReview(storeId, reviewId);
          setSuccessModal({
            visible: true,
            title: 'Success',
            message: 'Review rejected successfully.',
          });
          await loadReviews();
        } catch (error: any) {
          setErrorModal({
            visible: true,
            title: 'Error',
            message: error.message || 'Failed to reject review',
          });
        } finally {
          setProcessingReview(null);
        }
      },
    });
  };

  const renderStars = (rating: number, size: number = 16) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? 'star' : 'star-outline'}
        size={size}
        color={i < rating ? '#FFB800' : Colors.gray[300]}
        style={{ marginRight: 2 }}
      />
    ));
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Store Reviews</ThemedText>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modern Header */}
      <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>Store Reviews</ThemedText>
          {store && (
            <ThemedText style={styles.storeNameSubtitle} numberOfLines={1}>
              {store.name}
            </ThemedText>
          )}
        </View>
        <View style={styles.placeholder} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary[500]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Card - Modern Design */}
        {stats && (
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <Card style={styles.statsCard} padding="lg">
              <View style={styles.statsMain}>
                <View style={styles.ratingDisplay}>
                  <Heading2 style={styles.avgRating}>
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}
                  </Heading2>
                  <BodyText style={styles.avgRatingOutOf}>/ 5</BodyText>
                </View>
                <View style={styles.starsRow}>
                  {renderStars(Math.round(stats.averageRating), 20)}
                </View>
                <BodyText style={styles.totalReviews}>
                  {stats.totalReviews === 0 
                    ? 'No reviews yet' 
                    : `${stats.totalReviews} ${stats.totalReviews === 1 ? 'review' : 'reviews'}`}
                </BodyText>
              </View>
              
              {stats.totalReviews > 0 && (
                <View style={styles.breakdown}>
                  <Heading3 style={styles.breakdownTitle}>Rating Breakdown</Heading3>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = stats.ratingBreakdown[rating as keyof typeof stats.ratingBreakdown] || 0;
                    const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                    return (
                      <Animated.View 
                        key={rating} 
                        entering={SlideInRight.delay(rating * 50).duration(300)}
                        style={styles.breakdownRow}
                      >
                        <View style={styles.breakdownRatingContainer}>
                          <BodyText style={styles.breakdownRating}>{rating}★</BodyText>
                        </View>
                        <View style={styles.breakdownBar}>
                          <Animated.View
                            style={[
                              styles.breakdownFill,
                              {
                                width: `${percentage}%`,
                                backgroundColor: rating >= 4 ? Colors.success[400] : rating >= 3 ? Colors.warning[400] : Colors.error[400],
                              },
                            ]}
                          />
                        </View>
                        <BodyText style={styles.breakdownCount}>{count}</BodyText>
                      </Animated.View>
                    );
                  })}
                </View>
              )}
            </Card>
          </Animated.View>
        )}

        {/* Moderation Status Filters - Modern Pills */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <View style={styles.filtersSection}>
            <Caption style={styles.filterSectionLabel}>Status</Caption>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            >
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterPill,
                    moderationFilter === status && styles.filterPillActive,
                    moderationFilter === status && { backgroundColor: Colors.primary[500] },
                  ]}
                  onPress={() => setModerationFilter(status)}
                >
                  <ThemedText
                    style={[
                      styles.filterPillText,
                      moderationFilter === status && styles.filterPillTextActive,
                    ]}
                  >
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Animated.View>

        {/* Rating & Sort Filters */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <View style={styles.filtersSection}>
            <View style={styles.filterRow}>
              <Caption style={styles.filterSectionLabel}>Filter by Rating</Caption>
              <Caption style={styles.filterSectionLabel}>Sort</Caption>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            >
              {(['all', '5', '4', '3', '2', '1'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterPill,
                    filter === f && styles.filterPillActive,
                    filter === f && { backgroundColor: Colors.primary[500] },
                  ]}
                  onPress={() => setFilter(f)}
                >
                  <ThemedText
                    style={[
                      styles.filterPillText,
                      filter === f && styles.filterPillTextActive,
                    ]}
                  >
                    {f === 'all' ? 'All Ratings' : `${f}★`}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.filterScrollContent, { marginTop: Spacing.sm }]}
            >
              {(['newest', 'oldest', 'rating_high', 'rating_low'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.filterPill,
                    sort === s && styles.filterPillActive,
                    sort === s && { backgroundColor: Colors.primary[500] },
                  ]}
                  onPress={() => setSort(s)}
                >
                  <ThemedText
                    style={[
                      styles.filterPillText,
                      sort === s && styles.filterPillTextActive,
                    ]}
                  >
                    {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Animated.View>

        {error && (
          <Animated.View entering={FadeInUp} style={styles.errorContainer}>
            <Card style={styles.errorCard} padding="md">
              <Ionicons name="alert-circle" size={24} color={Colors.error[500]} />
              <BodyText style={styles.errorText}>{error}</BodyText>
              <TouchableOpacity
                onPress={loadReviews}
                style={styles.retryButton}
                activeOpacity={0.8}
              >
                <BodyText style={{ color: Colors.text.inverse, fontWeight: Typography.fontWeight.semiBold }}>
                  Retry
                </BodyText>
              </TouchableOpacity>
            </Card>
          </Animated.View>
        )}

        {/* Reviews List */}
        {reviews.length === 0 && !loading ? (
          <Animated.View entering={FadeInUp.delay(400)} style={styles.emptyContainer}>
            <Card style={styles.emptyCard} padding="xl">
              <Ionicons name="star-outline" size={64} color={Colors.gray[400]} />
              <Heading3 style={styles.emptyText}>No reviews yet</Heading3>
              <BodyText style={styles.emptySubtext}>
                Reviews from customers will appear here
              </BodyText>
            </Card>
          </Animated.View>
        ) : (
          reviews.map((review, index) => (
            <Animated.View
              key={review.id}
              entering={FadeInDown.delay(400 + index * 50).duration(300)}
            >
              <Card style={styles.reviewCard} padding="lg">
                {/* Pending Banner */}
                {review.moderationStatus === 'pending' && (
                  <View style={styles.pendingBanner}>
                    <Ionicons name="time-outline" size={16} color={Colors.warning[600]} />
                    <BodyText style={styles.pendingBannerText}>
                      PENDING REVIEW - AWAITING YOUR APPROVAL
                    </BodyText>
                  </View>
                )}

                {/* Review Header */}
                <View style={styles.reviewHeader}>
                  <View style={styles.userInfo}>
                    {review.user.avatar ? (
                      <Image source={{ uri: review.user.avatar }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={20} color={Colors.gray[400]} />
                      </View>
                    )}
                    <View style={styles.userDetails}>
                      <View style={styles.userNameRow}>
                        <Heading3 style={styles.userName}>{review.user.name}</Heading3>
                        {review.moderationStatus && review.moderationStatus !== 'approved' && (
                          <Badge
                            variant={
                              review.moderationStatus === 'pending'
                                ? 'warning'
                                : review.moderationStatus === 'approved'
                                ? 'success'
                                : 'error'
                            }
                            size="small"
                            style={styles.statusBadge}
                          >
                            <BodyText
                              style={[
                                styles.statusBadgeText,
                                {
                                  color:
                                    review.moderationStatus === 'pending'
                                      ? Colors.warning[700]
                                      : review.moderationStatus === 'approved'
                                      ? Colors.success[700]
                                      : Colors.error[700],
                                },
                              ]}
                            >
                              {review.moderationStatus.toUpperCase()}
                            </BodyText>
                          </Badge>
                        )}
                      </View>
                      <View style={styles.metaRow}>
                        <Caption style={styles.reviewDate}>{formatDate(review.createdAt)}</Caption>
                        {review.verified && (
                          <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={12} color={Colors.success[500]} />
                            <Caption style={styles.verifiedText}>Verified</Caption>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.ratingContainer}>
                    {renderStars(review.rating, 18)}
                    <BodyText style={styles.ratingText}>{review.rating}.0</BodyText>
                  </View>
                </View>

                {/* Review Content */}
                {review.title && (
                  <Heading3 style={styles.reviewTitle}>{review.title}</Heading3>
                )}
                <BodyText style={styles.reviewComment}>{review.comment}</BodyText>

                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagesContainer}
                    contentContainerStyle={styles.imagesContent}
                  >
                    {review.images.map((img, idx) => (
                      <Image key={idx} source={{ uri: img }} style={styles.reviewImage} />
                    ))}
                  </ScrollView>
                )}

                {/* Merchant Response */}
                {review.merchantResponse && (
                  <View style={styles.responseContainer}>
                    <View style={styles.responseHeader}>
                      <Ionicons name="storefront" size={16} color={Colors.primary[500]} />
                      <BodyText style={styles.responseTitle}>Your Response</BodyText>
                      <Caption style={styles.responseDate}>
                        {formatDate(review.merchantResponse.respondedAt)}
                      </Caption>
                    </View>
                    <BodyText style={styles.responseText}>
                      {review.merchantResponse.message}
                    </BodyText>
                  </View>
                )}

                {/* Review Footer */}
                <View style={styles.reviewFooter}>
                  <View style={styles.footerItem}>
                    <Ionicons name="thumbs-up" size={16} color={Colors.gray[500]} />
                    <Caption style={styles.footerText}>{review.helpful} helpful</Caption>
                  </View>
                </View>

                {/* Moderation Actions */}
                {review.moderationStatus === 'pending' && (
                  <View style={styles.moderationActions}>
                    <TouchableOpacity
                      style={[styles.moderationButton, styles.approveButton]}
                      onPress={() => handleApproveReview(review.id)}
                      disabled={processingReview === review.id}
                      activeOpacity={0.8}
                    >
                      {processingReview === review.id ? (
                        <ActivityIndicator size="small" color={Colors.text.inverse} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color={Colors.text.inverse} />
                          <BodyText style={styles.moderationButtonText}>Approve</BodyText>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.moderationButton, styles.rejectButton]}
                      onPress={() => handleRejectReview(review.id)}
                      disabled={processingReview === review.id}
                      activeOpacity={0.8}
                    >
                      {processingReview === review.id ? (
                        <ActivityIndicator size="small" color={Colors.text.inverse} />
                      ) : (
                        <>
                          <Ionicons name="close-circle" size={18} color={Colors.text.inverse} />
                          <BodyText style={styles.moderationButtonText}>Reject</BodyText>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            </Animated.View>
          ))
        )}

        <View style={{ height: BOTTOM_NAV_HEIGHT_CONSTANT + Spacing.xl }} />
      </ScrollView>

      {/* Modals */}
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.type === 'danger' ? 'Reject' : 'Approve'}
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
      />
      <SuccessModal
        visible={successModal.visible}
        title={successModal.title}
        message={successModal.message}
        onClose={() => setSuccessModal({ ...successModal, visible: false })}
        autoCloseDelay={3000}
      />
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
      />

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    ...Shadows.sm,
  },
  backButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  storeNameSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  statsCard: {
    marginBottom: Spacing.base,
    ...Shadows.md,
  },
  statsMain: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  avgRating: {
    fontSize: Typography.fontSize['5xl'],
    fontWeight: Typography.fontWeight.extraBold,
    color: Colors.text.primary,
    letterSpacing: Typography.letterSpacing.tighter,
  },
  avgRatingOutOf: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text.tertiary,
    marginLeft: Spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  totalReviews: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  breakdown: {
    marginTop: Spacing.sm,
  },
  breakdownTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  breakdownRatingContainer: {
    width: 40,
  },
  breakdownRating: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text.secondary,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.gray[200],
    borderRadius: BorderRadius.full,
    marginHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  breakdownCount: {
    width: 40,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text.tertiary,
    textAlign: 'right',
  },
  filtersSection: {
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.xs,
  },
  filterSectionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  filterScrollContent: {
    paddingRight: Spacing.base,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[100],
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  filterPillActive: {
    borderColor: Colors.primary[500],
  },
  filterPillText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  filterPillTextActive: {
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semiBold,
  },
  errorContainer: {
    marginBottom: Spacing.base,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error[50],
    borderColor: Colors.error[200],
  },
  errorText: {
    flex: 1,
    color: Colors.error[600],
  },
  retryButton: {
    marginLeft: 'auto',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  emptyContainer: {
    marginTop: Spacing['4xl'],
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  emptyText: {
    marginTop: Spacing.base,
    color: Colors.text.primary,
  },
  emptySubtext: {
    marginTop: Spacing.sm,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  reviewCard: {
    marginBottom: Spacing.base,
    ...Shadows.md,
    overflow: 'hidden',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning[50],
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginHorizontal: -Spacing.lg,
    marginTop: -Spacing.lg,
    marginBottom: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.warning[300],
    gap: Spacing.sm,
  },
  pendingBannerText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.warning[700],
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginBottom: Spacing.xs,
  },
  userName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text.primary,
  },
  statusBadge: {
    marginLeft: Spacing.xs,
  },
  statusBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reviewDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.success[600],
    fontWeight: Typography.fontWeight.medium,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text.secondary,
  },
  reviewTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  reviewComment: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeight.base,
    marginBottom: Spacing.md,
  },
  imagesContainer: {
    marginBottom: Spacing.md,
  },
  imagesContent: {
    gap: Spacing.sm,
  },
  reviewImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
  },
  responseContainer: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary[500],
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  responseTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.primary[600],
    flex: 1,
  },
  responseDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  responseText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeight.base,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.base,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  moderationActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  moderationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  approveButton: {
    backgroundColor: Colors.success[500],
  },
  rejectButton: {
    backgroundColor: Colors.error[500],
  },
  moderationButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.text.inverse,
  },
});
