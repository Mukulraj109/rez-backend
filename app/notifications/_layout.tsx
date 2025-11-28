import { Stack } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function NotificationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#111827',
        headerShadowVisible: false,
        headerBackTitleVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Notifications',
          headerLargeTitle: false,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/notifications/settings')}
              style={{ marginRight: 4 }}
            >
              <Ionicons name="settings-outline" size={24} color="#111827" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="[notificationId]"
        options={{
          title: 'Notification Details',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="preferences"
        options={{
          title: 'Notification Preferences',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Advanced Settings',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
