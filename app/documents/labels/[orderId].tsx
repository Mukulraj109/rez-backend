import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Share
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { ordersService } from '@/services';
import { Order } from '@/types/api';

interface ShippingCarrier {
  id: string;
  name: string;
  icon: string;
}

const CARRIERS: ShippingCarrier[] = [
  { id: 'fedex', name: 'FedEx', icon: 'airplane' },
  { id: 'ups', name: 'UPS', icon: 'cube' },
  { id: 'usps', name: 'USPS', icon: 'mail' },
  { id: 'dhl', name: 'DHL', icon: 'globe' },
  { id: 'custom', name: 'Custom Carrier', icon: 'business' }
];

export default function ShippingLabelScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [labelUrl, setLabelUrl] = useState<string | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('fedex');
  const [trackingNumber, setTrackingNumber] = useState<string>('');

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const orderData = await ordersService.getOrderById(orderId);
      setOrder(orderData);

      // Pre-fill tracking number if available
      if (orderData.delivery.address) {
        setTrackingNumber(orderData.orderNumber.replace('-', ''));
      }
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

  const handleGenerateLabel = async () => {
    if (!order) return;

    if (!trackingNumber.trim()) {
      Alert.alert('Error', 'Please enter a tracking number');
      return;
    }

    try {
      setGenerating(true);

      // TODO: Replace with actual API call to backend
      // const response = await fetch(`${API_URL}/merchant/documents/label/${order.id}`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     carrier: selectedCarrier,
      //     trackingNumber,
      //     format: '4x6'
      //   })
      // });

      // Mock response for now
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock Cloudinary URL
      const mockUrl = `https://res.cloudinary.com/demo/image/upload/labels/label_${order.id}.pdf`;
      setLabelUrl(mockUrl);

      Alert.alert('Success', 'Shipping label generated successfully!');
    } catch (error) {
      console.error('Error generating label:', error);
      Alert.alert('Error', 'Failed to generate shipping label');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadLabel = async () => {
    if (!labelUrl || !order) {
      Alert.alert('Error', 'Please generate the label first');
      return;
    }

    try {
      setDownloading(true);

      if (Platform.OS === 'web') {
        window.open(labelUrl, '_blank');
      } else {
        const filename = `label_${order.orderNumber}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        const downloadResult = await FileSystem.downloadAsync(labelUrl, fileUri);

        if (downloadResult.status === 200) {
          Alert.alert(
            'Success',
            `Label downloaded to: ${downloadResult.uri}`,
            [
              { text: 'OK' },
              {
                text: 'Share',
                onPress: () => handleShareLabel(downloadResult.uri)
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error downloading label:', error);
      Alert.alert('Error', 'Failed to download label');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintLabel = () => {
    if (Platform.OS === 'web' && labelUrl) {
      const printWindow = window.open(labelUrl, '_blank');
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    } else {
      Alert.alert('Print', 'Print functionality is only available on web');
    }
  };

  const handleShareLabel = async (fileUri?: string) => {
    try {
      const uri = fileUri || labelUrl;
      if (!uri) {
        Alert.alert('Error', 'No label available to share');
        return;
      }

      await Share.share({
        message: `Shipping Label for Order #${order?.orderNumber}`,
        url: uri,
        title: 'Share Shipping Label'
      });
    } catch (error) {
      console.error('Error sharing label:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
              <ThemedText type="title">Shipping Label</ThemedText>
              <ThemedText style={styles.subtitle}>Order #{order.orderNumber}</ThemedText>
            </View>
          </View>
          {labelUrl && (
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
            </View>
          )}
        </View>

        {/* Carrier Selection */}
        <View style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Select Carrier</ThemedText>
          <View style={styles.carrierGrid}>
            {CARRIERS.map((carrier) => (
              <TouchableOpacity
                key={carrier.id}
                style={[
                  styles.carrierOption,
                  selectedCarrier === carrier.id && styles.carrierOptionSelected
                ]}
                onPress={() => setSelectedCarrier(carrier.id)}
              >
                <Ionicons
                  name={carrier.icon as any}
                  size={24}
                  color={selectedCarrier === carrier.id ? Colors.light.primary : Colors.light.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.carrierName,
                    selectedCarrier === carrier.id && styles.carrierNameSelected
                  ]}
                >
                  {carrier.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tracking Number */}
        <View style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Tracking Number</ThemedText>
          <View style={styles.inputContainer}>
            <Ionicons name="barcode-outline" size={20} color={Colors.light.textSecondary} />
            <ThemedText style={styles.input}>{trackingNumber || 'Enter tracking number'}</ThemedText>
          </View>
          <ThemedText style={styles.hint}>
            This will be printed as a barcode on the label
          </ThemedText>
        </View>

        {/* Label Preview */}
        <View style={styles.previewCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Label Preview (4x6")</ThemedText>

          <View style={styles.labelPreview}>
            {/* Thermal Label Format (4x6 inches) */}
            <View style={styles.thermalLabel}>
              {/* Carrier Logo Area */}
              <View style={styles.labelHeader}>
                <View style={styles.carrierLogo}>
                  <Ionicons
                    name={CARRIERS.find(c => c.id === selectedCarrier)?.icon as any || 'cube'}
                    size={32}
                    color={Colors.light.primary}
                  />
                </View>
                <ThemedText style={styles.carrierText}>
                  {CARRIERS.find(c => c.id === selectedCarrier)?.name || 'Carrier'}
                </ThemedText>
              </View>

              <View style={styles.labelDivider} />

              {/* Shipping From */}
              <View style={styles.labelSection}>
                <ThemedText style={styles.labelSectionTitle}>FROM:</ThemedText>
                <ThemedText style={styles.labelText}>Your Business Name</ThemedText>
                <ThemedText style={styles.labelText}>123 Business St</ThemedText>
                <ThemedText style={styles.labelText}>City, State 12345</ThemedText>
              </View>

              <View style={styles.labelDivider} />

              {/* Shipping To */}
              <View style={styles.labelSection}>
                <ThemedText style={styles.labelSectionTitle}>TO:</ThemedText>
                <ThemedText style={[styles.labelText, styles.labelTextBold]}>
                  {order.customer.name}
                </ThemedText>
                {order.delivery.address ? (
                  <ThemedText style={styles.labelText}>{order.delivery.address}</ThemedText>
                ) : (
                  <ThemedText style={[styles.labelText, styles.labelTextMuted]}>
                    No delivery address
                  </ThemedText>
                )}
                {order.customer.phone && (
                  <ThemedText style={styles.labelText}>Ph: {order.customer.phone}</ThemedText>
                )}
              </View>

              <View style={styles.labelDivider} />

              {/* Tracking Barcode Area */}
              <View style={styles.barcodeSection}>
                <View style={styles.barcodePlaceholder}>
                  <Ionicons name="barcode" size={48} color={Colors.light.text} />
                </View>
                <ThemedText style={styles.barcodeText}>
                  {trackingNumber || '1234567890'}
                </ThemedText>
              </View>

              {/* Order Details */}
              <View style={styles.labelFooter}>
                <View style={styles.labelFooterRow}>
                  <ThemedText style={styles.labelFooterLabel}>Order:</ThemedText>
                  <ThemedText style={styles.labelFooterValue}>#{order.orderNumber}</ThemedText>
                </View>
                <View style={styles.labelFooterRow}>
                  <ThemedText style={styles.labelFooterLabel}>Date:</ThemedText>
                  <ThemedText style={styles.labelFooterValue}>{formatDate(order.createdAt)}</ThemedText>
                </View>
                <View style={styles.labelFooterRow}>
                  <ThemedText style={styles.labelFooterLabel}>Weight:</ThemedText>
                  <ThemedText style={styles.labelFooterValue}>1.5 lbs</ThemedText>
                </View>
              </View>

              {/* QR Code */}
              <View style={styles.qrSection}>
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code" size={40} color={Colors.light.text} />
                </View>
                <ThemedText style={styles.qrText}>Scan for tracking</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, generating && styles.disabledButton]}
            onPress={handleGenerateLabel}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="create" size={20} color="#FFFFFF" />
                <ThemedText style={styles.primaryButtonText}>
                  {labelUrl ? 'Regenerate Label' : 'Generate Label'}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>

          {labelUrl && (
            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, downloading && styles.disabledButton]}
                onPress={handleDownloadLabel}
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
                <TouchableOpacity style={styles.secondaryButton} onPress={handlePrintLabel}>
                  <Ionicons name="print-outline" size={20} color={Colors.light.primary} />
                  <ThemedText style={styles.secondaryButtonText}>Print</ThemedText>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.secondaryButton} onPress={() => handleShareLabel()}>
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
            <ThemedText style={styles.infoLabel}>Items:</ThemedText>
            <ThemedText style={styles.infoValue}>{order.items.length} items</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Delivery Method:</ThemedText>
            <ThemedText style={styles.infoValue}>{order.delivery.method}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Status:</ThemedText>
            <ThemedText style={styles.infoValue}>{order.status}</ThemedText>
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
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  cardTitle: {
    color: Colors.light.text,
  },
  carrierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  carrierOption: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    alignItems: 'center',
    gap: 8,
  },
  carrierOptionSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  carrierName: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  carrierNameSelected: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  hint: {
    fontSize: 12,
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },
  previewCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  labelPreview: {
    alignItems: 'center',
  },
  thermalLabel: {
    width: '100%',
    maxWidth: 384, // 4 inches at 96 DPI
    aspectRatio: 4 / 6, // 4x6 ratio
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.light.border,
    padding: 16,
    gap: 12,
  },
  labelHeader: {
    alignItems: 'center',
    gap: 8,
  },
  carrierLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carrierText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  labelDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
  },
  labelSection: {
    gap: 4,
  },
  labelSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.textMuted,
    letterSpacing: 1,
  },
  labelText: {
    fontSize: 12,
    color: Colors.light.text,
  },
  labelTextBold: {
    fontSize: 14,
    fontWeight: '700',
  },
  labelTextMuted: {
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },
  barcodeSection: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  barcodePlaceholder: {
    width: '100%',
    height: 60,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: 2,
  },
  labelFooter: {
    gap: 4,
  },
  labelFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelFooterLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
  },
  labelFooterValue: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.text,
  },
  qrSection: {
    alignItems: 'center',
    gap: 4,
  },
  qrPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrText: {
    fontSize: 8,
    color: Colors.light.textMuted,
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
