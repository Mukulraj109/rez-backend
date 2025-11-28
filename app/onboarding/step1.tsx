/**
 * Onboarding Step 1: Business Information
 * Placeholder screen - to be implemented with full form
 */

import { View, Text, StyleSheet } from 'react-native';
import { useBusinessInfoStep } from '../../hooks/useOnboarding';

export default function Step1Screen() {
  const { data, updateData, isLoading, isSaving } = useBusinessInfoStep();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Business Information</Text>
      <Text style={styles.subtitle}>Step 1 of 5</Text>
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
