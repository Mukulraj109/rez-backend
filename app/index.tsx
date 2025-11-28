import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, StyleSheet, Text, Platform } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';

export default function App() {
  const { state } = useAuth();

  useEffect(() => {
    console.log('🧭 App navigation check - Loading:', state.isLoading, 'Authenticated:', state.isAuthenticated);
    
    if (!state.isLoading) {
      if (state.isAuthenticated) {
        console.log('🏠 User authenticated - navigating to dashboard');
        router.replace('/(dashboard)');
      } else {
        console.log('🔐 User not authenticated - navigating to login');
        router.replace('/(auth)/login');
      }
    }
  }, [state.isLoading, state.isAuthenticated]);

  // Show loading screen while checking authentication
  if (state.isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>
          Rez Merchant ({Platform.OS})
        </Text>
        <Text style={styles.subtitle}>
          Loading...
        </Text>
      </View>
    );
  }

  // Add a fallback render for debugging
  return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>
        App Ready - Auth State: {state.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginBottom: 16,
  },
  subtitle: {
    opacity: 0.7,
  },
});