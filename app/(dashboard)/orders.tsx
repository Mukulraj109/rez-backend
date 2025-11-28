import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  FlatList, 
  RefreshControl,
  Dimensions,
  Alert,
  Pressable,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  FadeInRight,
  SlideInRight,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { Colors, Spacing, Shadows, BorderRadius, Typography } from '@/constants/DesignTokens';
import { Card, Heading2, Heading3, BodyText, Caption, Badge, Button } from '@/components/ui/DesignSystemComponents';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { ordersService } from '@/services';
import { useOrderRealTime } from '@/hooks/useRealTimeUpdates';
import type { OrderListResponse } from '@/services/api/orders';
import { 
  Order, 
  OrderStatus
} from '@/types/api';

const { width } = Dimensions.get('window');

type StatusFilter = OrderStatus | 'all';

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

interface StatusTabProps {
  status: StatusFilter;
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}

const StatusTab = ({ status, label, count, active, onPress }: StatusTabProps) => (
  <Pressable
    style={[
        styles.statusTab, 
        active && styles.activeStatusTab,
        active && { backgroundColor: status === 'all' ? Colors.primary[500] : statusColors[status as OrderStatus] || Colors.primary[500], borderColor: 'transparent' }
    ]}
    onPress={onPress}
  >
    <BodyText style={[styles.statusTabText, active && styles.activeStatusTabText]}>
      {label}
    </BodyText>
    <View style={[styles.statusCount, active && styles.activeStatusCount]}>
      <Caption style={[styles.statusCountText, active && styles.activeStatusCountText]}>
        {count}
      </Caption>
    </View>
  </Pressable>
);

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  onQuickAction: (orderId: string, action: string) => void;
  index: number;
}

