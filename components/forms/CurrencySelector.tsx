import React from 'react';
import { View, StyleSheet } from 'react-native';
import FormSelect from './FormSelect';
import { Colors } from '@/constants/Colors';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
];

interface CurrencySelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function CurrencySelector({
  value,
  onValueChange,
  error,
  disabled = false,
}: CurrencySelectorProps) {
  const currencyOptions = CURRENCIES.map(currency => ({
    label: `${currency.symbol} ${currency.code} - ${currency.name}`,
    value: currency.code,
  }));

  return (
    <View style={styles.container}>
      <FormSelect
        label="Currency"
        value={value}
        onValueChange={onValueChange}
        options={currencyOptions}
        placeholder="Select currency"
        error={error}
        disabled={disabled}
        required
      />
    </View>
  );
}

export { CURRENCIES };

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

