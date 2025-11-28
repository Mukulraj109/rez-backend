import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName, StatusBar } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/DesignTokens';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    tint: string;
    tabIconDefault: string;
    tabIconSelected: string;
    gray: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
  };
  typography: typeof Typography;
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
  shadows: typeof Shadows;
}

// Light theme colors
const lightColors = {
  background: Colors.background?.primary || '#FFFFFF',
  surface: Colors.background?.elevated || '#F9FAFB',
  primary: Colors.primary?.[500] || '#7C3AED',
  secondary: Colors.secondary?.[500] || '#10B981',
  text: Colors.text?.primary || '#111827',
  textSecondary: Colors.text?.secondary || '#6B7280',
  border: Colors.border?.default || '#E5E7EB',
  success: Colors.success?.[500] || '#10B981',
  warning: Colors.warning?.[500] || '#F59E0B',
  error: Colors.error?.[500] || '#EF4444',
  tint: Colors.primary?.[500] || '#7C3AED',
  tabIconDefault: Colors.gray?.[400] || '#9CA3AF',
  tabIconSelected: Colors.primary?.[500] || '#7C3AED',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

// Dark theme colors  
const darkColors = {
  background: Colors.gray?.[900] || '#111827',
  surface: Colors.gray?.[800] || '#1F2937',
  primary: Colors.primary?.[400] || '#A855F7',
  secondary: Colors.secondary?.[400] || '#34D399',
  text: Colors.gray?.[50] || '#F9FAFB',
  textSecondary: Colors.gray?.[300] || '#D1D5DB',
  border: Colors.gray?.[700] || '#374151',
  success: Colors.success?.[400] || '#34D399',
  warning: Colors.warning?.[400] || '#FBBF24',
  error: Colors.error?.[400] || '#F87171',
  tint: Colors.primary?.[400] || '#A855F7',
  tabIconDefault: Colors.gray?.[500] || '#6B7280',
  tabIconSelected: Colors.primary?.[400] || '#A855F7',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

// Create light and dark themes
const createTheme = (mode: ThemeMode, isDark: boolean): Theme => ({
  mode,
  isDark,
  colors: isDark ? darkColors : lightColors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
});

// Theme context
interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider props
interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = 'auto',
}) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialTheme);
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Determine if dark mode should be active
  const isDark = themeMode === 'dark' || (themeMode === 'auto' && systemColorScheme === 'dark');
  
  // Create current theme
  const theme = createTheme(themeMode, isDark);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  // Update status bar style based on theme
  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
  }, [isDark]);

  // Toggle between light and dark mode
  const toggleTheme = () => {
    setThemeMode(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'auto';
      return 'light';
    });
  };

  const contextValue: ThemeContextType = {
    theme,
    themeMode,
    setThemeMode,
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Enhanced hook for component styling (simplified)
export const useThemedStyles = (styleCreator: (theme: Theme) => any): any => {
  const { theme } = useTheme();
  return styleCreator(theme);
};

// Hook for responsive theme values (simplified)
export const useThemeValue = (lightValue: any, darkValue: any): any => {
  const { isDark } = useTheme();
  return isDark ? darkValue : lightValue;
};

// Hook for semantic colors
export const useSemanticColors = () => {
  const { theme, isDark } = useTheme();
  
  return {
    // Status colors
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    info: theme.colors.primary,
    
    // Background variants
    backgroundPrimary: theme.colors.background,
    backgroundSecondary: isDark ? theme.colors.gray[800] : theme.colors.gray[50],
    backgroundTertiary: isDark ? theme.colors.gray[700] : theme.colors.gray[100],
    
    // Text variants
    textPrimary: theme.colors.text,
    textSecondary: theme.colors.textSecondary,
    textTertiary: isDark ? theme.colors.gray[400] : theme.colors.gray[600],
    textInverse: isDark ? theme.colors.gray[900] : theme.colors.gray[50],
    
    // Border variants
    borderLight: isDark ? theme.colors.gray[700] : theme.colors.gray[200],
    borderDefault: theme.colors.border,
    borderStrong: isDark ? theme.colors.gray[600] : theme.colors.gray[300],
    
    // Interactive states
    interactive: theme.colors.primary,
    interactiveHover: isDark ? theme.colors.primary[300] : theme.colors.primary[600],
    interactivePressed: isDark ? theme.colors.primary[200] : theme.colors.primary[700],
    interactiveDisabled: isDark ? theme.colors.gray[600] : theme.colors.gray[300],
  };
};

// Business-specific theme hooks
export const useStatusColors = () => {
  const { theme } = useTheme();
  
  return {
    order: {
      pending: theme.colors.warning[500],
      confirmed: theme.colors.primary,
      preparing: theme.colors.warning[600],
      ready: theme.colors.success[400],
      completed: theme.colors.success,
      cancelled: theme.colors.error,
    },
    cashback: {
      pending: theme.colors.warning[500],
      underReview: theme.colors.primary,
      approved: theme.colors.success,
      rejected: theme.colors.error,
      paid: theme.colors.success[600],
      expired: theme.colors.gray[500],
    },
    risk: {
      low: theme.colors.success,
      medium: theme.colors.warning,
      high: theme.colors.error,
    },
    product: {
      active: theme.colors.success,
      inactive: theme.colors.gray[500],
      outOfStock: theme.colors.error,
      lowStock: theme.colors.warning,
    },
  };
};

export const useMetricColors = () => {
  const { theme } = useTheme();
  
  return {
    positive: theme.colors.success,
    negative: theme.colors.error,
    neutral: theme.colors.gray[500],
    revenue: theme.colors.primary,
    orders: theme.colors.warning[500],
    customers: theme.colors.success[400],
    cashback: theme.colors.warning[600],
  };
};

// Theme persistence helper
export const ThemeStorageKey = 'merchant_app_theme_mode';

export const saveThemeMode = async (mode: ThemeMode) => {
  try {
    // In a real app, you'd use AsyncStorage
    // await AsyncStorage.setItem(ThemeStorageKey, mode);
    localStorage.setItem(ThemeStorageKey, mode);
  } catch (error) {
    console.warn('Failed to save theme mode:', error);
  }
};

export const loadThemeMode = async (): Promise<ThemeMode> => {
  try {
    // In a real app, you'd use AsyncStorage
    // const saved = await AsyncStorage.getItem(ThemeStorageKey);
    const saved = localStorage.getItem(ThemeStorageKey);
    return (saved as ThemeMode) || 'auto';
  } catch (error) {
    console.warn('Failed to load theme mode:', error);
    return 'auto';
  }
};