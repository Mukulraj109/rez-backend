# UI Improvement Plan & Coding Agent Prompt

## Goal
Modernize the UI of the Merchant App to be "good looking" and "modern" without altering any business logic or functionality.

## Design Philosophy
- **Clean & Airy**: Increase whitespace (padding/margins) to reduce clutter.
- **Soft Depth**: Use soft, diffuse shadows instead of harsh borders.
- **Rounded Aesthetics**: Increase border radius for a friendlier, modern feel.
- **Subtle Motion**: Incorporate micro-interactions and entry animations.
- **Vibrant Accents**: Use gradients and vibrant colors for primary actions/highlights.

## Updated Design Tokens
The `constants/DesignTokens.ts` file has been updated with:
- **Shadows**: Softer, larger blur radius.
- **Border Radius**: Increased standard radius (`xl`: 16px, `2xl`: 24px).
- **Layout**: Larger default buttons (48px height) and inputs.

## Instructions for Coding Agent

### 1. Global Layout Updates (`app/_layout.tsx`)
- Ensure the background color is consistent (e.g., off-white `gray[50]` for light mode).
- Verify the `StatusBar` style matches the theme.

### 2. Component Modernization (`components/`)

#### UI Components (`components/ui/`)
- **Buttons**: Update to use `Layout.button.height` (48px). Add subtle scale animation on press. Use `LinearGradient` for primary buttons if possible.
- **Cards**: Remove heavy borders. Use `Shadows.base` or `Shadows.md`. Increase padding to `Layout.card.padding`.
- **Inputs**: Increase height to 48px. Add a subtle focus ring or color change.

#### Common Components (`components/common/`)
- **MetricCard**: Use a clean card layout with a subtle icon background circle.
- **Charts**: Ensure chart colors match the theme palette (`Colors.primary`, `Colors.secondary`).

### 3. Screen-Specific Improvements (`app/`)

#### Dashboard (`app/(dashboard)/`)
- **Header**: Create a custom header component with a greeting and maybe a subtle gradient background.
- **Grid**: Use `MasonryFlashList` or standard `FlatList` with generous `contentContainerStyle` padding.
- **Widgets**: Ensure all widgets (Analytics, Orders) have consistent elevation and rounded corners.

#### Auth Screens (`app/(auth)/`)
- **Layout**: Center content with a clean, distraction-free background.
- **Form**: Use large, clear input fields.

#### Lists (Orders, Products)
- **Items**: Use "floating" list items with `Shadows.sm` and white background, separated by margin rather than just border lines.

## Implementation Patterns

### Modern Card Example
```tsx
import { View, StyleSheet, Pressable } from 'react-native';
import { Colors, Shadows, BorderRadius, Spacing } from '@/constants/DesignTokens';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export const ModernCard = ({ children, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => (scale.value = withSpring(0.98))}
      onPressOut={() => (scale.value = withSpring(1))}
      onPress={onPress}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Shadows.base,
    marginBottom: Spacing.md,
  },
});
```

### Gradient Button Example
```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Layout, BorderRadius } from '@/constants/DesignTokens';

export const PrimaryButton = ({ title, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
    <LinearGradient
      colors={[Colors.primary[500], Colors.primary[600]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.button}
    >
      <Text style={styles.text}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    height: Layout.button.height,
    borderRadius: Layout.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  text: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
```

## Execution Plan
1.  **Review `DesignTokens.ts`** (Done).
2.  **Refactor Core UI Components**: `Button`, `Card`, `Input`.
3.  **Apply to Dashboard**: `app/(dashboard)/index.tsx`.
4.  **Apply to Lists**: `app/(orders)/index.tsx`, `app/(products)/index.tsx`.
5.  **Apply to Details**: `app/orders/[id].tsx`.

