/**
 * Onboarding Step 3: Bank Details
 * Placeholder screen - to be implemented with full form
 */

import { View, Text, StyleSheet } from 'react-native';
import { useBankDetailsStep } from '../../hooks/useOnboarding';

export default function Step3Screen() {
  const { data, updateData, isLoading, isSaving } = useBankDetailsStep();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bank Details</Text>
      <Text style={styles.subtitle}>Step 3 of 5</Text>
      {/* Form fields to be implemented */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
});
