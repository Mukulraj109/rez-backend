import { Stack } from 'expo-router';

export default function ProductsLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="[id]" 
        options={{ 
          headerShown: false,
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="add" 
        options={{ 
          headerShown: false,
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="edit/[id]" 
        options={{ 
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right',
        }} 
      />
    </Stack>
  );
}
