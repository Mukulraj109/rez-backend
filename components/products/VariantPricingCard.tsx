/**
 * VariantPricingCard Component
 * Display variant pricing with quick update capability
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VariantPricingCardProps {
  variantId: string;
  variantName: string;
  basePrice?: number;
  price?: number;
  salePrice?: number;
  cost?: number;
  onUpdatePricing?: (
    variantId: string,
    price: number,
    salePrice?: number
  ) => void;
  editable?: boolean;
}

const VariantPricingCard: React.FC<VariantPricingCardProps> = ({
  variantId,
  variantName,
  basePrice,
  price,
  salePrice,
  cost = 0,
  onUpdatePricing,
  editable = true,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [newPrice, setNewPrice] = useState(String(price || ''));
  const [newSalePrice, setNewSalePrice] = useState(String(salePrice || ''));

  const effectivePrice = salePrice || price || basePrice || 0;
  const regularPrice = price || basePrice || 0;
  const margin = regularPrice > 0 ? ((regularPrice - cost) / regularPrice) * 100 : 0;
  const discount = salePrice && regularPrice > salePrice
    ? ((regularPrice - salePrice) / regularPrice) * 100
    : 0;

  const handleUpdatePricing = () => {
    const priceValue = parseFloat(newPrice);
    const salePriceValue = newSalePrice ? parseFloat(newSalePrice) : undefined;

    if (isNaN(priceValue) || priceValue < 0) return;
    if (salePriceValue !== undefined && (isNaN(salePriceValue) || salePriceValue < 0)) return;
    if (salePriceValue !== undefined && salePriceValue >= priceValue) return;

    onUpdatePricing?.(variantId, priceValue, salePriceValue);
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="pricetag-outline" size={20} color="#6B7280" />
          <Text style={styles.title}>Pricing</Text>
        </View>
        {editable && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setShowModal(true)}
          >
            <Ionicons name="create-outline" size={18} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Price Display */}
      <View style={styles.priceDisplay}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Current Price</Text>
          <Text style={styles.currentPrice}>${effectivePrice.toFixed(2)}</Text>
        </View>

        {salePrice && regularPrice > salePrice && (
          <View style={styles.salePriceRow}>
            <Text style={styles.regularPriceStrike}>
              ${regularPrice.toFixed(2)}
            </Text>
            <View style={styles.discountBadge}>
              <Ionicons name="trending-down" size={12} color="#DC2626" />
              <Text style={styles.discountText}>{discount.toFixed(0)}% OFF</Text>
            </View>
          </View>
        )}
      </View>

      {/* Price Comparison */}
      {basePrice && price !== basePrice && (
        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Base Product Price:</Text>
            <Text style={styles.comparisonValue}>${basePrice.toFixed(2)}</Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Variant Price:</Text>
            <Text style={styles.comparisonValue}>
              ${(price || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Difference:</Text>
            <Text
              style={[
                styles.comparisonValue,
                {
                  color: (price || 0) > basePrice ? '#DC2626' : '#16A34A',
                },
              ]}
            >
              {(price || 0) > basePrice ? '+' : ''}$
              {((price || 0) - basePrice).toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {/* Margin Info */}
      {cost > 0 && (
        <View style={styles.marginContainer}>
          <View style={styles.marginRow}>
            <View style={styles.marginItem}>
              <Text style={styles.marginLabel}>Cost</Text>
              <Text style={styles.marginValue}>${cost.toFixed(2)}</Text>
            </View>
            <View style={styles.marginDivider} />
            <View style={styles.marginItem}>
              <Text style={styles.marginLabel}>Margin</Text>
              <Text
                style={[
                  styles.marginValue,
                  {
                    color: margin > 30 ? '#16A34A' : margin > 15 ? '#F59E0B' : '#DC2626',
                  },
                ]}
              >
                {margin.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.marginDivider} />
            <View style={styles.marginItem}>
              <Text style={styles.marginLabel}>Profit</Text>
              <Text style={styles.marginValue}>
                ${(effectivePrice - cost).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Update Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowModal(false)}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Pricing</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.variantNameText}>{variantName}</Text>

              {/* Regular Price */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Regular Price *</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.input}
                    value={newPrice}
                    onChangeText={setNewPrice}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Sale Price */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sale Price (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.input}
                    value={newSalePrice}
                    onChangeText={setNewSalePrice}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                  />
                </View>
                {newSalePrice && parseFloat(newSalePrice) >= parseFloat(newPrice || '0') && (
                  <Text style={styles.errorText}>
                    Sale price must be less than regular price
                  </Text>
                )}
              </View>

              {/* Preview */}
              {newPrice && !isNaN(parseFloat(newPrice)) && (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewLabel}>Preview</Text>
                  <View style={styles.previewPrice}>
                    <Text style={styles.previewCurrentPrice}>
                      ${(parseFloat(newSalePrice) || parseFloat(newPrice)).toFixed(2)}
                    </Text>
                    {newSalePrice && parseFloat(newSalePrice) < parseFloat(newPrice) && (
                      <>
                        <Text style={styles.previewRegularPrice}>
                          ${parseFloat(newPrice).toFixed(2)}
                        </Text>
                        <View style={styles.previewDiscountBadge}>
                          <Text style={styles.previewDiscountText}>
                            {(
                              ((parseFloat(newPrice) - parseFloat(newSalePrice)) /
                                parseFloat(newPrice)) *
                              100
                            ).toFixed(0)}
                            % OFF
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  {cost > 0 && (
                    <View style={styles.previewMargin}>
                      <Text style={styles.previewMarginLabel}>Profit Margin:</Text>
                      <Text style={styles.previewMarginValue}>
                        {(
                          (((parseFloat(newSalePrice) || parseFloat(newPrice)) - cost) /
                            (parseFloat(newSalePrice) || parseFloat(newPrice))) *
                          100
                        ).toFixed(1)}
                        %
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!newPrice ||
                    isNaN(parseFloat(newPrice)) ||
                    (newSalePrice && parseFloat(newSalePrice) >= parseFloat(newPrice))) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleUpdatePricing}
                disabled={
                  !newPrice ||
                  isNaN(parseFloat(newPrice)) ||
                  (newSalePrice && parseFloat(newSalePrice) >= parseFloat(newPrice))
                }
              >
                <Text style={styles.submitButtonText}>Update Pricing</Text>
              </TouchableOpacity>
            </View>
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
  editButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  priceDisplay: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  salePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  regularPriceStrike: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  comparisonContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  comparisonLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  comparisonValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  marginContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  marginRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  marginItem: {
    alignItems: 'center',
  },
  marginLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  marginValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  marginDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  previewContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  previewPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previewCurrentPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  previewRegularPrice: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  previewDiscountBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewDiscountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  previewMargin: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewMarginLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  previewMarginValue: {
    fontSize: 13,
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
});

export default VariantPricingCard;
