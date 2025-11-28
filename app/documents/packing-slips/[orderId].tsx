import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
  TextInput
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { ordersService } from '@/services';
import { Order, OrderItem } from '@/types/api';

interface PackingSlipItem extends OrderItem {
  packed: boolean;
}

export default function PackingSlipScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [items, setItems] = useState<PackingSlipItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [packingNotes, setPackingNotes] = useState<string>('Handle with care');

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const orderData = await ordersService.getOrderById(orderId);
      setOrder(orderData);

      // Initialize packing checklist
      const packingItems: PackingSlipItem[] = orderData.items.map(item => ({
        ...item,
        packed: false
      }));
      setItems(packingItems);
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Error', 'Failed to fetch order details');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const toggleItemPacked = (itemId: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, packed: !item.packed } : item
      )
    );
  };

  const handleGenerateSlip = async () => {
    if (!order) return;

    try {
      setGenerating(true);

      // TODO: Replace with actual API call to backend
      // const response = await fetch(`${API_URL}/merchant/documents/packing-slip/${order.id}`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     items: items.filter(item => item.packed),
      //     notes: packingNotes
      //   })
      // });

      // Mock response for now
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock Cloudinary URL
      const mockUrl = `https://res.cloudinary.com/demo/image/upload/packing-slips/slip_${order.id}.pdf`;
      setSlipUrl(mockUrl);

      Alert.alert('Success', 'Packing slip generated successfully!');
    } catch (error) {
      console.error('Error generating packing slip:', error);
      Alert.alert('Error', 'Failed to generate packing slip');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadSlip = async () => {
    if (!slipUrl || !order) {
      Alert.alert('Error', 'Please generate the packing slip first');
      return;
    }

    try {
      setDownloading(true);

      if (Platform.OS === 'web') {
        window.open(slipUrl, '_blank');
      } else {
        const filename = `packing_slip_${order.orderNumber}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        const downloadResult = await FileSystem.downloadAsync(slipUrl, fileUri);

        if (downloadResult.status === 200) {
          Alert.alert(
            'Success',
            `Packing slip downloaded to: ${downloadResult.uri}`,
            [
              { text: 'OK' },
              {
                text: 'Share',
                onPress: () => handleShareSlip(downloadResult.uri)
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error downloading packing slip:', error);
      Alert.alert('Error', 'Failed to download packing slip');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintSlip = () => {
    if (Platform.OS === 'web' && slipUrl) {
      const printWindow = window.open(slipUrl, '_blank');
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    } else {
      Alert.alert('Print', 'Print functionality is only available on web');
    }
  };

  const handleShareSlip = async (fileUri?: string) => {
    try {
      const uri = fileUri || slipUrl;
      if (!uri) {
        Alert.alert('Error', 'No packing slip available to share');
        return;
      }

      await Share.share({
        message: `Packing Slip for Order #${order?.orderNumber}`,
        url: uri,
        title: 'Share Packing Slip'
      });
    } catch (error) {
      console.error('Error sharing packing slip:', error);
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const packedItemsCount = items.filter(item => item.packed).length;
  const totalItemsCount = items.length;
  const allPacked = packedItemsCount === totalItemsCount;

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText style={styles.loadingText}>Loading order details...</ThemedText>
      </ThemedView>
    );
  }

  if (!order) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.light.error} />
        <ThemedText style={styles.errorTitle}>Order Not Found</ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <View>
              <ThemedText type="title">Packing Slip</ThemedText>
              <ThemedText style={styles.subtitle}>Order #{order.orderNumber}</ThemedText>
            </View>
          </View>
          {slipUrl && (
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
            </View>
          )}
        </View>

        {/* Packing Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <ThemedText type="subtitle">Packing Progress</ThemedText>
            <ThemedText style={styles.progressText}>
              {packedItemsCount} / {totalItemsCount} items
            </ThemedText>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(packedItemsCount / totalItemsCount) * 100}%`,
                  backgroundColor: allPacked ? Colors.light.success : Colors.light.primary
                }
              ]}
            />
          </View>
          {allPacked && (
            <View style={styles.completeMessage}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.light.success} />
              <ThemedText style={styles.completeText}>All items packed!</ThemedText>
            </View>
          )}
        </View>

        {/* Packing Checklist */}
        <View style={styles.checklistCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Item Checklist</ThemedText>

          {items.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.checklistItem, item.packed && styles.checklistItemPacked]}
              onPress={() => toggleItemPacked(item.id)}
            >
              <View style={styles.checkbox}>
                {item.packed && (
                  <Ionicons name="checkmark" size={20} color={Colors.light.success} />
                )}
              </View>

              <View style={styles.itemDetails}>
                <ThemedText style={[styles.itemName, item.packed && styles.itemNamePacked]}>
                  {item.productName}
                </ThemedText>
                <View style={styles.itemInfo}>
                  <ThemedText style={styles.itemQuantity}>Qty: {item.quantity}</ThemedText>
                  <ThemedText style={styles.itemSeparator}>•</ThemedText>
                  <ThemedText style={styles.itemPrice}>{formatCurrency(item.price)}</ThemedText>
                </View>
                {item.customizations && item.customizations.length > 0 && (
                  <ThemedText style={styles.itemCustomizations}>
                    {item.customizations.join(', ')}
                  </ThemedText>
                )}
              </View>

              <ThemedText style={[styles.itemTotal, item.packed && styles.itemTotalPacked]}>
                {formatCurrency(item.total)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Packing Notes */}
        <View style={styles.notesCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Packing Notes</ThemedText>
          <TextInput
            style={styles.notesInput}
            value={packingNotes}
            onChangeText={setPackingNotes}
            placeholder="Add special handling instructions..."
            placeholderTextColor={Colors.light.textMuted}
            multiline
            numberOfLines={3}
          />
          <View style={styles.notesSuggestions}>
            <ThemedText style={styles.suggestionsLabel}>Quick notes:</ThemedText>
            <View style={styles.suggestionButtons}>
              {['Handle with care', 'Fragile items', 'Keep upright', 'Temperature sensitive'].map((note) => (
                <TouchableOpacity
                  key={note}
                  style={styles.suggestionButton}
                  onPress={() => setPackingNotes(note)}
                >
                  <ThemedText style={styles.suggestionText}>{note}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Packing Slip Preview */}
        <View style={styles.previewCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Packing Slip Preview</ThemedText>

          <View style={styles.slipPreview}>
            {/* Header */}
            <View style={styles.slipHeader}>
              <ThemedText style={styles.slipTitle}>PACKING SLIP</ThemedText>
              <ThemedText style={styles.slipOrderNumber}>Order #{order.orderNumber}</ThemedText>
            </View>

            <View style={styles.slipDivider} />

            {/* Order Info */}
            <View style={styles.slipSection}>
              <View style={styles.slipRow}>
                <ThemedText style={styles.slipLabel}>Date:</ThemedText>
                <ThemedText style={styles.slipValue}>{formatDate(order.createdAt)}</ThemedText>
              </View>
              <View style={styles.slipRow}>
                <ThemedText style={styles.slipLabel}>Customer:</ThemedText>
                <ThemedText style={styles.slipValue}>{order.customer.name}</ThemedText>
              </View>
              {order.delivery.address && (
                <View style={styles.slipRow}>
                  <ThemedText style={styles.slipLabel}>Address:</ThemedText>
                  <ThemedText style={styles.slipValue}>{order.delivery.address}</ThemedText>
                </View>
              )}
            </View>

            <View style={styles.slipDivider} />

            {/* Items Table */}
            <View style={styles.slipTable}>
              <View style={styles.slipTableHeader}>
                <ThemedText style={[styles.slipTableHeaderText, { flex: 3 }]}>Item</ThemedText>
                <ThemedText style={[styles.slipTableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</ThemedText>
                <ThemedText style={[styles.slipTableHeaderText, { flex: 1, textAlign: 'center' }]}>✓</ThemedText>
              </View>
              {items.map((item) => (
                <View key={item.id} style={styles.slipTableRow}>
                  <ThemedText style={[styles.slipTableCell, { flex: 3 }]}>
                    {item.productName}
                  </ThemedText>
                  <ThemedText style={[styles.slipTableCell, { flex: 1, textAlign: 'center' }]}>
                    {item.quantity}
                  </ThemedText>
                  <View style={[styles.slipCheckbox, { flex: 1 }]}>
                    {item.packed && <ThemedText style={styles.slipCheckmark}>✓</ThemedText>}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.slipDivider} />

            {/* Summary */}
            <View style={styles.slipSummary}>
              <View style={styles.slipSummaryRow}>
                <ThemedText style={styles.slipSummaryLabel}>Total Items:</ThemedText>
                <ThemedText style={styles.slipSummaryValue}>{totalItemsCount}</ThemedText>
              </View>
              <View style={styles.slipSummaryRow}>
                <ThemedText style={styles.slipSummaryLabel}>Packed Items:</ThemedText>
                <ThemedText style={[styles.slipSummaryValue, { color: allPacked ? Colors.light.success : Colors.light.warning }]}>
                  {packedItemsCount}
                </ThemedText>
              </View>
            </View>

            {/* Notes */}
            {packingNotes && (
              <>
                <View style={styles.slipDivider} />
                <View style={styles.slipNotes}>
                  <ThemedText style={styles.slipNotesTitle}>Special Instructions:</ThemedText>
                  <ThemedText style={styles.slipNotesText}>{packingNotes}</ThemedText>
                </View>
              </>
            )}

            {/* Footer */}
            <View style={styles.slipFooter}>
              <ThemedText style={styles.slipFooterText}>
                Packed by: _____________  Date: _______  Verified by: _____________
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, generating && styles.disabledButton]}
            onPress={handleGenerateSlip}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="document-text" size={20} color="#FFFFFF" />
                <ThemedText style={styles.primaryButtonText}>
                  {slipUrl ? 'Regenerate Slip' : 'Generate Packing Slip'}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>

          {slipUrl && (
            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, downloading && styles.disabledButton]}
                onPress={handleDownloadSlip}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator color={Colors.light.primary} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color={Colors.light.primary} />
                    <ThemedText style={styles.secondaryButtonText}>Download</ThemedText>
                  </>
                )}
              </TouchableOpacity>

              {Platform.OS === 'web' && (
                <TouchableOpacity style={styles.secondaryButton} onPress={handlePrintSlip}>
                  <Ionicons name="print-outline" size={20} color={Colors.light.primary} />
                  <ThemedText style={styles.secondaryButtonText}>Print</ThemedText>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.secondaryButton} onPress={() => handleShareSlip()}>
                <Ionicons name="share-outline" size={20} color={Colors.light.primary} />
                <ThemedText style={styles.secondaryButtonText}>Share</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Order Info */}
        <View style={styles.orderInfoCard}>
          <ThemedText type="subtitle">Order Information</ThemedText>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Status:</ThemedText>
            <ThemedText style={styles.infoValue}>{order.status}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Delivery Method:</ThemedText>
            <ThemedText style={styles.infoValue}>{order.delivery.method}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Total Amount:</ThemedText>
            <ThemedText style={styles.infoValue}>{formatCurrency(order.pricing.totalAmount)}</ThemedText>
          </View>
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
  content: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  completeMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  completeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.success,
  },
  checklistCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    color: Colors.light.text,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  checklistItemPacked: {
    backgroundColor: Colors.light.backgroundTertiary,
    borderColor: Colors.light.success,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  itemNamePacked: {
    textDecorationLine: 'line-through',
    color: Colors.light.textSecondary,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemQuantity: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  itemSeparator: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  itemPrice: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  itemCustomizations: {
    fontSize: 12,
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  itemTotalPacked: {
    color: Colors.light.textSecondary,
  },
  notesCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  notesInput: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  notesSuggestions: {
    gap: 8,
  },
  suggestionsLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  suggestionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  suggestionText: {
    fontSize: 12,
    color: Colors.light.text,
  },
  previewCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  slipPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
    gap: 12,
  },
  slipHeader: {
    alignItems: 'center',
    gap: 4,
  },
  slipTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  slipOrderNumber: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  slipDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
  },
  slipSection: {
    gap: 8,
  },
  slipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slipLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  slipValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  slipTable: {
    gap: 8,
  },
  slipTableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  slipTableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  slipTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  slipTableCell: {
    fontSize: 12,
    color: Colors.light.text,
  },
  slipCheckbox: {
    alignItems: 'center',
  },
  slipCheckmark: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.success,
  },
  slipSummary: {
    gap: 8,
  },
  slipSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slipSummaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  slipSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  slipNotes: {
    gap: 4,
  },
  slipNotesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  slipNotesText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  slipFooter: {
    paddingTop: 8,
  },
  slipFooterText: {
    fontSize: 10,
    color: Colors.light.textMuted,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    minWidth: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.background,
  },
  secondaryButtonText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  orderInfoCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
});
