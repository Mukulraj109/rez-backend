import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Share,
  Linking,
  Platform,
  Image
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Shadows, BorderRadius } from '@/constants/DesignTokens';
import { Card, Heading2, Heading3, BodyText, Caption, Badge, Button, Divider, Spacer } from '@/components/ui/DesignSystemComponents';
import { ordersService } from '@/services';
import { Order, OrderStatus } from '@/types/api';

const statusColors: Record<OrderStatus, string> = {
  pending: Colors.warning[500],
  confirmed: Colors.primary[500],
  preparing: Colors.warning[600],
  ready: Colors.success[500],
  out_for_delivery: Colors.primary[600],
  delivered: Colors.success[600],
  cancelled: Colors.error[500],
  refunded: Colors.gray[500]
};

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded'
};

const paymentMethodLabels: Record<string, string> = {
  razorpay: 'Razorpay',
  stripe: 'Stripe',
  cod: 'Cash on Delivery',
  wallet: 'Wallet',
  standard: 'Standard'
};

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const idParam = params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!id) {
      console.error('❌ [ORDER DETAIL] No order ID provided');
      setLoading(false);
      return;
    }

    console.log('📦 [ORDER DETAIL] Fetching order with ID:', id);
    
    try {
      const orderId = id;
      console.log('📦 [ORDER DETAIL] Calling API with orderId:', orderId);
      
      const orderData = await ordersService.getOrderById(orderId);
      console.log('📦 [ORDER DETAIL] Order data received:', JSON.stringify(orderData, null, 2));
      
      if (orderData) {
        setOrder(orderData);
      }
    } catch (error: any) {
      console.error('❌ [ORDER DETAIL] Error fetching order details:', error);
      console.error('❌ [ORDER DETAIL] Error message:', error.message);
      const errorMessage = error.message || 'Failed to fetch order details';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const handleStatusUpdate = useCallback(async (newStatus: OrderStatus, notes?: string) => {
    if (!order || updating) return;

    setUpdating(true);
    try {
      await ordersService.updateOrderStatus(order._id || order.id, {
        status: newStatus,
        notes,
        notifyCustomer: true
      });

      await fetchOrderDetails();
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  }, [order, updating, fetchOrderDetails]);

  const getAvailableActions = useCallback((): Array<{
    action: string;
    label: string;
    color: string;
    icon: string;
    status: OrderStatus;
  }> => {
    if (!order) return [];

    const currentStatus = order.status;

    switch (currentStatus) {
      case 'pending':
        return [
          { action: 'confirm', label: 'Confirm Order', color: Colors.success[500], icon: 'checkmark-circle', status: 'confirmed' },
          { action: 'cancel', label: 'Cancel Order', color: Colors.error[500], icon: 'close-circle', status: 'cancelled' }
        ];
      case 'confirmed':
        return [
          { action: 'prepare', label: 'Start Preparing', color: Colors.warning[500], icon: 'restaurant', status: 'preparing' }
        ];
      case 'preparing':
        return [
          { action: 'ready', label: 'Mark Ready', color: Colors.success[500], icon: 'checkmark-done', status: 'ready' }
        ];
      case 'ready':
        return [
          { action: 'out_for_delivery', label: 'Out for Delivery', color: Colors.primary[500], icon: 'bicycle', status: 'out_for_delivery' },
          { action: 'delivered', label: 'Mark Delivered', color: Colors.success[500], icon: 'checkmark-done-circle', status: 'delivered' }
        ];
      case 'out_for_delivery':
        return [
          { action: 'delivered', label: 'Mark Delivered', color: Colors.success[500], icon: 'checkmark-done-circle', status: 'delivered' }
        ];
      default:
        return [];
    }
  }, [order]);

  const handleShareOrder = useCallback(async () => {
    if (!order) return;

    try {
      const shareContent = `Order #${order.orderNumber}\nCustomer: ${order.user?.profile?.firstName || 'Customer'}\nTotal: ₹${order.totals?.total?.toFixed(2) || '0.00'}\nStatus: ${statusLabels[order.status as OrderStatus] || order.status}`;
      
      await Share.share({
        message: shareContent,
        title: `Order #${order.orderNumber}`
      });
    } catch (error) {
      console.error('Error sharing order:', error);
    }
  }, [order]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const formatDateTime = useCallback((dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return `₹${amount?.toFixed(2) || '0.00'}`;
  }, []);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <BodyText>Loading order details...</BodyText>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error[500]} />
        <Heading2 style={styles.errorTitle}>Order Not Found</Heading2>
        <BodyText style={styles.errorSubtitle}>
          The order you're looking for doesn't exist or has been deleted.
        </BodyText>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: Spacing.lg }} />
      </View>
    );
  }

  const availableActions = getAvailableActions();
  const customerName = order.user?.profile?.firstName && order.user?.profile?.lastName
    ? `${order.user.profile.firstName} ${order.user.profile.lastName}`.trim()
    : order.user?.profile?.firstName || order.user?.phoneNumber || 'Unknown Customer';
  const customerEmail = order.user?.profile?.email || '';
  const customerPhone = order.user?.phoneNumber || '';
  const deliveryAddress = order.delivery?.address;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <Card style={styles.headerCard}>
            <View style={styles.headerTop}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.shareButton}
                onPress={handleShareOrder}
              >
                <Ionicons name="share-outline" size={22} color={Colors.primary[600]} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.headerContent}>
              <View style={styles.orderNumberRow}>
                <Heading2 style={styles.orderNumber}>#{order.orderNumber}</Heading2>
                <Badge 
                  variant="default" 
                  style={[styles.statusBadge, { backgroundColor: `${statusColors[order.status as OrderStatus] || Colors.gray[500]}15` }]}
                >
                  <BodyText style={{ 
                    color: statusColors[order.status as OrderStatus] || Colors.gray[500], 
                    fontSize: 11, 
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>
                    {statusLabels[order.status as OrderStatus] || order.status}
                  </BodyText>
                </Badge>
              </View>
              <Caption style={styles.orderDate}>{formatDateTime(order.createdAt)}</Caption>
            </View>
          </Card>
        </Animated.View>

        {/* Customer Information */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="person-circle-outline" size={20} color={Colors.primary[600]} />
                <Heading3 style={styles.cardTitle}>Customer Information</Heading3>
              </View>
            </View>
            
            <View style={styles.customerSection}>
              <View style={styles.customerAvatar}>
                <Heading2 style={styles.avatarText}>
                  {customerName.charAt(0).toUpperCase()}
                </Heading2>
              </View>
              <View style={styles.customerInfo}>
                <Heading3 style={styles.customerName}>{customerName}</Heading3>
                {customerEmail ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="mail-outline" size={14} color={Colors.text.secondary} />
                    <Caption style={styles.infoText}>{customerEmail}</Caption>
                  </View>
                ) : null}
                {customerPhone ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={14} color={Colors.text.secondary} />
                    <Caption style={styles.infoText}>{customerPhone}</Caption>
                  </View>
                ) : null}
              </View>
              <View style={styles.contactButtons}>
                {customerPhone ? (
                  <TouchableOpacity 
                    style={styles.contactButton}
                    onPress={() => Linking.openURL(`tel:${customerPhone}`)}
                  >
                    <Ionicons name="call" size={18} color={Colors.primary[600]} />
                  </TouchableOpacity>
                ) : null}
                {customerEmail ? (
                  <TouchableOpacity 
                    style={styles.contactButton}
                    onPress={() => Linking.openURL(`mailto:${customerEmail}`)}
                  >
                    <Ionicons name="mail" size={18} color={Colors.primary[600]} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Delivery Information */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons 
                  name={order.delivery?.method === 'delivery' || order.delivery?.method === 'standard' ? 'bicycle-outline' : 'storefront-outline'} 
                  size={20} 
                  color={Colors.primary[600]} 
                />
                <Heading3 style={styles.cardTitle}>Delivery Information</Heading3>
              </View>
              {order.delivery?.status && (
                <Badge 
                  variant={order.delivery.status === 'delivered' ? 'success' : order.delivery.status === 'dispatched' ? 'default' : 'warning'} 
                  size="small"
                >
                  {order.delivery.status}
                </Badge>
              )}
            </View>
            
            <View style={styles.deliverySection}>
              <View style={styles.deliveryMethodRow}>
                <Ionicons 
                  name={order.delivery?.method === 'delivery' || order.delivery?.method === 'standard' ? 'bicycle' : 'storefront'} 
                  size={18} 
                  color={Colors.primary[500]} 
                />
                <BodyText style={styles.deliveryMethod}>
                  {order.delivery?.method === 'delivery' || order.delivery?.method === 'standard' ? 'Delivery' : 'Pickup'}
                </BodyText>
              </View>
              
              {deliveryAddress && (
                <View style={styles.addressSection}>
                  {deliveryAddress.name && (
                    <BodyText style={styles.addressName}>{deliveryAddress.name}</BodyText>
                  )}
                  {deliveryAddress.addressLine1 && (
                    <Caption style={styles.addressLine}>{deliveryAddress.addressLine1}</Caption>
                  )}
                  {(deliveryAddress.city || deliveryAddress.state || deliveryAddress.pincode) && (
                    <Caption style={styles.addressLine}>
                      {[deliveryAddress.city, deliveryAddress.state, deliveryAddress.pincode].filter(Boolean).join(', ')}
                    </Caption>
                  )}
                  {deliveryAddress.country && (
                    <Caption style={styles.addressLine}>{deliveryAddress.country}</Caption>
                  )}
                  {deliveryAddress.phone && (
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={12} color={Colors.text.tertiary} />
                      <Caption style={styles.addressLine}>{deliveryAddress.phone}</Caption>
                    </View>
                  )}
                </View>
              )}
              
              {order.delivery?.trackingId && (
                <View style={styles.trackingSection}>
                  <Caption style={styles.trackingLabel}>Tracking ID:</Caption>
                  <BodyText style={styles.trackingId}>{order.delivery.trackingId}</BodyText>
                </View>
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Payment Information */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="card-outline" size={20} color={Colors.primary[600]} />
                <Heading3 style={styles.cardTitle}>Payment Information</Heading3>
              </View>
              <Badge 
                variant={order.payment?.status === 'paid' ? 'success' : order.payment?.status === 'failed' ? 'error' : 'warning'} 
                size="small"
              >
                {order.payment?.status?.toUpperCase() || 'PENDING'}
              </Badge>
            </View>
            
            <View style={styles.paymentSection}>
              <View style={styles.infoRow}>
                <Caption style={styles.label}>Payment Method</Caption>
                <BodyText style={styles.value}>
                  {paymentMethodLabels[order.payment?.method || ''] || order.payment?.method || 'N/A'}
                </BodyText>
              </View>
              {order.payment?.transactionId && (
                <View style={styles.infoRow}>
                  <Caption style={styles.label}>Transaction ID</Caption>
                  <BodyText style={[styles.value, styles.transactionId]}>{order.payment.transactionId}</BodyText>
                </View>
              )}
              {order.payment?.coinsUsed && order.payment.coinsUsed.totalCoinsValue > 0 && (
                <View style={styles.coinsSection}>
                  <Caption style={styles.label}>Coins Used</Caption>
                  <BodyText style={styles.value}>
                    ₹{order.payment.coinsUsed.totalCoinsValue.toFixed(2)}
                  </BodyText>
                </View>
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Order Items */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="cube-outline" size={20} color={Colors.primary[600]} />
                <Heading3 style={styles.cardTitle}>Order Items ({order.items?.length || 0})</Heading3>
              </View>
            </View>
            
            <View style={styles.itemsSection}>
              {order.items?.map((item: any, index: number) => (
                <View key={item._id || index} style={[styles.itemRow, index < (order.items?.length || 0) - 1 && styles.itemBorder]}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons name="image-outline" size={24} color={Colors.text.tertiary} />
                    </View>
                  )}
                  <View style={styles.itemDetails}>
                    <BodyText style={styles.itemName}>{item.name || 'Unknown Product'}</BodyText>
                    <View style={styles.itemMeta}>
                      <Caption style={styles.itemPrice}>{formatCurrency(item.price)}</Caption>
                      <Caption style={styles.itemQuantity}>× {item.quantity}</Caption>
                    </View>
                    {item.discount > 0 && (
                      <Caption style={styles.itemDiscount}>Discount: {formatCurrency(item.discount)}</Caption>
                    )}
                  </View>
                  <View style={styles.itemTotal}>
                    <Heading3 style={styles.itemTotalAmount}>{formatCurrency(item.subtotal || (item.price * item.quantity))}</Heading3>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Order Summary */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="receipt-outline" size={20} color={Colors.primary[600]} />
                <Heading3 style={styles.cardTitle}>Order Summary</Heading3>
              </View>
            </View>
            
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <BodyText style={styles.summaryLabel}>Subtotal</BodyText>
                <BodyText style={styles.summaryValue}>{formatCurrency(order.totals?.subtotal || 0)}</BodyText>
              </View>
              
              {order.totals?.discount > 0 && (
                <View style={styles.summaryRow}>
                  <BodyText style={[styles.summaryLabel, styles.discountLabel]}>Discount</BodyText>
                  <BodyText style={[styles.summaryValue, styles.discountValue]}>-{formatCurrency(order.totals.discount)}</BodyText>
                </View>
              )}
              
              <View style={styles.summaryRow}>
                <BodyText style={styles.summaryLabel}>Tax</BodyText>
                <BodyText style={styles.summaryValue}>{formatCurrency(order.totals?.tax || 0)}</BodyText>
              </View>
              
              <View style={styles.summaryRow}>
                <BodyText style={styles.summaryLabel}>Delivery Fee</BodyText>
                <BodyText style={styles.summaryValue}>{formatCurrency(order.totals?.delivery || order.delivery?.deliveryFee || 0)}</BodyText>
              </View>
              
              {order.totals?.cashback > 0 && (
                <View style={styles.summaryRow}>
                  <BodyText style={[styles.summaryLabel, styles.cashbackLabel]}>Cashback</BodyText>
                  <BodyText style={[styles.summaryValue, styles.cashbackValue]}>+{formatCurrency(order.totals.cashback)}</BodyText>
                </View>
              )}
              
              {order.totals?.refundAmount > 0 && (
                <View style={styles.summaryRow}>
                  <BodyText style={[styles.summaryLabel, styles.refundLabel]}>Refunded</BodyText>
                  <BodyText style={[styles.summaryValue, styles.refundValue]}>-{formatCurrency(order.totals.refundAmount)}</BodyText>
                </View>
              )}
              
              <Divider style={styles.summaryDivider} />
              
              <View style={styles.summaryRow}>
                <Heading3 style={styles.totalLabel}>Total</Heading3>
                <Heading2 style={styles.totalValue}>{formatCurrency(order.totals?.total || order.totals?.paidAmount || 0)}</Heading2>
              </View>
              
              {order.totals?.paidAmount && order.totals.paidAmount !== order.totals?.total && (
                <View style={styles.summaryRow}>
                  <Caption style={styles.summaryLabel}>Amount Paid</Caption>
                  <Caption style={styles.summaryValue}>{formatCurrency(order.totals.paidAmount)}</Caption>
                </View>
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Order Timeline */}
        {order.timeline && order.timeline.length > 0 && (
          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="time-outline" size={20} color={Colors.primary[600]} />
                  <Heading3 style={styles.cardTitle}>Order Timeline</Heading3>
                </View>
              </View>
              
              <View style={styles.timelineSection}>
                {order.timeline.map((event: any, index: number) => (
                  <View key={event._id || index} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    {index < order.timeline.length - 1 && <View style={styles.timelineLine} />}
                    <View style={styles.timelineContent}>
                      <BodyText style={styles.timelineStatus}>
                        {statusLabels[event.status as OrderStatus] || event.status}
                      </BodyText>
                      {event.message && (
                        <Caption style={styles.timelineMessage}>{event.message}</Caption>
                      )}
                      <Caption style={styles.timelineTime}>{formatDateTime(event.timestamp)}</Caption>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Order Notes */}
        {order.notes && (
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="document-text-outline" size={20} color={Colors.primary[600]} />
                  <Heading3 style={styles.cardTitle}>Order Notes</Heading3>
                </View>
              </View>
              <View style={styles.notesSection}>
                <BodyText style={styles.notesText}>{order.notes}</BodyText>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Additional Information */}
        <Animated.View entering={FadeInDown.delay(450).springify()}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="information-circle-outline" size={20} color={Colors.primary[600]} />
                <Heading3 style={styles.cardTitle}>Additional Information</Heading3>
              </View>
            </View>
            
            <View style={styles.additionalInfoSection}>
              <View style={styles.infoRow}>
                <Caption style={styles.label}>Order ID</Caption>
                <BodyText style={[styles.value, styles.orderId]}>{order._id}</BodyText>
              </View>
              <View style={styles.infoRow}>
                <Caption style={styles.label}>Priority</Caption>
                <Badge 
                  variant={order.priority === 'urgent' ? 'error' : order.priority === 'high' ? 'warning' : 'success'} 
                  size="small"
                >
                  {order.priority?.toUpperCase() || 'NORMAL'}
                </Badge>
              </View>
              {order.analytics?.source && (
                <View style={styles.infoRow}>
                  <Caption style={styles.label}>Source</Caption>
                  <Badge variant="default" size="small">
                    {order.analytics.source.toUpperCase()}
                  </Badge>
                </View>
              )}
              {order.rating?.ratedAt && (
                <View style={styles.infoRow}>
                  <Caption style={styles.label}>Rated At</Caption>
                  <BodyText style={styles.value}>{formatDateTime(order.rating.ratedAt)}</BodyText>
                </View>
              )}
              <View style={styles.infoRow}>
                <Caption style={styles.label}>Last Updated</Caption>
                <BodyText style={styles.value}>{formatDateTime(order.updatedAt)}</BodyText>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Quick Actions */}
        {availableActions.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="flash-outline" size={20} color={Colors.primary[600]} />
                  <Heading3 style={styles.cardTitle}>Quick Actions</Heading3>
                </View>
              </View>
              <View style={styles.actionsSection}>
                {availableActions.map((action) => (
                  <Button
                    key={action.action}
                    title={action.label}
                    onPress={() => handleStatusUpdate(action.status)}
                    icon={<Ionicons name={action.icon as any} size={18} color={action.color} />}
                    style={[styles.actionButton, { borderColor: action.color }]}
                    textStyle={{ color: action.color, fontWeight: '600' }}
                    variant="ghost"
                    loading={updating}
                  />
                ))}
              </View>
            </Card>
          </Animated.View>
        )}
        
        <Spacer size="xl" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: Colors.gray[50],
  },
  errorTitle: {
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  errorSubtitle: {
    textAlign: 'center',
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  headerCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    ...Shadows.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  shareButton: {
    padding: Spacing.xs,
  },
  headerContent: {
    gap: Spacing.xs,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  orderDate: {
    color: Colors.text.secondary,
    fontSize: 13,
  },
  card: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  customerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.primary[600],
    fontSize: 24,
    fontWeight: '700',
  },
  customerInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoText: {
    color: Colors.text.secondary,
    fontSize: 13,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  contactButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliverySection: {
    gap: Spacing.md,
  },
  deliveryMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  deliveryMethod: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  addressSection: {
    paddingLeft: 26,
    gap: 4,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  addressLine: {
    color: Colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  trackingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  trackingLabel: {
    color: Colors.text.secondary,
  },
  trackingId: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  paymentSection: {
    gap: Spacing.md,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 13,
  },
  value: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  transactionId: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  coinsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsSection: {
    gap: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
  },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  itemPrice: {
    color: Colors.text.secondary,
    fontSize: 13,
  },
  itemQuantity: {
    color: Colors.text.secondary,
    fontSize: 13,
  },
  itemDiscount: {
    color: Colors.success[600],
    fontSize: 12,
  },
  itemTotal: {
    alignItems: 'flex-end',
  },
  itemTotalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  summarySection: {
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  summaryValue: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  discountLabel: {
    color: Colors.success[600],
  },
  discountValue: {
    color: Colors.success[600],
    fontWeight: '600',
  },
  cashbackLabel: {
    color: Colors.primary[600],
  },
  cashbackValue: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  refundLabel: {
    color: Colors.error[600],
  },
  refundValue: {
    color: Colors.error[600],
    fontWeight: '600',
  },
  summaryDivider: {
    marginVertical: Spacing.sm,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary[600],
  },
  timelineSection: {
    gap: Spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary[500],
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 16,
    width: 2,
    height: '100%',
    backgroundColor: Colors.border.light,
  },
  timelineContent: {
    flex: 1,
    gap: 2,
    paddingBottom: Spacing.md,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  timelineMessage: {
    color: Colors.text.secondary,
    fontSize: 12,
  },
  timelineTime: {
    color: Colors.text.tertiary,
    fontSize: 11,
  },
  notesSection: {
    padding: Spacing.md,
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.md,
  },
  notesText: {
    color: Colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  additionalInfoSection: {
    gap: Spacing.md,
  },
  orderId: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: Colors.text.secondary,
  },
  actionsSection: {
    gap: Spacing.sm,
  },
  actionButton: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
  },
});