const OrderCard = ({ order, onPress, onQuickAction, index }: OrderCardProps) => {
  const scale = useSharedValue(1);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);

  const timeAgo = React.useMemo(() => {
    if (!order.createdAt) return 'Unknown';
    const now = new Date();
    const orderDate = new Date(order.createdAt);
    const diffInMinutes = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  }, [order.createdAt]);

  const isUrgent = order.priority === 'urgent' || 
    (order.status === 'pending' && 
     order.createdAt &&
     (new Date().getTime() - new Date(order.createdAt).getTime()) > 2 * 60 * 60 * 1000);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { perspective: 1000 },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
      ],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
    rotateX.value = withTiming(2);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    rotateX.value = withTiming(0);
    rotateY.value = withTiming(0);
  };

  const paymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'razorpay': return 'card';
      case 'wallet': return 'wallet';
      case 'cod': return 'cash';
      case 'upi': return 'phone-portrait';
      default: return 'card';
    }
  };

  const formatAddress = (address: any) => {
    if (typeof address === 'string') return address;
    if (!address) return 'No address';
    const parts = [
      address.addressLine1,
      address.city,
      address.state,
      address.pincode,
    ].filter(Boolean);
    return parts.join(', ') || 'No address';
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 50).springify()}
      style={animatedStyle}
    >
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [
        styles.orderCardContainer,
        isUrgent && styles.urgentCardContainer,
        pressed && styles.pressedCard,
      ]}
    >
      <Card
        style={[styles.orderCard, isUrgent && styles.urgentCard]}
        padding="md"
      >
        {/* Gradient Header Background */}
        <View style={[styles.gradientHeader, { backgroundColor: `${statusColors[order.status]}15` }]}>
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <View style={styles.orderNumberRow}>
                <Heading3 style={styles.orderNumber}>#{order.orderNumber}</Heading3>
                {isUrgent && (
                  <Animated.View entering={ZoomIn.springify()}>
                    <Badge variant="error" size="small" style={styles.urgentBadge}>
                      <Ionicons name="flash" size={10} color="#FFF" />
                      <BodyText style={{ color: '#FFF', fontSize: 9, fontWeight: '700', marginLeft: 2 }}>
                        URGENT
                      </BodyText>
                    </Badge>
                  </Animated.View>
                )}
              </View>
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={12} color={Colors.text.tertiary} />
                <Caption style={styles.timeAgo}>{timeAgo}</Caption>
              </View>
            </View>
            
            <View style={styles.orderTotal}>
              <Heading2 style={styles.totalAmount}>
                ₹{(order.pricing?.totalAmount || 0).toFixed(2)}
              </Heading2>
              <Badge 
                variant="default" 
                style={[styles.statusBadge, { backgroundColor: `${statusColors[order.status]}20` }]}
              >
                <View style={[styles.statusDot, { backgroundColor: statusColors[order.status] }]} />
                <BodyText style={{ color: statusColors[order.status], fontSize: 11, fontWeight: '700', marginLeft: 4 }}>
                  {statusLabels[order.status]}
                </BodyText>
              </Badge>
            </View>
          </View>
        </View>
      
        {/* Store Logo & Info */}
        {order.store && (
          <Animated.View entering={SlideInRight.delay(100)} style={styles.storeInfoRow}>
            {order.store.logo && (
              <Image
                source={{ uri: order.store.logo }}
                style={styles.storeLogo}
                contentFit="cover"
                transition={200}
              />
            )}
            <View style={styles.storeInfo}>
              <BodyText style={styles.storeName}>{order.store.name || 'Unknown Store'}</BodyText>
              <Caption style={styles.storeLabel}>Store</Caption>
            </View>
          </Animated.View>
        )}

        {/* Customer Info with Enhanced Design */}
        <View style={styles.customerInfo}>
          <Animated.View 
            entering={ZoomIn.delay(150)}
            style={[styles.customerAvatar, { backgroundColor: `${statusColors[order.status]}20` }]}
          >
            <Heading3 style={[styles.customerInitial, { color: statusColors[order.status] }]}>
              {order.customer?.name?.charAt(0).toUpperCase() || '?'}
            </Heading3>
          </Animated.View>
          <View style={styles.customerDetails}>
              <BodyText style={styles.customerName}>
                {order.customer?.name ? order.customer.name : 'Unknown Customer'}
              </BodyText>
            <View style={styles.customerContactRow}>
              <Ionicons name="call-outline" size={12} color={Colors.text.secondary} />
              <Caption style={styles.customerContact}>{order.customer?.phone || 'No phone'}</Caption>
            </View>
            {order.customer?.email && (
              <View style={styles.customerContactRow}>
                <Ionicons name="mail-outline" size={12} color={Colors.text.secondary} />
                <Caption style={styles.customerEmail}>{order.customer.email}</Caption>
              </View>
            )}
          </View>
          
          <View style={styles.deliveryMethodBadge}>
            {order.delivery?.method === 'delivery' ? (
              <Ionicons name="bicycle" size={24} color={Colors.success[500]} />
            ) : (
              <Ionicons name="storefront" size={24} color={Colors.primary[500]} />
            )}
          </View>
        </View>
      
        {/* Order Items with Images */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Caption style={styles.itemsCount}>
              {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
            </Caption>
            {(order.pricing?.cashback || 0) > 0 && (
              <Badge variant="success" size="small" style={styles.cashbackBadge}>
                <Ionicons name="gift" size={10} color={Colors.success[600]} />
                <Caption style={{ color: Colors.success[600], fontSize: 10, fontWeight: '700', marginLeft: 2 }}>
                  ₹{order.pricing.cashback} Cashback
                </Caption>
              </Badge>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
            {order.items?.map((item: any, itemIndex: number) => (
              <Animated.View 
                key={item.id || itemIndex}
                entering={FadeInRight.delay(itemIndex * 50)}
                style={styles.itemCard}
              >
                {item.image && (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.itemImage}
                    contentFit="cover"
                    transition={200}
                  />
                )}
                <View style={styles.itemInfo}>
                  <BodyText style={styles.itemName} numberOfLines={1}>
                    {item.productName || 'Unknown Product'}
                  </BodyText>
                  <View style={styles.itemDetails}>
                    <Caption style={styles.itemQuantity}>Qty: {item.quantity}</Caption>
                    <BodyText style={styles.itemPrice}>₹{item.total.toFixed(2)}</BodyText>
                  </View>
                  {item.discount > 0 && (
                    <Badge variant="warning" size="small" style={styles.discountBadge}>
                      -₹{item.discount}
                    </Badge>
                  )}
                </View>
              </Animated.View>
            ))}
          </ScrollView>
        </View>

        {/* Payment & Delivery Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons 
              name={paymentMethodIcon((order as any).payment?.method)} 
              size={16} 
              color={Colors.primary[500]} 
            />
            <View style={styles.infoContent}>
              <Caption style={styles.infoLabel}>Payment</Caption>
              <BodyText style={styles.infoValue}>
                {((order as any).payment?.method ? (order as any).payment.method : 'Unknown').toUpperCase()}
              </BodyText>
              {(order as any).payment?.transactionId && (
                <Caption style={styles.transactionId}>
                  {(order as any).payment.transactionId}
                </Caption>
              )}
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons 
              name="location-outline" 
              size={16} 
              color={Colors.success[500]} 
            />
            <View style={styles.infoContent}>
              <Caption style={styles.infoLabel}>Delivery</Caption>
              <BodyText style={styles.infoValue} numberOfLines={1}>
                {formatAddress((order.delivery as any)?.fullAddress || order.delivery?.address) || 'No address'}
              </BodyText>
            </View>
          </View>
        </View>
      
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {order.status === 'pending' && (
          <>
            <Button
                title="Accept"
                size="small"
                variant="ghost"
                onPress={(e: any) => {
                    // e.stopPropagation(); // Handled by Pressable inside Button if customized, but here simpler
                    const orderId = order.id || (order as any)._id;
                    if (orderId) onQuickAction(orderId, 'confirm');
                }}
                style={{ borderColor: Colors.success[500], borderWidth: 1 }}
                textStyle={{ color: Colors.success[500] }}
                icon={<Ionicons name="checkmark" size={16} color={Colors.success[500]} />}
            />
             <Button
                title="Decline"
                size="small"
                variant="ghost"
                onPress={() => {
                  const orderId = order.id || (order as any)._id;
                  if (orderId) onQuickAction(orderId, 'cancel');
                }}
                style={{ borderColor: Colors.error[500], borderWidth: 1 }}
                textStyle={{ color: Colors.error[500] }}
                icon={<Ionicons name="close" size={16} color={Colors.error[500]} />}
            />
          </>
        )}
        
        {order.status === 'confirmed' && (
            <Button
                title="Start Preparing"
                size="small"
                variant="ghost"
                onPress={() => {
                  const orderId = order.id || (order as any)._id;
                  if (orderId) onQuickAction(orderId, 'prepare');
                }}
                style={{ borderColor: Colors.warning[500], borderWidth: 1 }}
                textStyle={{ color: Colors.warning[500] }}
                icon={<Ionicons name="restaurant" size={16} color={Colors.warning[500]} />}
            />
        )}
        
        {order.status === 'preparing' && (
             <Button
                title="Mark Ready"
                size="small"
                variant="ghost"
                onPress={() => {
                  const orderId = order.id || (order as any)._id;
                  if (orderId) onQuickAction(orderId, 'ready');
                }}
                style={{ borderColor: Colors.success[500], borderWidth: 1 }}
                textStyle={{ color: Colors.success[500] }}
                icon={<Ionicons name="checkmark-circle" size={16} color={Colors.success[500]} />}
            />
        )}
      </View>
      </Card>
    </Pressable>
    </Animated.View>
  );
};

export default function OrdersScreen() {
  const { state } = useAuth();
  const { stores, activeStore } = useStore();
  const realTime = useOrderRealTime();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'total'>('created');
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(activeStore?._id);
  
  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus | 'all', number> = {
      all: orders.length,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0
    };
    
    orders.forEach(order => {
      counts[order.status]++;
    });
    
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = activeFilter === 'all' 
      ? orders 
      : orders.filter(order => order.status === activeFilter);
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 3, high: 2, normal: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'total':
          return (b.pricing?.totalAmount || 0) - (a.pricing?.totalAmount || 0);
        case 'created':
        default:
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
      }
    });
  }, [orders, activeFilter, sortBy]);

  const fetchOrders = useCallback(async () => {
    try {
      // Map client-side sortBy to API sortBy values
      const apiSortByMap: Record<'created' | 'priority' | 'total', 'createdAt' | 'total' | 'status' | 'orderNumber'> = {
        'created': 'createdAt',
        'total': 'total',
        'priority': 'status', // Priority sorting might not be available, using status as fallback
      };
      
      // Only include storeId if it's not empty/undefined
      const params: any = {
        sortBy: apiSortByMap[sortBy] || 'createdAt',
        limit: 50,
        page: 1,
      };
      
      if (selectedStoreId) {
        params.storeId = selectedStoreId;
      }
      
      console.log('📦 [ORDERS] Fetching orders with params:', params);
      const result = await ordersService.getOrders(params);
      
      console.log('📦 [ORDERS] API Response:', JSON.stringify(result, null, 2));
      console.log('📦 [ORDERS] Orders array:', result.orders);
      console.log('📦 [ORDERS] Orders count:', result.orders?.length);
      
      // Map API response to frontend Order type structure
      const mappedOrders = (result.orders || []).map((order: any) => ({
        id: order._id || order.id,
        _id: order._id,
        orderNumber: order.orderNumber,
        merchantId: order.merchantId || '',
        customer: {
          id: order.user?._id || '',
          name: (() => {
            const firstName = order.user?.profile?.firstName;
            const lastName = order.user?.profile?.lastName;
            if (firstName && lastName) {
              return `${firstName} ${lastName}`.trim();
            }
            if (firstName) return firstName;
            if (lastName) return lastName;
            if (order.user?.phoneNumber) return order.user.phoneNumber;
            return 'Unknown Customer';
          })(),
          email: order.user?.profile?.email || '',
          phone: order.user?.phoneNumber || '',
        },
        items: (order.items || []).map((item: any) => ({
          id: item._id || item.id,
          productId: item.product?._id || item.productId || '',
          productName: item.name || item.productName || 'Unknown Product',
          quantity: item.quantity || 0,
          price: item.price || 0,
          total: item.subtotal || (item.price || 0) * (item.quantity || 0),
          customizations: item.customizations || [],
          image: item.image || item.product?.images?.[0] || item.product?.image || null,
          discount: item.discount || 0,
        })),
        status: order.status || 'pending',
        paymentStatus: order.payment?.status || order.paymentStatus || 'pending',
        payment: {
          method: order.payment?.method || 'unknown',
          status: order.payment?.status || 'pending',
          transactionId: order.payment?.transactionId || '',
          coinsUsed: order.payment?.coinsUsed || null,
        },
        pricing: {
          subtotal: order.totals?.subtotal || 0,
          tax: order.totals?.tax || 0,
          delivery: order.totals?.delivery || order.delivery?.deliveryFee || 0,
          discount: order.totals?.discount || 0,
          cashback: order.totals?.cashback || 0,
          totalAmount: order.totals?.total || order.totals?.paidAmount || 0,
          paidAmount: order.totals?.paidAmount || order.totals?.total || 0,
          refundAmount: order.totals?.refundAmount || 0,
        },
        delivery: {
          method: order.delivery?.method || 'pickup',
          address: order.delivery?.address?.addressLine1 || order.delivery?.address || '',
          fullAddress: order.delivery?.address || null,
          estimatedTime: order.delivery?.estimatedTime || '',
          deliveryFee: order.delivery?.deliveryFee || 0,
          status: order.delivery?.status || 'pending',
        },
        priority: order.priority || 'normal',
        createdAt: order.createdAt || '',
        updatedAt: order.updatedAt || '',
        notes: order.notes || '',
        store: order.store || undefined,
        timeline: order.timeline || [],
        rating: order.rating || null,
        analytics: order.analytics || null,
      }));
      
      console.log('📦 [ORDERS] Mapped orders:', mappedOrders);
      if (mappedOrders.length > 0) {
        console.log('📦 [ORDERS] First mapped order:', JSON.stringify(mappedOrders[0], null, 2));
      }
      
      setOrders(mappedOrders);
    } catch (error: any) {
      console.error('❌ Error fetching orders:', error);
      const errorMessage = error.message || 'Failed to fetch orders. Please try again.';
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStoreId, sortBy]);

  const createSampleData = useCallback(async () => {
    try {
      await ordersService.createSampleData();
      await fetchOrders();
    } catch (error) {
      console.error('❌ Error creating sample data:', error);
      Alert.alert('Error', 'Failed to create sample orders. Please try again.');
    }
  }, [fetchOrders]);

  const handleQuickAction = useCallback(async (orderId: string, action: string) => {
    const actionStatusMap: Record<string, OrderStatus> = {
      confirm: 'confirmed',
      prepare: 'preparing', 
      ready: 'ready',
      cancel: 'cancelled'
    };

    const newStatus = actionStatusMap[action];
    if (!newStatus) return;

    try {
      await ordersService.updateOrderStatus(orderId, {
        status: newStatus,
        notifyCustomer: true
      });
      
      await fetchOrders(); // Refresh the orders list
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status. Please try again.');
    }
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle real-time order events
  useEffect(() => {
    if (realTime.orderEvents && realTime.orderEvents.length > 0) {
      const latestEvent = realTime.orderEvents[0];

      switch (latestEvent.type) {
        case 'order_created':
          if (latestEvent.data) {
            setOrders(prev => [latestEvent.data, ...prev]);
            setNewOrdersCount(prev => prev + 1);
            
            Alert.alert(
              'New Order Received',
              `Order #${latestEvent.data.orderNumber} has been placed.`,
              [{ text: 'OK', onPress: () => setNewOrdersCount(0) }]
            );
          }
          break;

        case 'order_updated':
          if (latestEvent.data) {
            setOrders(prev => prev.map(order => 
              order.id === latestEvent.data.id ? latestEvent.data : order
            ));
          }
          break;

        default:
          break;
      }
    }
  }, [realTime.orderEvents]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <BodyText>Loading orders...</BodyText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <Heading2 style={styles.headerTitle}>Orders</Heading2>
            {newOrdersCount > 0 && (
              <Animated.View entering={ZoomIn.springify()}>
                <Badge variant="success" size="small" style={styles.newOrdersBadge}>
                  <Ionicons name="add-circle" size={12} color="#FFF" />
                  <BodyText style={{ color: '#FFF', fontSize: 11, fontWeight: '700', marginLeft: 2 }}>
                    +{newOrdersCount}
                  </BodyText>
                </Badge>
              </Animated.View>
            )}
          </View>
          <Caption style={styles.headerSubtitle}>
            {`${filteredOrders.length} ${filteredOrders.length === 1 ? 'order' : 'orders'} total`}
          </Caption>
        </View>
        <View style={styles.headerRight}>
          <Animated.View 
            entering={FadeInRight.delay(100)}
            style={[styles.realtimeIndicator, { 
              backgroundColor: realTime.isConnected ? `${Colors.success[500]}15` : `${Colors.error[500]}15` 
            }]}
          >
            <Animated.View 
              style={[
                styles.realtimeStatusDot, 
                { backgroundColor: realTime.isConnected ? Colors.success[500] : Colors.error[500] }
              ]} 
            />
            <BodyText style={[
              styles.realtimeText,
              { color: realTime.isConnected ? Colors.success[600] : Colors.error[600] }
            ]}>
              {realTime.isConnected ? 'Live' : 'Offline'}
            </BodyText>
          </Animated.View>
          
          <TouchableOpacity 
            style={styles.analyticsButton}
            onPress={() => router.push('/orders/analytics')}
          >
            <View style={styles.analyticsButtonInner}>
              <Ionicons name="analytics" size={20} color={Colors.primary[500]} />
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Store Filter */}
      {stores.length > 1 && (
        <View style={styles.storeFilterContainer}>
          <BodyText style={styles.storeFilterLabel}>Filter by Store:</BodyText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storeFilterContent}
            style={styles.storeFilterScroll}
          >
            <TouchableOpacity
              style={[
                styles.storeFilterButton,
                !selectedStoreId && styles.storeFilterButtonActive,
              ]}
              onPress={() => setSelectedStoreId(undefined)}
            >
              <BodyText
                style={[
                  styles.storeFilterText,
                  !selectedStoreId && styles.storeFilterTextActive,
                ]}
              >
                All Stores
              </BodyText>
            </TouchableOpacity>
            {stores.map((store) => (
              <TouchableOpacity
                key={store._id}
                style={[
                  styles.storeFilterButton,
                  selectedStoreId === store._id && styles.storeFilterButtonActive,
                ]}
                onPress={() => setSelectedStoreId(store._id)}
              >
                <BodyText
                  style={[
                    styles.storeFilterText,
                    selectedStoreId === store._id && styles.storeFilterTextActive,
                  ]}
                >
                  {store.name}
                </BodyText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Status Filter Tabs */}
      <View style={{ height: 60 }}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.statusTabs}
        contentContainerStyle={styles.statusTabsContent}
      >
        <StatusTab
          status="all"
          label="All"
          count={statusCounts.all}
          active={activeFilter === 'all'}
          onPress={() => setActiveFilter('all')}
        />
        {(Object.entries(statusCounts) as Array<[StatusFilter, number]>)
          .filter(([status]) => status !== 'all' && statusCounts[status] > 0)
          .map(([status, count]) => (
            <StatusTab
              key={status}
              status={status}
              label={statusLabels[status as OrderStatus]}
              count={count}
              active={activeFilter === status}
              onPress={() => setActiveFilter(status)}
            />
          ))}
      </ScrollView>
      </View>

      {/* Sort Controls */}
      <View style={styles.controls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['created', 'priority', 'total'].map((sort) => (
            <TouchableOpacity
              key={sort}
              style={[styles.sortButton, sortBy === sort && styles.activeSortButton]}
              onPress={() => setSortBy(sort as 'created' | 'priority' | 'total')}
            >
              <Caption style={[styles.sortButtonText, sortBy === sort && styles.activeSortButtonText]}>
                {sort === 'created' ? 'Date' : sort === 'priority' ? 'Priority' : 'Total'}
              </Caption>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={({ item, index }) => (
          <OrderCard
            order={item}
            index={index}
            onPress={() => {
              // Use _id first since that's what the API expects
              const orderId = (item as any)._id || item.id;
              console.log('📦 [ORDERS] Navigating to order detail with ID:', orderId);
              if (orderId) {
                router.push(`/orders/${orderId}`);
              } else {
                console.error('📦 [ORDERS] No order ID available for navigation');
              }
            }}
            onQuickAction={handleQuickAction}
          />
        )}
        keyExtractor={(item) => item.id || (item as any)._id || `order-${item.orderNumber}`}
        contentContainerStyle={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={Colors.gray[300]} />
            <Heading3 style={styles.emptyStateTitle}>No Orders Found</Heading3>
            <BodyText style={styles.emptyStateSubtitle}>
              {activeFilter === 'all' 
                ? "You don't have any orders yet" 
                : `No ${statusLabels[activeFilter as OrderStatus]?.toLowerCase()} orders`}
            </BodyText>
            {orders.length === 0 && (
              <Button 
                title="Create Sample Orders"
                onPress={createSampleData}
                style={{ marginTop: Spacing.lg }}
              />
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: '800',
    fontSize: 28,
    color: Colors.text.primary,
  },
  headerSubtitle: {
    color: Colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  newOrdersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  realtimeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  realtimeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  analyticsButton: {
    padding: 4,
  },
  analyticsButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTabs: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  statusTabsContent: {
    gap: 8,
    paddingRight: Spacing.base,
  },
  statusTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: Colors.background.primary,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    gap: 8,
    shadowColor: Colors.gray[300],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeStatusTab: {
    // Background color handled inline for dynamic status color
  },
  statusTabText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  activeStatusTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusCount: {
    backgroundColor: Colors.gray[100],
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activeStatusCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  activeStatusCountText: {
    color: '#FFFFFF',
  },
  controls: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.primary,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    shadowColor: Colors.gray[300],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeSortButton: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
    shadowColor: Colors.primary[500],
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sortButtonText: {
    color: Colors.text.secondary,
    fontWeight: '600',
    fontSize: 12,
  },
  activeSortButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  ordersList: {
    padding: Spacing.base,
    gap: Spacing.md,
    paddingBottom: 80,
  },
  orderCardContainer: {
    marginBottom: Spacing.md,
  },
  urgentCardContainer: {
    shadowColor: Colors.error[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pressedCard: {
    opacity: 0.9,
  },
  orderCard: {
    gap: 0,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.background.primary,
    ...Shadows.md,
  },
  urgentCard: {
    borderLeftWidth: 5,
    borderLeftColor: Colors.error[500],
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  gradientHeader: {
    padding: Spacing.md,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    margin: -Spacing.md,
    marginBottom: Spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderInfo: {
    flex: 1,
    gap: 6,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  orderNumber: {
    color: Colors.text.primary,
    fontWeight: '700',
    fontSize: 18,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeAgo: {
    color: Colors.text.tertiary,
    fontSize: 11,
  },
  orderTotal: {
    alignItems: 'flex-end',
    gap: 6,
  },
  totalAmount: {
    color: Colors.primary[700],
    fontWeight: '800',
    fontSize: 22,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  storeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  storeLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontWeight: '700',
    fontSize: 13,
    color: Colors.text.primary,
  },
  storeLabel: {
    fontSize: 10,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary[100],
  },
  customerInitial: {
    fontSize: 20,
    fontWeight: '700',
  },
  customerDetails: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    fontWeight: '700',
    fontSize: 15,
    color: Colors.text.primary,
  },
  customerContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerContact: {
    color: Colors.text.secondary,
    fontSize: 12,
  },
  customerEmail: {
    color: Colors.text.secondary,
    fontSize: 11,
  },
  deliveryMethodBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsSection: {
    paddingVertical: Spacing.md,
    gap: 8,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemsCount: {
    fontWeight: '700',
    fontSize: 12,
    color: Colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemsScroll: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  itemCard: {
    width: 120,
    marginRight: 12,
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  itemImage: {
    width: '100%',
    height: 80,
    backgroundColor: Colors.gray[200],
  },
  itemInfo: {
    padding: 8,
    gap: 4,
  },
  itemName: {
    fontWeight: '600',
    fontSize: 12,
    color: Colors.text.primary,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemQuantity: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  itemPrice: {
    fontWeight: '700',
    fontSize: 12,
    color: Colors.primary[600],
  },
  discountBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 10,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  transactionId: {
    fontSize: 9,
    color: Colors.text.tertiary,
    fontFamily: 'monospace',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyStateTitle: {
    color: Colors.text.primary,
  },
  emptyStateSubtitle: {
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  storeFilterContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  storeFilterLabel: {
      marginBottom: 4,
      fontWeight: '600',
  },
  storeFilterScroll: {
      maxHeight: 40,
  },
  storeFilterContent: {
      gap: 8,
      alignItems: 'center',
  },
  storeFilterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: Colors.background.primary,
      borderWidth: 1.5,
      borderColor: Colors.border.default,
      shadowColor: Colors.gray[300],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
  },
  storeFilterButtonActive: {
      backgroundColor: Colors.primary[500],
      borderColor: Colors.primary[500],
      shadowColor: Colors.primary[500],
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
  },
  storeFilterText: {
      fontSize: 12,
      color: Colors.text.primary,
  },
  storeFilterTextActive: {
      color: Colors.text.inverse,
      fontWeight: '600',
  },
});
