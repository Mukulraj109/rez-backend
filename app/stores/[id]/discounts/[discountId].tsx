import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { discountsService, MerchantDiscount, UpdateDiscountRequest } from '@/services/api/discounts';
import { useStore } from '@/contexts/StoreContext';
import ConfirmModal from '@/components/common/ConfirmModal';

const discountSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  type: z.enum(['percentage', 'fixed']),
  value: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number'),
  minOrderValue: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number'),
  maxDiscountAmount: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number').optional().or(z.literal('')),
  validFrom: z.string().min(1, 'Start date is required'),
  validUntil: z.string().min(1, 'End date is required'),
  usageLimit: z.string().regex(/^\d+$/, 'Must be a number').optional().or(z.literal('')),
  usageLimitPerUser: z.string().regex(/^\d+$/, 'Must be a number'),
  priority: z.string().regex(/^\d+$/, 'Must be a number'),
  isOfflineOnly: z.boolean().default(false),
  notValidAboveStoreDiscount: z.boolean().default(false),
  singleVoucherPerBill: z.boolean().default(true),
  displayText: z.string().optional().or(z.literal('')),
  // Card Offer Fields
  paymentMethod: z.enum(['upi', 'card', 'all']).default('all'),
  cardType: z.enum(['credit', 'debit', 'all']).optional(),
  bankNames: z.string().optional(),
  cardBins: z.string().optional(),
});

type DiscountFormData = z.infer<typeof discountSchema>;

