/**
 * VariantTable Component
 * Display variants in table format with sorting and inline editing
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductVariant } from '../../types/products';

interface VariantTableProps {
  variants: ProductVariant[];
  onEdit?: (variant: ProductVariant) => void;
  onDelete?: (variantId: string) => void;
  onDuplicate?: (variant: ProductVariant) => void;
  onUpdatePrice?: (variantId: string, price: number) => void;
  onUpdateStock?: (variantId: string, quantity: number) => void;
  onSelectAll?: (selected: boolean) => void;
  onSelectVariant?: (variantId: string, selected: boolean) => void;
  selectedVariants?: string[];
  editable?: boolean;
}

type SortKey = 'name' | 'sku' | 'price' | 'stock' | 'status';
type SortOrder = 'asc' | 'desc';

const VariantTable: React.FC<VariantTableProps> = ({
  variants,
  onEdit,
  onDelete,
  onDuplicate,
  onUpdatePrice,
  onUpdateStock,
  onSelectAll,
  onSelectVariant,
  selectedVariants = [],
  editable = true,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [tempStock, setTempStock] = useState<string>('');

  const allSelected = variants.length > 0 && selectedVariants.length === variants.length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedVariants = [...variants].sort((a, b) => {
    let aVal: any, bVal: any;

    switch (sortKey) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'sku':
        aVal = a.sku?.toLowerCase() || '';
        bVal = b.sku?.toLowerCase() || '';
        break;
      case 'price':
        aVal = a.price || 0;
        bVal = b.price || 0;
        break;
      case 'stock':
        aVal = a.inventory.quantity;
        bVal = b.inventory.quantity;
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handlePriceEdit = (variantId: string, price: number) => {
    setEditingPrice(variantId);
    setTempPrice(String(price || ''));
  };

  const handlePriceSave = (variantId: string) => {
    const price = parseFloat(tempPrice);
    if (!isNaN(price) && price >= 0) {
      onUpdatePrice?.(variantId, price);
    }
    setEditingPrice(null);
  };

  const handleStockEdit = (variantId: string, quantity: number) => {
    setEditingStock(variantId);
    setTempStock(String(quantity));
  };

  const handleStockSave = (variantId: string) => {
    const quantity = parseInt(tempStock);
    if (!isNaN(quantity) && quantity >= 0) {
      onUpdateStock?.(variantId, quantity);
    }
    setEditingStock(null);
  };

  const getStockColor = (quantity: number) => {
    if (quantity === 0) return '#EF4444';
    if (quantity <= 10) return '#F59E0B';
    return '#10B981';
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <Ionicons name="swap-vertical" size={16} color="#9CA3AF" />;
    }
    return (
      <Ionicons
        name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'}
        size={16}
        color="#3B82F6"
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tableWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.checkboxCell}>
              <TouchableOpacity
                onPress={() => onSelectAll?.(!allSelected)}
                style={styles.checkbox}
              >
                <Ionicons
                  name={allSelected ? 'checkbox' : 'checkbox-outline'}
                  size={20}
                  color={allSelected ? '#3B82F6' : '#9CA3AF'}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('name')}
            >
              <Text style={styles.headerText}>Variant</Text>
              {renderSortIcon('name')}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('sku')}
            >
              <Text style={styles.headerText}>SKU</Text>
              {renderSortIcon('sku')}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('price')}
            >
              <Text style={styles.headerText}>Price</Text>
              {renderSortIcon('price')}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('stock')}
            >
              <Text style={styles.headerText}>Stock</Text>
              {renderSortIcon('stock')}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('status')}
            >
              <Text style={styles.headerText}>Status</Text>
              {renderSortIcon('status')}
            </TouchableOpacity>

            <View style={styles.actionsHeader}>
              <Text style={styles.headerText}>Actions</Text>
            </View>
          </View>

          {/* Rows */}
          <ScrollView style={styles.tableBody}>
            {sortedVariants.map((variant) => {
              const isSelected = selectedVariants.includes(variant.id);

              return (
                <View key={variant.id} style={styles.row}>
                  <View style={styles.checkboxCell}>
                    <TouchableOpacity
                      onPress={() => onSelectVariant?.(variant.id, !isSelected)}
                      style={styles.checkbox}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'checkbox-outline'}
                        size={20}
                        color={isSelected ? '#3B82F6' : '#9CA3AF'}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cell}>
                    <Text style={styles.variantName} numberOfLines={2}>
                      {variant.name}
                    </Text>
                    <View style={styles.attributesContainer}>
                      {variant.attributes.slice(0, 2).map((attr, idx) => (
                        <Text key={idx} style={styles.attribute} numberOfLines={1}>
                          {attr.name}: {attr.value}
                        </Text>
                      ))}
                    </View>
                  </View>

                  <View style={styles.cell}>
                    <Text style={styles.cellText}>{variant.sku || '-'}</Text>
                  </View>

                  <View style={styles.cell}>
                    {editingPrice === variant.id && editable ? (
                      <View style={styles.inlineEditContainer}>
                        <TextInput
                          style={styles.inlineInput}
                          value={tempPrice}
                          onChangeText={setTempPrice}
                          keyboardType="decimal-pad"
                          autoFocus
                          onBlur={() => handlePriceSave(variant.id)}
                          onSubmitEditing={() => handlePriceSave(variant.id)}
                        />
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() =>
                          editable && handlePriceEdit(variant.id, variant.price || 0)
                        }
                      >
                        <Text style={styles.priceText}>
                          ${(variant.price || 0).toFixed(2)}
                        </Text>
                        {variant.salePrice && (
                          <Text style={styles.salePriceText}>
                            Sale: ${variant.salePrice.toFixed(2)}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.cell}>
                    {editingStock === variant.id && editable ? (
                      <View style={styles.inlineEditContainer}>
                        <TextInput
                          style={styles.inlineInput}
                          value={tempStock}
                          onChangeText={setTempStock}
                          keyboardType="number-pad"
                          autoFocus
                          onBlur={() => handleStockSave(variant.id)}
                          onSubmitEditing={() => handleStockSave(variant.id)}
                        />
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() =>
                          editable &&
                          handleStockEdit(variant.id, variant.inventory.quantity)
                        }
                      >
                        <View style={styles.stockContainer}>
                          <View
                            style={[
                              styles.stockBadge,
                              {
                                backgroundColor: `${getStockColor(variant.inventory.quantity)}15`,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stockText,
                                { color: getStockColor(variant.inventory.quantity) },
                              ]}
                            >
                              {variant.inventory.quantity}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.cell}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            variant.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: variant.status === 'active' ? '#16A34A' : '#DC2626',
                          },
                        ]}
                      >
                        {variant.status === 'active' ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionsCell}>
                    {editable && (
                      <>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => onEdit?.(variant)}
                        >
                          <Ionicons name="create-outline" size={18} color="#3B82F6" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => onDuplicate?.(variant)}
                        >
                          <Ionicons name="copy-outline" size={18} color="#8B5CF6" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => onDelete?.(variant.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      {variants.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No variants yet</Text>
          <Text style={styles.emptySubtext}>Add variants to get started</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableWrapper: {
    minWidth: 900,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    width: 150,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginRight: 4,
  },
  checkboxCell: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    padding: 4,
  },
  actionsHeader: {
    width: 150,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  tableBody: {
    maxHeight: 500,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  cell: {
    width: 150,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  variantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  attributesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  attribute: {
    fontSize: 11,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cellText: {
    fontSize: 14,
    color: '#374151',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  salePriceText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsCell: {
    width: 150,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  inlineEditContainer: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  inlineInput: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#111827',
    minWidth: 80,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});

export default VariantTable;
