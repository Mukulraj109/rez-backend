/**
 * Onboarding Step 2: Store Details
 * Placeholder screen - to be implemented with full form
 */

import { View, Text, StyleSheet } from 'react-native';
import { useStoreDetailsStep } from '../../hooks/useOnboarding';

export default function Step2Screen() {
  const { data, updateData, isLoading, isSaving } = useStoreDetailsStep();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Store Details</Text>
      <Text style={styles.subtitle}>Step 2 of 5</Text>
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
