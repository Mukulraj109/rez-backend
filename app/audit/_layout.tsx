/**
 * Audit Logs Layout
 * Navigation layout for audit log screens
 */

import { Stack } from 'expo-router';
import React from 'react';
import { Colors } from '@/constants/Colors';

export default function AuditLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.light.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Audit Logs',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="[logId]"
        options={{
          title: 'Audit Log Details',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="filters"
        options={{
          title: 'Filter Audit Logs',
          presentation: 'modal',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
