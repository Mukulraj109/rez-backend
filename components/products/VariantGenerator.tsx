/**
 * VariantGenerator Component
 * Generate all combinations from attributes with bulk assignment
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Attribute } from './AttributeSelector';

interface GeneratedVariant {
  attributes: Attribute[];
  name: string;
  selected: boolean;
}

interface VariantGeneratorProps {
  attributeGroups: Array<{
    name: string;
    values: Attribute[];
  }>;
  basePrice?: number;
  baseSKU?: string;
  onGenerate: (variants: Array<{
    name: string;
    attributes: Attribute[];
    price?: number;
    inventory: { quantity: number; trackQuantity: boolean };
  }>) => void;
  onCancel?: () => void;
}

const VariantGenerator: React.FC<VariantGeneratorProps> = ({
  attributeGroups,
  basePrice = 0,
  baseSKU = '',
  onGenerate,
  onCancel,
}) => {
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [bulkPrice, setBulkPrice] = useState(String(basePrice || ''));
  const [bulkStock, setBulkStock] = useState('');
  const [priceAdjustment, setPriceAdjustment] = useState('0');
  const [adjustmentType, setAdjustmentType] = useState<'fixed' | 'percentage'>('fixed');

  useEffect(() => {
    generateCombinations();
  }, [attributeGroups]);

  const generateCombinations = () => {
    if (attributeGroups.length === 0) {
      setGeneratedVariants([]);
      return;
    }

    const combinations: GeneratedVariant[] = [];

    const generate = (current: Attribute[], groupIndex: number) => {
      if (groupIndex === attributeGroups.length) {
        const name = current.map(attr => attr.value).join(' / ');
        combinations.push({
          attributes: [...current],
          name,
          selected: true,
        });
        return;
      }

      const group = attributeGroups[groupIndex];
      for (const value of group.values) {
        generate([...current, value], groupIndex + 1);
      }
    };

    generate([], 0);
    setGeneratedVariants(combinations);
  };

  const toggleVariant = (index: number) => {
    const updated = [...generatedVariants];
    updated[index].selected = !updated[index].selected;
    setGeneratedVariants(updated);
  };

  const toggleAll = () => {
    const allSelected = generatedVariants.every(v => v.selected);
    const updated = generatedVariants.map(v => ({
      ...v,
      selected: !allSelected,
    }));
    setGeneratedVariants(updated);
  };

  const calculatePrice = (basePrice: number, index: number): number => {
    const adjustment = parseFloat(priceAdjustment) || 0;

    if (adjustmentType === 'percentage') {
      return basePrice + (basePrice * adjustment / 100);
    } else {
      return basePrice + adjustment;
    }
  };

  const handleGenerate = () => {
    const selected = generatedVariants.filter(v => v.selected);
    const price = parseFloat(bulkPrice) || undefined;
    const stock = parseInt(bulkStock) || 0;

    const variants = selected.map((variant, index) => ({
      name: variant.name,
      attributes: variant.attributes,
      price: price ? calculatePrice(price, index) : undefined,
      inventory: {
        quantity: stock,
        trackQuantity: true,
      },
    }));

    onGenerate(variants);
  };

  const selectedCount = generatedVariants.filter(v => v.selected).length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryHeader}>
          <Ionicons name="layers-outline" size={24} color="#3B82F6" />
          <Text style={styles.summaryTitle}>Variant Generator</Text>
        </View>
        <Text style={styles.summaryText}>
          {generatedVariants.length} combinations generated from{' '}
          {attributeGroups.length} attribute group(s)
        </Text>
        <Text style={styles.summarySubtext}>
          {selectedCount} variant(s) selected for creation
        </Text>
      </View>

      {/* Attribute Groups Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attribute Combinations</Text>
        {attributeGroups.map((group, index) => (
          <View key={index} style={styles.attributeGroup}>
            <Text style={styles.groupName}>{group.name}</Text>
            <View style={styles.groupValues}>
              {group.values.map((attr, idx) => (
                <View key={idx} style={styles.attributeChip}>
                  {attr.color && (
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: attr.color },
                        attr.color === '#FFFFFF' && styles.whiteColor,
                      ]}
                    />
                  )}
                  <Text style={styles.attributeChipText}>{attr.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Bulk Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bulk Settings</Text>

        <View style={styles.bulkSettings}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Base Price (Optional)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                value={bulkPrice}
                onChangeText={setBulkPrice}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {bulkPrice && parseFloat(bulkPrice) > 0 && (
            <View style={styles.priceAdjustment}>
              <Text style={styles.inputLabel}>Price Adjustment</Text>
              <View style={styles.adjustmentRow}>
                <View style={styles.adjustmentTypeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.adjustmentTypeButton,
                      adjustmentType === 'fixed' && styles.adjustmentTypeButtonActive,
                    ]}
                    onPress={() => setAdjustmentType('fixed')}
                  >
                    <Text
                      style={[
                        styles.adjustmentTypeText,
                        adjustmentType === 'fixed' && styles.adjustmentTypeTextActive,
                      ]}
                    >
                      $
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.adjustmentTypeButton,
                      adjustmentType === 'percentage' && styles.adjustmentTypeButtonActive,
                    ]}
                    onPress={() => setAdjustmentType('percentage')}
                  >
                    <Text
                      style={[
                        styles.adjustmentTypeText,
                        adjustmentType === 'percentage' && styles.adjustmentTypeTextActive,
                      ]}
                    >
                      %
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, styles.adjustmentInput]}
                  value={priceAdjustment}
                  onChangeText={setPriceAdjustment}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Initial Stock (Optional)</Text>
            <TextInput
              style={styles.input}
              value={bulkStock}
              onChangeText={setBulkStock}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>

      {/* Variants List */}
      <View style={styles.section}>
        <View style={styles.variantsHeader}>
          <Text style={styles.sectionTitle}>
            Select Variants to Create ({selectedCount}/{generatedVariants.length})
          </Text>
          <TouchableOpacity onPress={toggleAll} style={styles.selectAllButton}>
            <Ionicons
              name={selectedCount === generatedVariants.length ? 'checkbox' : 'checkbox-outline'}
              size={20}
              color="#3B82F6"
            />
            <Text style={styles.selectAllText}>
              {selectedCount === generatedVariants.length ? 'Deselect' : 'Select'} All
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.variantsList}>
          {generatedVariants.map((variant, index) => {
            const variantPrice = bulkPrice && parseFloat(bulkPrice) > 0
              ? calculatePrice(parseFloat(bulkPrice), index)
              : null;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.variantItem,
                  variant.selected && styles.variantItemSelected,
                ]}
                onPress={() => toggleVariant(index)}
              >
                <View style={styles.variantCheckbox}>
                  <Ionicons
                    name={variant.selected ? 'checkbox' : 'checkbox-outline'}
                    size={20}
                    color={variant.selected ? '#3B82F6' : '#9CA3AF'}
                  />
                </View>

                <View style={styles.variantInfo}>
                  <Text style={styles.variantName}>{variant.name}</Text>
                  <View style={styles.variantAttributes}>
                    {variant.attributes.map((attr, idx) => (
                      <View key={idx} style={styles.variantAttributeChip}>
                        {attr.color && (
                          <View
                            style={[
                              styles.colorDotSmall,
                              { backgroundColor: attr.color },
                              attr.color === '#FFFFFF' && styles.whiteColor,
                            ]}
                          />
                        )}
                        <Text style={styles.variantAttributeText}>
                          {attr.name}: {attr.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {variantPrice && (
                    <Text style={styles.variantPrice}>${variantPrice.toFixed(2)}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.generateButton,
            selectedCount === 0 && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={selectedCount === 0}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.generateButtonText}>
            Generate {selectedCount} Variant{selectedCount !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  summary: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    margin: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E40AF',
  },
  summaryText: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 13,
    color: '#60A5FA',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  attributeGroup: {
    marginBottom: 12,
  },
  groupName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  groupValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  attributeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  whiteColor: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attributeChipText: {
    fontSize: 12,
    color: '#374151',
  },
  bulkSettings: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  priceAdjustment: {
    marginBottom: 12,
  },
  adjustmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adjustmentTypeButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  adjustmentTypeButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustmentTypeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  adjustmentTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  adjustmentTypeTextActive: {
    color: '#FFFFFF',
  },
  adjustmentInput: {
    flex: 1,
  },
  variantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  variantsList: {
    gap: 8,
  },
  variantItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F9FAFB',
  },
  variantItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  variantCheckbox: {
    marginRight: 12,
  },
  variantInfo: {
    flex: 1,
  },
  variantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  variantAttributes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  variantAttributeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 3,
  },
  colorDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  variantAttributeText: {
    fontSize: 11,
    color: '#6B7280',
  },
  variantPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  generateButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default VariantGenerator;
