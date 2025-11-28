/**
 * Onboarding Step 5: Review & Submit
 * Placeholder screen - to be implemented with review summary
 */

import { View, Text, StyleSheet } from 'react-native';
import { useReviewSubmitStep } from '../../hooks/useOnboarding';

export default function Step5Screen() {
  const { data, updateData, allData, isLoading, isSaving, submitOnboarding, canSubmit } = useReviewSubmitStep();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review & Submit</Text>
      <Text style={styles.subtitle}>Step 5 of 5</Text>
      {/* Review summary and submit button to be implemented */}
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
