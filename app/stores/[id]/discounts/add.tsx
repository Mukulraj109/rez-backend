import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { discountsService, CreateDiscountRequest } from '@/services/api/discounts';
import { useStore } from '@/contexts/StoreContext';
import ConfirmModal from '@/components/common/ConfirmModal';

const discountSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  type: z.enum(['percentage', 'fixed']),
  value: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number').refine(
    (val) => {
      const num = parseFloat(val);
      return num >= 0 && (num <= 100 || true); // Allow > 100 for fixed amounts
    },
    'Must be a valid number'
  ),
  minOrderValue: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number').refine(
    (val) => parseFloat(val) >= 0,
    'Must be 0 or greater'
  ),
  maxDiscountAmount: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number').optional().or(z.literal('')),
  validFrom: z.string().min(1, 'Start date is required'),
  validUntil: z.string().min(1, 'End date is required'),
  usageLimit: z.string().regex(/^\d+$/, 'Must be a number').optional().or(z.literal('')),
  usageLimitPerUser: z.string().regex(/^\d+$/, 'Must be a number').default('1'),
  priority: z.string().regex(/^\d+$/, 'Must be a number').default('0'),
  isOfflineOnly: z.boolean().default(false),
  notValidAboveStoreDiscount: z.boolean().default(false),
  singleVoucherPerBill: z.boolean().default(true),
  displayText: z.string().optional().or(z.literal('')),
  // Card Offer Fields
  paymentMethod: z.enum(['upi', 'card', 'all']).default('all'),
  cardType: z.enum(['credit', 'debit', 'all']).optional(),
  bankNames: z.string().optional(), // Comma-separated string
  cardBins: z.string().optional(), // Comma-separated string
});

type DiscountFormData = z.infer<typeof discountSchema>;

export default function AddDiscountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.id as string;
  const paymentMethod = params.paymentMethod as string | undefined; // Get payment method from params
  const { stores } = useStore();
  const store = stores.find(s => s._id === storeId);

  const [loading, setLoading] = useState(false);
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
    watch,
  } = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'percentage',
      value: '10',
      minOrderValue: '0',
      maxDiscountAmount: '',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      usageLimit: '',
      usageLimitPerUser: '1',
      priority: '0',
      isOfflineOnly: false,
      notValidAboveStoreDiscount: false,
      singleVoucherPerBill: true,
      displayText: '',
      paymentMethod: (paymentMethod as 'upi' | 'card' | 'all') || 'all', // Use payment method from params if provided
      cardType: 'all',
      bankNames: '',
      cardBins: '',
    },
  });

  const discountType = watch('type');

  const onSubmit = async (data: DiscountFormData) => {
    try {
      setLoading(true);

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

      // Determine applicableOn based on paymentMethod from form data
      // If paymentMethod is 'card', set applicableOn to 'card_payment'
      // If paymentMethod is 'upi', set applicableOn to 'bill_payment'
      // Otherwise, use route param or default to 'bill_payment'
      let applicableOnValue: 'bill_payment' | 'card_payment' = 'bill_payment';
      if (data.paymentMethod === 'card') {
        applicableOnValue = 'card_payment';
      } else if (data.paymentMethod === 'upi') {
        applicableOnValue = 'bill_payment';
      } else if (paymentMethod === 'card') {
        // Fallback to route param if form value is 'all'
        applicableOnValue = 'card_payment';
      }

      const discountData: CreateDiscountRequest = {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        type: data.type,
        value: parseFloat(data.value),
        minOrderValue: parseFloat(data.minOrderValue),
        maxDiscountAmount: data.maxDiscountAmount ? parseFloat(data.maxDiscountAmount) : undefined,
        storeId: storeId, // Store ID is pre-filled from route
        applicableOn: applicableOnValue, // Set based on payment method from form
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

      const response = await discountsService.createDiscount(discountData);

      if (response.success) {
        setAlertModal({
          visible: true,
          title: 'Success',
          message: 'Discount created successfully',
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
          message: response.message || 'Failed to create discount',
          type: 'danger',
        });
      }
    } catch (error: any) {
      console.error('Error creating discount:', error);
      setAlertModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to create discount',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Discount</Text>
        <View style={{ width: 24 }} />
      </View>

      {store && (
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeSubtext}>Create a UPI payment discount for this store</Text>
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

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Create Discount</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

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
    marginBottom: 4,
  },
  storeSubtext: {
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

