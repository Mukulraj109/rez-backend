import { Stack } from 'expo-router';

export default function CashbackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Cashback Details',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="analytics"
        options={{
          title: 'Cashback Analytics',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="bulk-actions"
        options={{
          title: 'Bulk Actions',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}