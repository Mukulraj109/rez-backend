/**
 * VariantInventoryCard Component
 * Display variant inventory info with quick update capability
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InventoryHistoryItem {
  date: string;
  change: number;
  reason: string;
  newQuantity: number;
}

interface VariantInventoryCardProps {
  variantId: string;
  variantName: string;
  currentStock: number;
  lowStockThreshold?: number;
  onUpdateStock?: (variantId: string, newQuantity: number, reason: string) => void;
  inventoryHistory?: InventoryHistoryItem[];
  editable?: boolean;
}

const VariantInventoryCard: React.FC<VariantInventoryCardProps> = ({
  variantId,
  variantName,
  currentStock,
  lowStockThreshold = 10,
  onUpdateStock,
  inventoryHistory = [],
  editable = true,
}) => {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [updateType, setUpdateType] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const getStockStatus = () => {
    if (currentStock === 0) {
      return { label: 'Out of Stock', color: '#EF4444', bgColor: '#FEE2E2' };
    }
    if (currentStock <= lowStockThreshold) {
      return { label: 'Low Stock', color: '#F59E0B', bgColor: '#FEF3C7' };
    }
    return { label: 'In Stock', color: '#10B981', bgColor: '#DCFCE7' };
  };

  const status = getStockStatus();

  const handleUpdateStock = () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0 || !reason.trim()) return;

    let newQuantity: number;
    switch (updateType) {
      case 'add':
        newQuantity = currentStock + qty;
        break;
      case 'remove':
        newQuantity = Math.max(0, currentStock - qty);
        break;
      case 'set':
        newQuantity = qty;
        break;
      default:
        return;
    }

    onUpdateStock?.(variantId, newQuantity, reason);
    setShowUpdateModal(false);
    setQuantity('');
    setReason('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="cube-outline" size={20} color="#6B7280" />
          <Text style={styles.title}>Inventory</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Stock Display */}
      <View style={styles.stockDisplay}>
        <View style={styles.stockInfo}>
          <Text style={styles.stockLabel}>Current Stock</Text>
          <View style={styles.stockValue}>
            <Text style={[styles.stockNumber, { color: status.color }]}>
              {currentStock}
            </Text>
            <Text style={styles.stockUnit}>units</Text>
          </View>
        </View>

        {currentStock > 0 && currentStock <= lowStockThreshold && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning-outline" size={16} color="#F59E0B" />
            <Text style={styles.warningText}>
              Stock is running low (threshold: {lowStockThreshold})
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {editable && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowUpdateModal(true)}
          >
            <Ionicons name="create-outline" size={18} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Update Stock</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => setShowHistoryModal(true)}
        >
          <Ionicons name="time-outline" size={18} color="#6B7280" />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            History ({inventoryHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Update Modal */}
      <Modal
        visible={showUpdateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowUpdateModal(false)}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Stock</Text>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.variantNameText}>{variantName}</Text>

              {/* Update Type */}
              <View style={styles.updateTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.updateTypeButton,
                    updateType === 'add' && styles.updateTypeButtonActive,
                  ]}
                  onPress={() => setUpdateType('add')}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={updateType === 'add' ? '#3B82F6' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.updateTypeText,
                      updateType === 'add' && styles.updateTypeTextActive,
                    ]}
                  >
                    Add
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.updateTypeButton,
                    updateType === 'remove' && styles.updateTypeButtonActive,
                  ]}
                  onPress={() => setUpdateType('remove')}
                >
                  <Ionicons
                    name="remove-circle-outline"
                    size={20}
                    color={updateType === 'remove' ? '#3B82F6' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.updateTypeText,
                      updateType === 'remove' && styles.updateTypeTextActive,
                    ]}
                  >
                    Remove
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.updateTypeButton,
                    updateType === 'set' && styles.updateTypeButtonActive,
                  ]}
                  onPress={() => setUpdateType('set')}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={updateType === 'set' ? '#3B82F6' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.updateTypeText,
                      updateType === 'set' && styles.updateTypeTextActive,
                    ]}
                  >
                    Set
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quantity Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="Enter quantity"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>

              {/* Reason Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reason</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="e.g., New stock arrival, Damage, Sale"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Preview */}
              {quantity && !isNaN(parseInt(quantity)) && (
                <View style={styles.preview}>
                  <Text style={styles.previewLabel}>New Stock:</Text>
                  <Text style={styles.previewValue}>
                    {currentStock}{' '}
                    {updateType === 'add' && `+ ${quantity}`}
                    {updateType === 'remove' && `- ${quantity}`}
                    {updateType === 'set' && `→ ${quantity}`} ={' '}
                    {updateType === 'add'
                      ? currentStock + parseInt(quantity)
                      : updateType === 'remove'
                        ? Math.max(0, currentStock - parseInt(quantity))
                        : parseInt(quantity)}{' '}
                    units
                  </Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!quantity || !reason.trim()) && styles.submitButtonDisabled,
                ]}
                onPress={handleUpdateStock}
                disabled={!quantity || !reason.trim()}
              >
                <Text style={styles.submitButtonText}>Update Stock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowHistoryModal(false)}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inventory History</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.historyList}>
              {inventoryHistory.length > 0 ? (
                inventoryHistory.map((item, index) => (
                  <View key={index} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <View
                        style={[
                          styles.changeIndicator,
                          {
                            backgroundColor:
                              item.change > 0 ? '#DCFCE7' : item.change < 0 ? '#FEE2E2' : '#F3F4F6',
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            item.change > 0
                              ? 'arrow-up'
                              : item.change < 0
                                ? 'arrow-down'
                                : 'remove'
                          }
                          size={16}
                          color={
                            item.change > 0 ? '#16A34A' : item.change < 0 ? '#DC2626' : '#6B7280'
                          }
                        />
                        <Text
                          style={[
                            styles.changeText,
                            {
                              color:
                                item.change > 0
                                  ? '#16A34A'
                                  : item.change < 0
                                    ? '#DC2626'
                                    : '#6B7280',
                            },
                          ]}
                        >
                          {item.change > 0 ? '+' : ''}
                          {item.change}
                        </Text>
                      </View>
                      <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                    </View>
                    <Text style={styles.historyReason}>{item.reason}</Text>
                    <Text style={styles.historyQuantity}>
                      New quantity: {item.newQuantity} units
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyHistory}>
                  <Ionicons name="time-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.emptyHistoryText}>No history yet</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockDisplay: {
    marginBottom: 16,
  },
  stockInfo: {
    marginBottom: 8,
  },
  stockLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  stockValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  stockNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  stockUnit: {
    fontSize: 14,
    color: '#6B7280',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    gap: 6,
  },
  secondaryButton: {
    backgroundColor: '#F9FAFB',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  secondaryButtonText: {
    color: '#6B7280',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 16,
  },
  variantNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 16,
  },
  updateTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  updateTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F9FAFB',
    gap: 6,
  },
  updateTypeButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  updateTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  updateTypeTextActive: {
    color: '#3B82F6',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  preview: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  historyList: {
    padding: 16,
    maxHeight: 400,
  },
  historyItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  historyReason: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  historyQuantity: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
});

export default VariantInventoryCard;