export default function EditDiscountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.id as string;
  const discountId = params.discountId as string;
  const { stores } = useStore();
  const store = stores.find(s => s._id === storeId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [discount, setDiscount] = useState<MerchantDiscount | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'default' | 'danger' | 'warning';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'default',
    onConfirm: () => {},
  });
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'default' | 'danger' | 'warning';
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'default',
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
  });

  const discountType = watch('type');

  useEffect(() => {
    loadDiscount();
  }, [discountId]);

  const loadDiscount = async () => {
    try {
      setLoading(true);
      const response = await discountsService.getDiscountById(discountId);
      if (response.success && response.data) {
        const discountData = response.data;
        setDiscount(discountData);

        // Map applicableOn to paymentMethod for form
        // If applicableOn is 'card_payment', paymentMethod should be 'card'
        // If applicableOn is 'bill_payment', paymentMethod should be 'upi'
        // Otherwise, use the stored paymentMethod or default to 'all'
        let paymentMethodValue = (discountData as any).paymentMethod || 'all';
        if (discountData.applicableOn === 'card_payment') {
          paymentMethodValue = 'card';
        } else if (discountData.applicableOn === 'bill_payment') {
          paymentMethodValue = 'upi';
        }

        // Populate form
        reset({
          name: discountData.name,
          description: discountData.description || '',
          type: discountData.type,
          value: discountData.value.toString(),
          minOrderValue: discountData.minOrderValue.toString(),
          maxDiscountAmount: discountData.maxDiscountAmount?.toString() || '',
          validFrom: new Date(discountData.validFrom).toISOString().split('T')[0],
          validUntil: new Date(discountData.validUntil).toISOString().split('T')[0],
          usageLimit: discountData.usageLimit?.toString() || '',
          usageLimitPerUser: discountData.usageLimitPerUser.toString(),
          priority: discountData.priority.toString(),
          isOfflineOnly: discountData.restrictions?.isOfflineOnly || false,
          notValidAboveStoreDiscount: discountData.restrictions?.notValidAboveStoreDiscount || false,
          singleVoucherPerBill: discountData.restrictions?.singleVoucherPerBill !== false,
          displayText: discountData.metadata?.displayText || '',
          // Card Offer Fields - map from applicableOn
          paymentMethod: paymentMethodValue,
          cardType: (discountData as any).cardType || 'all',
          bankNames: (discountData as any).bankNames?.join(', ') || '',
          cardBins: (discountData as any).cardBins?.join(', ') || '',
        });
      } else {
        setAlertModal({
          visible: true,
          title: 'Error',
          message: response.message || 'Failed to load discount',
          type: 'danger',
          onConfirm: () => {
            setAlertModal({ ...alertModal, visible: false });
            router.back();
          },
        });
      }
    } catch (error: any) {
      console.error('Error loading discount:', error);
      setAlertModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to load discount',
        type: 'danger',
        onConfirm: () => {
          setAlertModal({ ...alertModal, visible: false });
          router.back();
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: DiscountFormData) => {
    try {
      setSaving(true);

      // Validate percentage value
      if (data.type === 'percentage') {
        const percentageValue = parseFloat(data.value);
        if (percentageValue < 0 || percentageValue > 100) {
          setAlertModal({
            visible: true,
            title: 'Error',
            message: 'Percentage must be between 0 and 100',
            type: 'danger',
          });
          return;
        }
      }

      // Validate date range
      const startDate = new Date(data.validFrom);
      const endDate = new Date(data.validUntil);
      if (endDate <= startDate) {
        setAlertModal({
          visible: true,
          title: 'Error',
          message: 'End date must be after start date',
          type: 'danger',
        });
        return;
      }

      // Parse bank names and card BINs
      const bankNamesArray = data.bankNames
        ? data.bankNames.split(',').map(b => b.trim()).filter(b => b.length > 0)
        : undefined;
      const cardBinsArray = data.cardBins
        ? data.cardBins.split(',').map(b => b.trim()).filter(b => /^\d{6}$/.test(b))
        : undefined;

      // Update applicableOn based on paymentMethod selection
      // If paymentMethod is 'card', set applicableOn to 'card_payment'
      // If paymentMethod is 'upi', set applicableOn to 'bill_payment'
      // Otherwise, preserve existing applicableOn or default to 'bill_payment'
      let applicableOnValue: 'bill_payment' | 'card_payment' = discount?.applicableOn || 'bill_payment';
      if (data.paymentMethod === 'card') {
        applicableOnValue = 'card_payment';
      } else if (data.paymentMethod === 'upi') {
        applicableOnValue = 'bill_payment';
      }

      const updateData: UpdateDiscountRequest = {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        type: data.type,
        value: parseFloat(data.value),
        minOrderValue: parseFloat(data.minOrderValue),
        maxDiscountAmount: data.maxDiscountAmount ? parseFloat(data.maxDiscountAmount) : undefined,
        applicableOn: applicableOnValue, // Update based on paymentMethod selection
        validFrom: startDate.toISOString(),
        validUntil: endDate.toISOString(),
        usageLimit: data.usageLimit ? parseInt(data.usageLimit) : undefined,
        usageLimitPerUser: parseInt(data.usageLimitPerUser) || 1,
        priority: parseInt(data.priority) || 0,
        restrictions: {
          isOfflineOnly: data.isOfflineOnly,
          notValidAboveStoreDiscount: data.notValidAboveStoreDiscount,
          singleVoucherPerBill: data.singleVoucherPerBill,
        },
        metadata: {
          displayText: data.displayText?.trim() || undefined,
          icon: data.paymentMethod === 'card' ? '💳' : '⚡',
          backgroundColor: data.paymentMethod === 'card' ? '#E0E7FF' : '#FEF3C7',
        },
        // Card Offer Fields
        paymentMethod: data.paymentMethod,
        cardType: data.paymentMethod === 'card' ? (data.cardType || 'all') : undefined,
        bankNames: bankNamesArray && bankNamesArray.length > 0 ? bankNamesArray : undefined,
        cardBins: cardBinsArray && cardBinsArray.length > 0 ? cardBinsArray : undefined,
      };

      const response = await discountsService.updateDiscount(discountId, updateData);

      if (response.success) {
        setAlertModal({
          visible: true,
          title: 'Success',
          message: 'Discount updated successfully',
          type: 'default',
          onConfirm: () => {
            setAlertModal({ ...alertModal, visible: false });
            router.back();
          },
        });
      } else {
        setAlertModal({
          visible: true,
          title: 'Error',
          message: response.message || 'Failed to update discount',
          type: 'danger',
        });
      }
    } catch (error: any) {
      console.error('Error updating discount:', error);
      setAlertModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to update discount',
        type: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setConfirmModal({
      visible: true,
      title: 'Delete Discount',
      message: 'Are you sure you want to delete this discount? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, visible: false });
        try {
          setSaving(true);
          const response = await discountsService.deleteDiscount(discountId);
          if (response.success) {
            setAlertModal({
              visible: true,
              title: 'Success',
              message: 'Discount deleted successfully',
              type: 'default',
              onConfirm: () => {
                setAlertModal({ ...alertModal, visible: false });
                router.back();
              },
            });
          } else {
            setAlertModal({
              visible: true,
              title: 'Error',
              message: response.message || 'Failed to delete discount',
              type: 'danger',
            });
          }
        } catch (error: any) {
          setAlertModal({
            visible: true,
            title: 'Error',
            message: error.message || 'Failed to delete discount',
            type: 'danger',
          });
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleToggleActive = async () => {
    if (!discount) return;
    
    try {
      setSaving(true);
      const response = await discountsService.updateDiscount(discountId, {
        // Backend will handle isActive toggle - we just need to send update
        // Actually, we need to check if backend supports this
        // For now, we'll update isActive through a custom endpoint or include it in update
      });
      
      // Note: If backend doesn't support isActive in update, we may need to add it
      // For now, this is a placeholder
      if (response.success) {
        loadDiscount(); // Reload to get updated status
      }
      } catch (error: any) {
        setAlertModal({
          visible: true,
          title: 'Error',
          message: error.message || 'Failed to toggle discount status',
          type: 'danger',
        });
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Discount</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading discount...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!discount) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Discount</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Discount not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isCurrentlyValid = () => {
    const now = new Date();
    const validFrom = new Date(discount.validFrom);
    const validUntil = new Date(discount.validUntil);
    return discount.isActive && now >= validFrom && now <= validUntil;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Discount</Text>
        <TouchableOpacity onPress={handleDelete} disabled={saving}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {store && (
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{store.name}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, isCurrentlyValid() ? styles.statusActive : styles.statusInactive]}>
              <Ionicons 
                name={isCurrentlyValid() ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={isCurrentlyValid() ? "#10B981" : "#EF4444"} 
              />
              <Text style={[styles.statusText, { color: isCurrentlyValid() ? "#10B981" : "#EF4444" }]}>
                {isCurrentlyValid() ? 'Active' : discount.isActive ? 'Expired' : 'Inactive'}
              </Text>
            </View>
            {discount.usedCount > 0 && (
              <Text style={styles.usageText}>{discount.usedCount} uses</Text>
            )}
          </View>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <FormInput
          name="name"
          control={control}
          label="Discount Name *"
          placeholder="e.g., UPI Payment Discount"
          error={errors.name?.message}
        />

        <FormInput
          name="description"
          control={control}
          label="Description"
          placeholder="Brief description of the discount"
          multiline
          numberOfLines={3}
          error={errors.description?.message}
        />

        <FormSelect
          name="type"
          control={control}
          label="Discount Type *"
          options={[
            { label: 'Percentage (%)', value: 'percentage' },
            { label: 'Fixed Amount (₹)', value: 'fixed' },
          ]}
        />

        <FormInput
          name="value"
          control={control}
          label={discountType === 'percentage' ? 'Discount Percentage (%) *' : 'Discount Amount (₹) *'}
          placeholder={discountType === 'percentage' ? '10' : '100'}
          keyboardType="numeric"
          error={errors.value?.message}
        />

        {discountType === 'percentage' && (
          <FormInput
            name="maxDiscountAmount"
            control={control}
            label="Maximum Discount Amount (₹)"
            placeholder="500"
            keyboardType="numeric"
            error={errors.maxDiscountAmount?.message}
          />
        )}

        <FormInput
          name="minOrderValue"
          control={control}
          label="Minimum Order Value (₹) *"
          placeholder="1000"
          keyboardType="numeric"
          error={errors.minOrderValue?.message}
        />

        <Text style={styles.sectionTitle}>Validity Period *</Text>
        <FormInput
          name="validFrom"
          control={control}
          label="Start Date"
          placeholder="YYYY-MM-DD"
          error={errors.validFrom?.message}
        />

        <FormInput
          name="validUntil"
          control={control}
          label="End Date"
          placeholder="YYYY-MM-DD"
          error={errors.validUntil?.message}
        />

        <Text style={styles.sectionTitle}>Usage Limits (Optional)</Text>
        <FormInput
          name="usageLimit"
          control={control}
          label="Total Usage Limit"
          placeholder="1000"
          keyboardType="numeric"
          error={errors.usageLimit?.message}
        />

        <FormInput
          name="usageLimitPerUser"
          control={control}
          label="Usage Limit Per User *"
          placeholder="1"
          keyboardType="numeric"
          error={errors.usageLimitPerUser?.message}
        />

        <FormInput
          name="priority"
          control={control}
          label="Priority (0-100)"
          placeholder="0"
          keyboardType="numeric"
          error={errors.priority?.message}
        />

        <Text style={styles.sectionTitle}>Restrictions</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Ionicons name="storefront-outline" size={20} color="#6B7280" />
            <Text style={styles.switchLabel}>Offline Only</Text>
          </View>
          <Controller
            name="isOfflineOnly"
            control={control}
            render={({ field: { value, onChange } }) => (
              <TouchableOpacity
                style={[styles.switch, value && styles.switchActive]}
                onPress={() => onChange(!value)}
              >
                <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Ionicons name="ban-outline" size={20} color="#6B7280" />
            <Text style={styles.switchLabel}>Not Valid Above Store Discount</Text>
          </View>
          <Controller
            name="notValidAboveStoreDiscount"
            control={control}
            render={({ field: { value, onChange } }) => (
              <TouchableOpacity
                style={[styles.switch, value && styles.switchActive]}
                onPress={() => onChange(!value)}
              >
                <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Ionicons name="document-text-outline" size={20} color="#6B7280" />
            <Text style={styles.switchLabel}>Single Voucher Per Bill</Text>
          </View>
          <Controller
            name="singleVoucherPerBill"
            control={control}
            render={({ field: { value, onChange } }) => (
              <TouchableOpacity
                style={[styles.switch, value && styles.switchActive]}
                onPress={() => onChange(!value)}
              >
                <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
              </TouchableOpacity>
            )}
          />
        </View>

        <Text style={styles.sectionTitle}>Payment Method *</Text>
        <FormSelect
          name="paymentMethod"
          control={control}
          label="Payment Method"
          options={[
            { label: 'All Payment Methods', value: 'all' },
            { label: 'Card Payment Only', value: 'card' },
            { label: 'UPI Payment Only', value: 'upi' },
          ]}
        />

        {watch('paymentMethod') === 'card' && (
          <>
            <FormSelect
              name="cardType"
              control={control}
              label="Card Type"
              options={[
                { label: 'All Cards', value: 'all' },
                { label: 'Credit Cards Only', value: 'credit' },
                { label: 'Debit Cards Only', value: 'debit' },
              ]}
            />

            <FormInput
              name="bankNames"
              control={control}
              label="Bank Names (Optional)"
              placeholder="HDFC, ICICI, SBI (comma-separated)"
              error={errors.bankNames?.message}
            />

            <FormInput
              name="cardBins"
              control={control}
              label="Card BINs (Optional)"
              placeholder="411111, 555555 (comma-separated, 6 digits each)"
              keyboardType="numeric"
              error={errors.cardBins?.message}
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Display Settings (Optional)</Text>
        <FormInput
          name="displayText"
          control={control}
          label="Display Text"
          placeholder="e.g., 10% Off on bill payment"
          error={errors.displayText?.message}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.updateButton, saving && styles.updateButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.updateButtonText}>Update Discount</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, saving && styles.deleteButtonDisabled]}
            onPress={handleDelete}
            disabled={saving}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
      />

      {/* Alert Modal */}
      <ConfirmModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        confirmText="OK"
        onConfirm={() => {
          if (alertModal.onConfirm) {
            alertModal.onConfirm();
          } else {
            setAlertModal({ ...alertModal, visible: false });
          }
        }}
        onCancel={() => setAlertModal({ ...alertModal, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  storeInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  usageText: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    padding: 2,
  },
  switchActive: {
    backgroundColor: '#3B82F6',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  updateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

