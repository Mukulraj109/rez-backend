/**
 * Onboarding Step 4: Upload Documents
 * Placeholder screen - to be implemented with file upload
 */

import { View, Text, StyleSheet } from 'react-native';
import { useDocumentsStep } from '../../hooks/useOnboarding';

export default function Step4Screen() {
  const { data, updateData, isLoading, isSaving } = useDocumentsStep();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Documents</Text>
      <Text style={styles.subtitle}>Step 4 of 5</Text>
      {/* Document upload UI to be implemented */}
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
