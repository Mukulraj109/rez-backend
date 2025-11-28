/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#7C3AED'; // Purple primary
const tintColorDark = '#8B5CF6';  // Lighter purple for dark mode

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    border: '#E5E7EB',
    card: '#FFFFFF',
    notification: '#FF3B30',
    
    // Merchant app specific colors
    primary: '#7C3AED',      // Purple
    primaryLight: '#A855F7',  // Light purple
    secondary: '#10B981',     // Green for success
    tertiary: '#6366F1',      // Indigo for tertiary actions
    warning: '#F59E0B',       // Amber for warnings
    danger: '#EF4444',        // Red for errors
    destructive: '#EF4444',   // Red for destructive actions
    info: '#3B82F6',          // Blue for info
    
    // Background variants
    backgroundSecondary: '#F9FAFB',
    backgroundTertiary: '#F3F4F6',
    
    // Text variants
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    
    // Status colors
    success: '#10B981',
    error: '#EF4444',
    pending: '#F59E0B',
    approved: '#10B981',
    rejected: '#EF4444',
    
    // Border variants
    borderLight: '#F3F4F6',
    borderMedium: '#E5E7EB',
    borderDark: '#D1D5DB',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    border: '#374151',
    card: '#1F2937',
    notification: '#FF453A',
    
    // Merchant app specific colors
    primary: '#8B5CF6',       // Lighter purple for dark mode
    primaryLight: '#A78BFA',  // Even lighter purple
    secondary: '#34D399',     // Lighter green
    tertiary: '#818CF8',      // Lighter indigo for dark mode
    warning: '#FBBF24',       // Lighter amber
    danger: '#F87171',        // Lighter red
    destructive: '#F87171',   // Lighter red for destructive actions
    info: '#60A5FA',          // Lighter blue
    
    // Background variants
    backgroundSecondary: '#1F2937',
    backgroundTertiary: '#374151',
    
    // Text variants
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    
    // Status colors
    success: '#34D399',
    error: '#F87171',
    pending: '#FBBF24',
    approved: '#34D399',
    rejected: '#F87171',
    
    // Border variants
    borderLight: '#374151',
    borderMedium: '#4B5563',
    borderDark: '#6B7280',
  },
};

export type ColorName = keyof typeof Colors.light;