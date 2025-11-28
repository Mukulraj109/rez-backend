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
  Linking
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { ordersService } from '@/services';
import { Order } from '@/types/api';

interface InvoiceSettings {
  logo?: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  taxId?: string;
  website?: string;
  primaryColor: string;
  showLogo: boolean;
  showTaxBreakdown: boolean;
  showNotes: boolean;
  footerText?: string;
}

export default function InvoiceViewerScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [settings, setSettings] = useState<InvoiceSettings>({
    companyName: 'Your Business Name',
    address: '123 Business St, City, State 12345',
    phone: '+1 (555) 123-4567',
    email: 'info@yourbusiness.com',
    primaryColor: Colors.light.primary,
    showLogo: true,
    showTaxBreakdown: true,
    showNotes: true,
    footerText: 'Thank you for your business!'
  });

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const orderData = await ordersService.getOrderById(orderId);
      setOrder(orderData);
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

  const handleGenerateInvoice = async () => {
    if (!order) return;

    try {
      setGenerating(true);

      // TODO: Replace with actual API call to backend
      // const response = await fetch(`${API_URL}/merchant/documents/invoice/${order.id}`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ settings })
      // });

      // Mock response for now
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock Cloudinary URL
      const mockUrl = `https://res.cloudinary.com/demo/image/upload/invoices/invoice_${order.id}.pdf`;
      setInvoiceUrl(mockUrl);

      Alert.alert('Success', 'Invoice generated successfully!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      Alert.alert('Error', 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!invoiceUrl || !order) {
      Alert.alert('Error', 'Please generate the invoice first');
      return;
    }

    try {
      setDownloading(true);

      if (Platform.OS === 'web') {
        // Web: Open in new tab
        window.open(invoiceUrl, '_blank');
      } else {
        // Mobile: Download using expo-file-system
        const filename = `invoice_${order.orderNumber}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        const downloadResult = await FileSystem.downloadAsync(invoiceUrl, fileUri);

        if (downloadResult.status === 200) {
          Alert.alert(
            'Success',
            `Invoice downloaded to: ${downloadResult.uri}`,
            [
              { text: 'OK' },
              {
                text: 'Share',
                onPress: () => handleShareInvoice(downloadResult.uri)
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      Alert.alert('Error', 'Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  const handleEmailInvoice = async () => {
    if (!order) return;

    try {
      setEmailing(true);

      // TODO: Replace with actual API call
      // await fetch(`${API_URL}/merchant/documents/invoice/${order.id}/email`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${token}` },
      //   body: JSON.stringify({
      //     recipientEmail: order.customer.email,
      //     message: 'Please find your invoice attached.'
      //   })
      // });

      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert('Success', `Invoice sent to ${order.customer.email}`);
    } catch (error) {
      console.error('Error emailing invoice:', error);
      Alert.alert('Error', 'Failed to send invoice via email');
    } finally {
      setEmailing(false);
    }
  };

  const handlePrintInvoice = () => {
    if (Platform.OS === 'web' && invoiceUrl) {
      // Web: Open print dialog
      const printWindow = window.open(invoiceUrl, '_blank');
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    } else {
      Alert.alert('Print', 'Print functionality is only available on web');
    }
  };

  const handleShareInvoice = async (fileUri?: string) => {
    try {
      const uri = fileUri || invoiceUrl;
      if (!uri) {
        Alert.alert('Error', 'No invoice available to share');
        return;
      }

      await Share.share({
        message: `Invoice for Order #${order?.orderNumber}`,
        url: uri,
        title: 'Share Invoice'
      });
    } catch (error) {
      console.error('Error sharing invoice:', error);
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
              <ThemedText type="title">Invoice</ThemedText>
              <ThemedText style={styles.subtitle}>Order #{order.orderNumber}</ThemedText>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowSettings(!showSettings)}>
            <Ionicons name="settings-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        {/* Invoice Preview Card */}
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <ThemedText type="subtitle">Invoice Preview</ThemedText>
            {invoiceUrl && (
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
                <ThemedText style={styles.statusText}>Generated</ThemedText>
              </View>
            )}
          </View>

          {/* Invoice Content Preview */}
          <View style={styles.invoicePreview}>
            {/* Company Header */}
            <View style={styles.companyHeader}>
              {settings.showLogo && (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="business" size={32} color={Colors.light.primary} />
                </View>
              )}
              <View style={styles.companyInfo}>
                <ThemedText style={styles.companyName}>{settings.companyName}</ThemedText>
                <ThemedText style={styles.companyDetails}>{settings.address}</ThemedText>
                <ThemedText style={styles.companyDetails}>{settings.phone}</ThemedText>
                <ThemedText style={styles.companyDetails}>{settings.email}</ThemedText>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Invoice Details */}
            <View style={styles.invoiceDetails}>
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Invoice Number:</ThemedText>
                <ThemedText style={styles.value}>INV-{order.orderNumber}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Invoice Date:</ThemedText>
                <ThemedText style={styles.value}>{formatDate(order.createdAt)}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={styles.label}>Due Date:</ThemedText>
                <ThemedText style={styles.value}>{formatDate(order.createdAt)}</ThemedText>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Customer Info */}
            <View style={styles.customerInfo}>
              <ThemedText style={styles.sectionTitle}>Bill To:</ThemedText>
              <ThemedText style={styles.customerName}>{order.customer.name}</ThemedText>
              <ThemedText style={styles.customerDetails}>{order.customer.email}</ThemedText>
              <ThemedText style={styles.customerDetails}>{order.customer.phone}</ThemedText>
              {order.delivery.address && (
                <ThemedText style={styles.customerDetails}>{order.delivery.address}</ThemedText>
              )}
            </View>

            <View style={styles.divider} />

            {/* Items Table */}
            <View style={styles.itemsTable}>
              <View style={styles.tableHeader}>
                <ThemedText style={[styles.tableHeaderText, { flex: 2 }]}>Item</ThemedText>
                <ThemedText style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</ThemedText>
                <ThemedText style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Price</ThemedText>
                <ThemedText style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Total</ThemedText>
              </View>
              {order.items.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <ThemedText style={[styles.tableCell, { flex: 2 }]}>{item.productName}</ThemedText>
                  <ThemedText style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.quantity}</ThemedText>
                  <ThemedText style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(item.price)}</ThemedText>
                  <ThemedText style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(item.total)}</ThemedText>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            {/* Totals */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>Subtotal:</ThemedText>
                <ThemedText style={styles.totalValue}>{formatCurrency(order.pricing.subtotal)}</ThemedText>
              </View>
              {settings.showTaxBreakdown && (
                <View style={styles.totalRow}>
                  <ThemedText style={styles.totalLabel}>Tax:</ThemedText>
                  <ThemedText style={styles.totalValue}>{formatCurrency(order.pricing.tax)}</ThemedText>
                </View>
              )}
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>Delivery:</ThemedText>
                <ThemedText style={styles.totalValue}>{formatCurrency(order.pricing.delivery)}</ThemedText>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <ThemedText style={styles.grandTotalLabel}>Total:</ThemedText>
                <ThemedText style={styles.grandTotalValue}>{formatCurrency(order.pricing.totalAmount)}</ThemedText>
              </View>
            </View>

            {/* Footer */}
            {settings.showNotes && settings.footerText && (
              <>
                <View style={styles.divider} />
                <View style={styles.footer}>
                  <ThemedText style={styles.footerText}>{settings.footerText}</ThemedText>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, generating && styles.disabledButton]}
            onPress={handleGenerateInvoice}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="document-text" size={20} color="#FFFFFF" />
                <ThemedText style={styles.primaryButtonText}>
                  {invoiceUrl ? 'Regenerate Invoice' : 'Generate Invoice'}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>

          {invoiceUrl && (
            <>
              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={[styles.secondaryButton, downloading && styles.disabledButton]}
                  onPress={handleDownloadInvoice}
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

                <TouchableOpacity
                  style={[styles.secondaryButton, emailing && styles.disabledButton]}
                  onPress={handleEmailInvoice}
                  disabled={emailing}
                >
                  {emailing ? (
                    <ActivityIndicator color={Colors.light.primary} />
                  ) : (
                    <>
                      <Ionicons name="mail-outline" size={20} color={Colors.light.primary} />
                      <ThemedText style={styles.secondaryButtonText}>Email</ThemedText>
                    </>
                  )}
                </TouchableOpacity>

                {Platform.OS === 'web' && (
                  <TouchableOpacity style={styles.secondaryButton} onPress={handlePrintInvoice}>
                    <Ionicons name="print-outline" size={20} color={Colors.light.primary} />
                    <ThemedText style={styles.secondaryButtonText}>Print</ThemedText>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.secondaryButton} onPress={() => handleShareInvoice()}>
                  <Ionicons name="share-outline" size={20} color={Colors.light.primary} />
                  <ThemedText style={styles.secondaryButtonText}>Share</ThemedText>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Customization Settings */}
        {showSettings && (
          <View style={styles.settingsCard}>
            <ThemedText type="subtitle" style={styles.settingsTitle}>Customization Options</ThemedText>
            <ThemedText style={styles.settingsSubtitle}>
              Customize how your invoice appears to customers
            </ThemedText>

            <View style={styles.settingItem}>
              <ThemedText style={styles.settingLabel}>Show Logo</ThemedText>
              <TouchableOpacity
                onPress={() => setSettings({ ...settings, showLogo: !settings.showLogo })}
              >
                <Ionicons
                  name={settings.showLogo ? 'toggle' : 'toggle-outline'}
                  size={32}
                  color={settings.showLogo ? Colors.light.primary : Colors.light.textMuted}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <ThemedText style={styles.settingLabel}>Show Tax Breakdown</ThemedText>
              <TouchableOpacity
                onPress={() => setSettings({ ...settings, showTaxBreakdown: !settings.showTaxBreakdown })}
              >
                <Ionicons
                  name={settings.showTaxBreakdown ? 'toggle' : 'toggle-outline'}
                  size={32}
                  color={settings.showTaxBreakdown ? Colors.light.primary : Colors.light.textMuted}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <ThemedText style={styles.settingLabel}>Show Notes</ThemedText>
              <TouchableOpacity
                onPress={() => setSettings({ ...settings, showNotes: !settings.showNotes })}
              >
                <Ionicons
                  name={settings.showNotes ? 'toggle' : 'toggle-outline'}
                  size={32}
                  color={settings.showNotes ? Colors.light.primary : Colors.light.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Order Info */}
        <View style={styles.orderInfoCard}>
          <ThemedText type="subtitle">Order Information</ThemedText>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Status:</ThemedText>
            <ThemedText style={styles.infoValue}>{order.status}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Payment Status:</ThemedText>
            <ThemedText style={styles.infoValue}>{order.paymentStatus}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Order Date:</ThemedText>
            <ThemedText style={styles.infoValue}>{formatDate(order.createdAt)}</ThemedText>
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
  previewCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    color: Colors.light.success,
    fontWeight: '600',
  },
  invoicePreview: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 16,
  },
  companyHeader: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyInfo: {
    flex: 1,
    gap: 4,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  companyDetails: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
  },
  invoiceDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  value: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  customerInfo: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  customerDetails: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  itemsTable: {
    gap: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  tableCell: {
    fontSize: 12,
    color: Colors.light.text,
  },
  totalsSection: {
    gap: 8,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    gap: 24,
    minWidth: 200,
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  grandTotalRow: {
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: Colors.light.border,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
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
    minWidth: '45%',
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
  settingsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  settingsTitle: {
    color: Colors.light.text,
  },
  settingsSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.light.text,
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
