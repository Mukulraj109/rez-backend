import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Linking,
  Modal,
  TextInput
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Order, OrderStatus } from '../../shared/types';
import { getApiUrl } from '@/config/api';

const statusColors: Record<OrderStatus, string> = {
  pending: '#FF9800',
  confirmed: '#2196F3',
  preparing: '#FF5722',
  ready: '#4CAF50',
  out_for_delivery: '#9C27B0',
  delivered: '#4CAF50',
  cancelled: '#F44336',
  refunded: '#607D8B'
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

interface StatusUpdateModalProps {
  visible: boolean;
  currentStatus: OrderStatus;
  onUpdateStatus: (status: OrderStatus, notes?: string) => void;
  onClose: () => void;
  loading: boolean;
}

const StatusUpdateModal = ({ 
  visible, 
  currentStatus, 
  onUpdateStatus, 
  onClose, 
  loading 
}: StatusUpdateModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(currentStatus);
  const [notes, setNotes] = useState('');

  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['out_for_delivery', 'delivered'],
    out_for_delivery: ['delivered'],
    delivered: ['refunded'],
    cancelled: [],
    refunded: []
  };

  const availableStatuses = validTransitions[currentStatus] || [];

  const handleUpdate = () => {
    if (selectedStatus !== currentStatus) {
      onUpdateStatus(selectedStatus, notes);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <ThemedText style={styles.modalTitle}>Update Order Status</ThemedText>
          <TouchableOpacity 
            onPress={handleUpdate}
            disabled={loading || selectedStatus === currentStatus}
            style={[
              styles.updateButton,
              (loading || selectedStatus === currentStatus) && styles.updateButtonDisabled
            ]}
          >
            <ThemedText style={[
              styles.updateButtonText,
              (loading || selectedStatus === currentStatus) && styles.updateButtonTextDisabled
            ]}>
              {loading ? 'Updating...' : 'Update'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <ThemedText style={styles.sectionTitle}>Current Status</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[currentStatus] }]}>
            <ThemedText style={styles.statusBadgeText}>
              {statusLabels[currentStatus]}
            </ThemedText>
          </View>

          {availableStatuses.length > 0 && (
            <>
              <ThemedText style={styles.sectionTitle}>Change Status To</ThemedText>
              {availableStatuses.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    selectedStatus === status && styles.selectedStatusOption
                  ]}
                  onPress={() => setSelectedStatus(status)}
                >
                  <View style={[styles.statusIndicator, { backgroundColor: statusColors[status] }]} />
                  <ThemedText style={[
                    styles.statusOptionText,
                    selectedStatus === status && styles.selectedStatusOptionText
                  ]}>
                    {statusLabels[status]}
                  </ThemedText>
                  {selectedStatus === status && (
                    <Ionicons name="checkmark" size={20} color="#2196F3" />
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}

          <ThemedText style={styles.sectionTitle}>Notes (Optional)</ThemedText>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about this status change..."
            placeholderTextColor={Colors.light.textSecondary}
            multiline
            numberOfLines={4}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

const OrderTimeline = ({ order }: { order: Order }) => {
  const timelineEvents = [
    { status: 'pending', timestamp: order.createdAt, label: 'Order Placed' },
    { status: 'confirmed', timestamp: order.confirmedAt, label: 'Order Confirmed' },
    { status: 'preparing', timestamp: null, label: 'Started Preparing' },
    { status: 'ready', timestamp: null, label: 'Ready for Pickup/Delivery' },
    { status: 'out_for_delivery', timestamp: null, label: 'Out for Delivery' },
    { status: 'delivered', timestamp: order.deliveredAt, label: 'Delivered' },
  ];

  const currentStatusIndex = timelineEvents.findIndex(event => event.status === order.status);

  return (
    <View style={styles.timeline}>
      {timelineEvents.map((event, index) => {
        const isCompleted = index <= currentStatusIndex;
        const isCurrent = index === currentStatusIndex;
        
        return (
          <View key={event.status} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[
                styles.timelineIcon,
                isCompleted && styles.timelineIconCompleted,
                isCurrent && styles.timelineIconCurrent
              ]}>
                {isCompleted && (
                  <Ionicons 
                    name="checkmark" 
                    size={12} 
                    color={isCurrent ? '#FFFFFF' : '#4CAF50'} 
                  />
                )}
              </View>
              {index < timelineEvents.length - 1 && (
                <View style={[
                  styles.timelineLine,
                  isCompleted && styles.timelineLineCompleted
                ]} />
              )}
            </View>
            <View style={styles.timelineRight}>
              <ThemedText style={[
                styles.timelineLabel,
                isCompleted && styles.timelineLabelCompleted
              ]}>
                {event.label}
              </ThemedText>
              {event.timestamp && (
                <ThemedText style={styles.timelineTimestamp}>
                  {new Date(event.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </ThemedText>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const fetchOrder = async () => {
    if (!id) return;
    
    try {
      const response = await fetch(getApiUrl(`merchant/orders/${id}`), {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setOrder(result.data);
      } else {
        Alert.alert('Error', 'Failed to fetch order details');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Error', 'Failed to fetch order details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: OrderStatus, notes?: string) => {
    if (!order) return;

    setStatusUpdateLoading(true);
    try {
      const response = await fetch(getApiUrl(`merchant/orders/${order.id}/status`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          status: newStatus,
          notes,
          notifyCustomer: true
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setOrder(result.data);
        setShowStatusModal(false);
        Alert.alert('Success', 'Order status updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const formatAddress = (address: any) => {
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
  };

  const openMaps = (address: any) => {
    const addressString = formatAddress(address);
    const url = `https://maps.google.com/?q=${encodeURIComponent(addressString)}`;
    Linking.openURL(url);
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading order details...</ThemedText>
      </ThemedView>
    );
  }

  if (!order) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Order not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          Order #{order.orderNumber}
        </ThemedText>
        <View style={styles.headerRight} />
      </View>

      {/* Order Status Card */}
      <View style={styles.card}>
        <View style={styles.orderStatusHeader}>
          <View style={[styles.statusBadgeLarge, { backgroundColor: statusColors[order.status] }]}>
            <ThemedText style={styles.statusBadgeTextLarge}>
              {statusLabels[order.status]}
            </ThemedText>
          </View>
          <View style={styles.orderMeta}>
            <ThemedText style={styles.orderDate}>
              Placed {new Date(order.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </ThemedText>
            <ThemedText style={styles.orderTotal}>
              Total: ₹${order.pricing.totalAmount.toFixed(2)}
            </ThemedText>
          </View>
        </View>

        {order.priority !== 'normal' && (
          <View style={[styles.priorityBadge, { 
            backgroundColor: order.priority === 'urgent' ? '#F44336' : '#FF9800' 
          }]}>
            <ThemedText style={styles.priorityText}>
              {order.priority.toUpperCase()} PRIORITY
            </ThemedText>
          </View>
        )}
      </View>

      {/* Timeline */}
      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Order Timeline</ThemedText>
        <OrderTimeline order={order} />
      </View>

      {/* Customer Information */}
      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Customer Information</ThemedText>
        <View style={styles.customerDetails}>
          <View style={styles.customerAvatar}>
            <ThemedText style={styles.customerInitial}>
              {order.customer.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.customerInfo}>
            <ThemedText style={styles.customerName}>{order.customer.name}</ThemedText>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.customer.phone}`)}>
              <ThemedText style={styles.customerContact}>{order.customer.phone}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${order.customer.email}`)}>
              <ThemedText style={styles.customerContact}>{order.customer.email}</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.customerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Linking.openURL(`tel:${order.customer.phone}`)}
            >
              <Ionicons name="call" size={20} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Order Items */}
      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Order Items</ThemedText>
        {order.items.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <ThemedText style={styles.itemName}>{item.productName}</ThemedText>
              <ThemedText style={styles.itemSku}>SKU: {item.sku}</ThemedText>
              {item.notes && (
                <ThemedText style={styles.itemNotes}>Note: {item.notes}</ThemedText>
              )}
            </View>
            <View style={styles.itemPricing}>
              <ThemedText style={styles.itemQuantity}>Qty: {item.quantity}</ThemedText>
              <ThemedText style={styles.itemPrice}>₹${item.price.toFixed(2)} each</ThemedText>
              <ThemedText style={styles.itemTotal}>₹${item.totalPrice.toFixed(2)}</ThemedText>
            </View>
          </View>
        ))}

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
            <ThemedText style={styles.summaryValue}>₹${order.pricing.subtotal.toFixed(2)}</ThemedText>
          </View>
          {order.pricing.discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Discount</ThemedText>
              <ThemedText style={[styles.summaryValue, { color: '#4CAF50' }]}>
                -₹${order.pricing.discountAmount.toFixed(2)}
              </ThemedText>
            </View>
          )}
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Tax</ThemedText>
            <ThemedText style={styles.summaryValue}>₹${order.pricing.taxAmount.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Shipping</ThemedText>
            <ThemedText style={styles.summaryValue}>₹${order.pricing.shippingAmount.toFixed(2)}</ThemedText>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={styles.totalValue}>₹${order.pricing.totalAmount.toFixed(2)}</ThemedText>
          </View>
        </View>
      </View>

      {/* Delivery Information */}
      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Delivery Information</ThemedText>
        
        <View style={styles.deliveryMethodBadge}>
          <Ionicons 
            name={order.delivery.method === 'delivery' ? 'bicycle' : 'storefront'} 
            size={16} 
            color="#2196F3" 
          />
          <ThemedText style={styles.deliveryMethodText}>
            {order.delivery.method === 'delivery' ? 'Delivery' : 'Pickup'}
          </ThemedText>
        </View>

        <View style={styles.deliveryAddress}>
          <Ionicons name="location" size={16} color="#757575" />
          <ThemedText style={styles.addressText}>
            {formatAddress(order.delivery.address)}
          </ThemedText>
          <TouchableOpacity
            onPress={() => openMaps(order.delivery.address)}
            style={styles.mapButton}
          >
            <Ionicons name="map" size={16} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {order.delivery.instructions && (
          <View style={styles.deliveryInstructions}>
            <ThemedText style={styles.instructionsLabel}>Delivery Instructions:</ThemedText>
            <ThemedText style={styles.instructionsText}>{order.delivery.instructions}</ThemedText>
          </View>
        )}
      </View>

      {/* Payment & Cashback */}
      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Payment & Cashback</ThemedText>
        
        <View style={styles.paymentInfo}>
          <View style={styles.paymentRow}>
            <ThemedText style={styles.paymentLabel}>Payment Method</ThemedText>
            <ThemedText style={styles.paymentValue}>
              {order.payment.method.replace('_', ' ').toUpperCase()}
            </ThemedText>
          </View>
          
          {order.payment.transactionId && (
            <View style={styles.paymentRow}>
              <ThemedText style={styles.paymentLabel}>Transaction ID</ThemedText>
              <ThemedText style={styles.paymentValue}>{order.payment.transactionId}</ThemedText>
            </View>
          )}

          {order.cashback.amount > 0 && (
            <View style={styles.cashbackRow}>
              <ThemedText style={styles.paymentLabel}>Cashback</ThemedText>
              <View style={styles.cashbackInfo}>
                <ThemedText style={styles.cashbackAmount}>
                  ₹${order.cashback.amount.toFixed(2)}
                </ThemedText>
                <View style={[styles.cashbackStatus, { 
                  backgroundColor: order.cashback.status === 'approved' ? '#4CAF50' : '#FF9800' 
                }]}>
                  <ThemedText style={styles.cashbackStatusText}>
                    {order.cashback.status.toUpperCase()}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.primaryButton, 
            (order.status === 'delivered' || order.status === 'cancelled') && styles.disabledButton
          ]}
          onPress={() => setShowStatusModal(true)}
          disabled={order.status === 'delivered' || order.status === 'cancelled'}
        >
          <ThemedText style={[styles.primaryButtonText,
            (order.status === 'delivered' || order.status === 'cancelled') && styles.disabledButtonText
          ]}>
            Update Status
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Status Update Modal */}
      <StatusUpdateModal
        visible={showStatusModal}
        currentStatus={order.status}
        onUpdateStatus={updateOrderStatus}
        onClose={() => setShowStatusModal(false)}
        loading={statusUpdateLoading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: Colors.light.text,
  },
  headerRight: {
    width: 40,
  },
  card: {
    backgroundColor: Colors.light.background,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  orderStatusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeTextLarge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderMeta: {
    alignItems: 'flex-end',
  },
  orderDate: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  timelineIconCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  timelineIconCurrent: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  timelineLine: {
    width: 2,
    height: 32,
    backgroundColor: '#E0E0E0',
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  timelineRight: {
    flex: 1,
    paddingTop: 2,
  },
  timelineLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  timelineLabelCompleted: {
    color: Colors.light.text,
    fontWeight: '500',
  },
  timelineTimestamp: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  customerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  customerInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
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
  customerContact: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 2,
  },
  customerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  itemInfo: {
    flex: 1,
    marginRight: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 4,
  },
  itemSku: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  itemNotes: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  itemPricing: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  orderSummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.light.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  deliveryMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  deliveryMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
  },
  deliveryAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  mapButton: {
    padding: 4,
  },
  deliveryInstructions: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  paymentInfo: {
    gap: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  cashbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cashbackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cashbackAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  cashbackStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cashbackStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  disabledButtonText: {
    color: '#757575',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  updateButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  updateButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  updateButtonTextDisabled: {
    color: '#757575',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedStatusOption: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  selectedStatusOptionText: {
    fontWeight: '500',
    color: '#2196F3',
  },
  notesInput: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    textAlignVertical: 'top',
    minHeight: 80,
  },
});