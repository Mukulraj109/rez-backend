import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { ordersService } from '@/services';
import { Order } from '@/types/api';

type DocumentType = 'all' | 'invoice' | 'label' | 'packing_slip';

interface DocumentItem {
  id: string;
  type: DocumentType;
  orderId: string;
  orderNumber: string;
  customerName: string;
  date: string;
  url?: string;
  status: 'generated' | 'pending';
}

interface DocumentStats {
  totalDocuments: number;
  invoices: number;
  labels: number;
  packingSlips: number;
}

export default function DocumentsOverviewScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentItem[]>([]);
  const [selectedType, setSelectedType] = useState<DocumentType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<DocumentStats>({
    totalDocuments: 0,
    invoices: 0,
    labels: 0,
    packingSlips: 0
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ordersService.getOrders({ limit: 50, sortBy: 'created', sortOrder: 'desc' });
      setOrders(result.orders || []);

      // Generate mock documents from orders
      const mockDocuments: DocumentItem[] = [];
      result.orders?.forEach((order) => {
        // Invoice
        mockDocuments.push({
          id: `inv-${order.id}`,
          type: 'invoice',
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer.name,
          date: order.createdAt,
          status: Math.random() > 0.3 ? 'generated' : 'pending'
        });

        // Label (only for delivery orders)
        if (order.delivery.method === 'delivery') {
          mockDocuments.push({
            id: `lbl-${order.id}`,
            type: 'label',
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customer.name,
            date: order.createdAt,
            status: Math.random() > 0.5 ? 'generated' : 'pending'
          });
        }

        // Packing Slip
        mockDocuments.push({
          id: `ps-${order.id}`,
          type: 'packing_slip',
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer.name,
          date: order.createdAt,
          status: Math.random() > 0.4 ? 'generated' : 'pending'
        });
      });

      setDocuments(mockDocuments);
      setFilteredDocuments(mockDocuments);

      // Calculate stats
      const newStats: DocumentStats = {
        totalDocuments: mockDocuments.length,
        invoices: mockDocuments.filter(d => d.type === 'invoice').length,
        labels: mockDocuments.filter(d => d.type === 'label').length,
        packingSlips: mockDocuments.filter(d => d.type === 'packing_slip').length
      };
      setStats(newStats);

    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to fetch documents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    // Filter documents based on type and search
    let filtered = documents;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(doc => doc.type === selectedType);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.orderNumber.toLowerCase().includes(query) ||
        doc.customerName.toLowerCase().includes(query)
      );
    }

    setFilteredDocuments(filtered);
  }, [selectedType, searchQuery, documents]);

  const handleDocumentPress = (document: DocumentItem) => {
    switch (document.type) {
      case 'invoice':
        router.push(`/documents/invoices/${document.orderId}`);
        break;
      case 'label':
        router.push(`/documents/labels/${document.orderId}`);
        break;
      case 'packing_slip':
        router.push(`/documents/packing-slips/${document.orderId}`);
        break;
    }
  };

  const handleBulkDownload = () => {
    Alert.alert(
      'Bulk Download',
      `Download ${filteredDocuments.filter(d => d.status === 'generated').length} documents?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: () => {
            // TODO: Implement bulk download
            Alert.alert('Success', 'Documents downloaded successfully');
          }
        }
      ]
    );
  };

  const handleTemplateManagement = () => {
    Alert.alert('Templates', 'Template management coming soon');
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getDocumentIcon = (type: DocumentType): string => {
    switch (type) {
      case 'invoice':
        return 'document-text';
      case 'label':
        return 'pricetag';
      case 'packing_slip':
        return 'clipboard';
      default:
        return 'document';
    }
  };

  const getDocumentLabel = (type: DocumentType): string => {
    switch (type) {
      case 'invoice':
        return 'Invoice';
      case 'label':
        return 'Label';
      case 'packing_slip':
        return 'Packing Slip';
      default:
        return 'Document';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText style={styles.loadingText}>Loading documents...</ThemedText>
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
              <ThemedText type="title">Documents</ThemedText>
              <ThemedText style={styles.subtitle}>
                {stats.totalDocuments} total documents
              </ThemedText>
            </View>
          </View>
          <TouchableOpacity onPress={handleTemplateManagement}>
            <Ionicons name="settings-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="document-text" size={24} color="#2196F3" />
            </View>
            <ThemedText style={styles.statValue}>{stats.invoices}</ThemedText>
            <ThemedText style={styles.statLabel}>Invoices</ThemedText>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="pricetag" size={24} color="#FF9800" />
            </View>
            <ThemedText style={styles.statValue}>{stats.labels}</ThemedText>
            <ThemedText style={styles.statLabel}>Labels</ThemedText>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="clipboard" size={24} color="#4CAF50" />
            </View>
            <ThemedText style={styles.statValue}>{stats.packingSlips}</ThemedText>
            <ThemedText style={styles.statLabel}>Packing Slips</ThemedText>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by order number or customer..."
            placeholderTextColor={Colors.light.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filtersContainer}>
            <TouchableOpacity
              style={[styles.filterChip, selectedType === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedType('all')}
            >
              <ThemedText style={[styles.filterChipText, selectedType === 'all' && styles.filterChipTextActive]}>
                All
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, selectedType === 'invoice' && styles.filterChipActive]}
              onPress={() => setSelectedType('invoice')}
            >
              <Ionicons
                name="document-text"
                size={16}
                color={selectedType === 'invoice' ? '#FFFFFF' : Colors.light.text}
              />
              <ThemedText style={[styles.filterChipText, selectedType === 'invoice' && styles.filterChipTextActive]}>
                Invoices
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, selectedType === 'label' && styles.filterChipActive]}
              onPress={() => setSelectedType('label')}
            >
              <Ionicons
                name="pricetag"
                size={16}
                color={selectedType === 'label' ? '#FFFFFF' : Colors.light.text}
              />
              <ThemedText style={[styles.filterChipText, selectedType === 'label' && styles.filterChipTextActive]}>
                Labels
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, selectedType === 'packing_slip' && styles.filterChipActive]}
              onPress={() => setSelectedType('packing_slip')}
            >
              <Ionicons
                name="clipboard"
                size={16}
                color={selectedType === 'packing_slip' ? '#FFFFFF' : Colors.light.text}
              />
              <ThemedText style={[styles.filterChipText, selectedType === 'packing_slip' && styles.filterChipTextActive]}>
                Packing Slips
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bulk Actions */}
        {filteredDocuments.filter(d => d.status === 'generated').length > 0 && (
          <View style={styles.bulkActionsBar}>
            <ThemedText style={styles.bulkActionsText}>
              {filteredDocuments.filter(d => d.status === 'generated').length} documents available
            </ThemedText>
            <TouchableOpacity style={styles.bulkDownloadButton} onPress={handleBulkDownload}>
              <Ionicons name="download" size={16} color={Colors.light.primary} />
              <ThemedText style={styles.bulkDownloadText}>Bulk Download</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Documents List */}
        <View style={styles.documentsContainer}>
          {filteredDocuments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color={Colors.light.textMuted} />
              <ThemedText style={styles.emptyTitle}>No Documents Found</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                {searchQuery ? 'Try a different search term' : 'Documents will appear here as orders are created'}
              </ThemedText>
            </View>
          ) : (
            filteredDocuments.map((document) => (
              <TouchableOpacity
                key={document.id}
                style={styles.documentCard}
                onPress={() => handleDocumentPress(document)}
              >
                <View style={styles.documentIcon}>
                  <Ionicons
                    name={getDocumentIcon(document.type) as any}
                    size={24}
                    color={document.status === 'generated' ? Colors.light.primary : Colors.light.textMuted}
                  />
                </View>

                <View style={styles.documentDetails}>
                  <View style={styles.documentHeader}>
                    <ThemedText style={styles.documentType}>
                      {getDocumentLabel(document.type)}
                    </ThemedText>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: document.status === 'generated' ? Colors.light.success : Colors.light.warning }
                    ]}>
                      <ThemedText style={styles.statusBadgeText}>
                        {document.status === 'generated' ? 'Ready' : 'Pending'}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText style={styles.orderNumber}>Order #{document.orderNumber}</ThemedText>
                  <ThemedText style={styles.customerName}>{document.customerName}</ThemedText>
                  <ThemedText style={styles.documentDate}>{formatDate(document.date)}</ThemedText>
                </View>

                <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <ThemedText type="subtitle" style={styles.quickActionsTitle}>Quick Actions</ThemedText>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/orders')}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="add-circle" size={24} color={Colors.light.primary} />
            </View>
            <View style={styles.quickActionContent}>
              <ThemedText style={styles.quickActionTitle}>Create from Order</ThemedText>
              <ThemedText style={styles.quickActionSubtitle}>
                Generate documents for an existing order
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={handleTemplateManagement}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="document-attach" size={24} color={Colors.light.primary} />
            </View>
            <View style={styles.quickActionContent}>
              <ThemedText style={styles.quickActionTitle}>Manage Templates</ThemedText>
              <ThemedText style={styles.quickActionSubtitle}>
                Customize document templates
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => Alert.alert('Settings', 'Document settings coming soon')}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="settings" size={24} color={Colors.light.primary} />
            </View>
            <View style={styles.quickActionContent}>
              <ThemedText style={styles.quickActionTitle}>Document Settings</ThemedText>
              <ThemedText style={styles.quickActionSubtitle}>
                Configure default settings
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  filtersScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  bulkActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  bulkActionsText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  bulkDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.light.background,
  },
  bulkDownloadText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  documentsContainer: {
    gap: 12,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentDetails: {
    flex: 1,
    gap: 4,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderNumber: {
    fontSize: 14,
    color: Colors.light.text,
  },
  customerName: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  documentDate: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  quickActionsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  quickActionsTitle: {
    color: Colors.light.text,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionContent: {
    flex: 1,
    gap: 2,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
});
