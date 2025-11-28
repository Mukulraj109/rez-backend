import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';

// Only import react-native-reanimated on native platforms
if (Platform.OS !== 'web') {
  require('react-native-reanimated');
}

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { MerchantProvider } from '@/contexts/MerchantContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { StoreProvider } from '@/contexts/StoreContext';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ErrorBoundaryProvider } from '@/components/common/ErrorBoundary';
import { NotificationToastContainer } from '@/components/notifications/NotificationToastContainer';
import { queryClient } from '@/config/reactQuery';
import { Colors } from '@/constants/DesignTokens';
import { ThemeProvider as CustomThemeProvider } from '@/components/ui/ThemeProvider';

// Import debug utilities in development
if (__DEV__) {
  import('@/utils/debugAuth');
}

// Custom Theme to match DesignTokens
const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.gray[50], // Off-white background for light mode
    primary: Colors.primary[500],
    text: Colors.text.primary,
    border: Colors.border.default,
    card: Colors.background.primary,
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.gray[900],
    primary: Colors.primary[400],
    text: Colors.gray[100],
    border: Colors.gray[700],
    card: Colors.gray[800],
  },
};

export default function RootLayout() {
  // TEMPORARY: Force clear corrupted storage on iOS to fix token issues
  React.useEffect(() => {
    if (__DEV__ && Platform.OS === 'ios') {
      import('@/utils/debugAuth').then(({ debugAuth }) => {
        debugAuth.clearAllAuth().then(() => {
          console.log('🧹 iOS storage cleared - corrupted tokens removed');
        }).catch(console.error);
      });
    }
  }, []);
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundaryProvider>
        <CustomThemeProvider>
          <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomDefaultTheme}>
            <AuthProvider>
              <MerchantProvider>
                <StoreProvider>
                  <NotificationProvider>
                  <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? Colors.gray[900] : Colors.gray[50] }}>
                    <NotificationToastContainer />
                    <OfflineBanner showDetails />
                    <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: 'slide_from_right',
                      contentStyle: { backgroundColor: colorScheme === 'dark' ? Colors.gray[900] : Colors.gray[50] }
                    }}
                  >
                    {/* Authentication Flow */}
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />

                    {/* Onboarding Flow */}
                    <Stack.Screen
                      name="onboarding"
                      options={{
                        headerShown: false,
                        gestureEnabled: false, // Prevent swipe back during onboarding
                      }}
                    />

                    {/* Product Management Groups */}
                    <Stack.Screen name="(products)" options={{ headerShown: false }} />

                    {/* Main App */}
                    <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />

                    {/* Product Management - Individual product pages */}
                    <Stack.Screen
                      name="products"
                      options={{
                        headerShown: false,
                        presentation: 'card',
                      }}
                    />

                    {/* Order Management */}
                    <Stack.Screen name="(orders)" options={{ headerShown: false }} />

                    {/* Cashback Management */}
                    <Stack.Screen name="(cashback)" options={{ headerShown: false }} />

                    {/* Category Management */}
                    <Stack.Screen name="categories" options={{ headerShown: false }} />

                    {/* Reports */}
                    <Stack.Screen name="reports" options={{ headerShown: false }} />

                    {/* Notifications */}
                    <Stack.Screen name="notifications" options={{ headerShown: false }} />

                    {/* Not Found */}
                    <Stack.Screen name="+not-found" />
                  </Stack>
                  <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor="transparent" translucent />
                </View>
                </NotificationProvider>
                </StoreProvider>
              </MerchantProvider>
            </AuthProvider>
          </ThemeProvider>
        </CustomThemeProvider>
      </ErrorBoundaryProvider>
    </QueryClientProvider>
  );
}
