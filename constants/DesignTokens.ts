/**
 * Design System Constants
 * Centralized design tokens for consistent UI across the merchant app
 */

// Color Palette
export const Colors = {
  // Primary Brand Colors
  primary: {
    50: '#EBF8FF',
    100: '#BEE3F8',
    200: '#90CDF4',
    300: '#63B3ED',
    400: '#4299E1',
    500: '#3182CE', // Main brand color
    600: '#2B77CB',
    700: '#2C5AA0',
    800: '#2A4A7C',
    900: '#203E61',
  },

  // Secondary Colors
  secondary: {
    50: '#F7FAFC',
    100: '#EDF2F7',
    200: '#E2E8F0',
    300: '#CBD5E0',
    400: '#A0AEC0',
    500: '#718096',
    600: '#4A5568',
    700: '#2D3748',
    800: '#1A202C',
    900: '#171923',
  },

  // Semantic Colors
  success: {
    50: '#F0FFF4',
    100: '#C6F6D5',
    200: '#9AE6B4',
    300: '#68D391',
    400: '#48BB78',
    500: '#38A169',
    600: '#2F855A',
    700: '#276749',
    800: '#22543D',
    900: '#1C4532',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Neutral Grays
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

  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Text Colors
  text: {
    primary: '#111827',
    secondary: '#374151',
    tertiary: '#6B7280',
    inverse: '#FFFFFF',
    disabled: '#9CA3AF',
  },

  // Border Colors
  border: {
    light: '#F3F4F6',
    default: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
    focus: '#3182CE',
  },
};

// Typography Scale
export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
    mono: 'Courier',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },

  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
    '5xl': 52,
    '6xl': 64,
  },

  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    extraBold: '800',
  },

  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },
};

// Spacing Scale (in pixels)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
  '7xl': 96,
  '8xl': 128,
};

// Border Radius
export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 16,
  },
};

// Layout Dimensions
export const Layout = {
  window: {
    width: '100%',
    height: '100%',
  },
  
  header: {
    height: 64,
    paddingHorizontal: 20,
  },
  
  tabBar: {
    height: 70,
    paddingBottom: 12,
  },
  
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  
  card: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
  },
  
  modal: {
    borderRadius: 24,
    padding: 24,
  },
  
  button: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  
  input: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
};

// Animation Durations (in milliseconds)
export const Animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
  },
  
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    linear: 'linear',
  },
};

// Z-Index Layers
export const ZIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};

// Breakpoints for Responsive Design
export const Breakpoints = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

// Component Variants
export const ComponentVariants = {
  button: {
    primary: {
      backgroundColor: Colors.primary[500],
      borderColor: Colors.primary[500],
      color: Colors.text.inverse,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderColor: Colors.primary[500],
      color: Colors.primary[500],
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: Colors.primary[500],
    },
    danger: {
      backgroundColor: Colors.error[500],
      borderColor: Colors.error[500],
      color: Colors.text.inverse,
    },
  },
  
  card: {
    default: {
      backgroundColor: Colors.background.primary,
      borderColor: Colors.border.default,
      borderWidth: 1,
    },
    elevated: {
      backgroundColor: Colors.background.elevated,
      ...Shadows.md,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderColor: Colors.border.default,
      borderWidth: 1,
    },
  },
  
  badge: {
    default: {
      backgroundColor: Colors.gray[100],
      color: Colors.gray[800],
    },
    primary: {
      backgroundColor: Colors.primary[100],
      color: Colors.primary[800],
    },
    success: {
      backgroundColor: Colors.success[100],
      color: Colors.success[800],
    },
    warning: {
      backgroundColor: Colors.warning[100],
      color: Colors.warning[800],
    },
    error: {
      backgroundColor: Colors.error[100],
      color: Colors.error[800],
    },
  },
};

// Business-Specific Color Mappings
export const BusinessColors = {
  order: {
    pending: Colors.warning[500],
    confirmed: Colors.primary[500],
    preparing: Colors.warning[600],
    ready: Colors.success[400],
    completed: Colors.success[500],
    cancelled: Colors.error[500],
  },
  
  cashback: {
    pending: Colors.warning[500],
    underReview: Colors.primary[400],
    approved: Colors.success[500],
    rejected: Colors.error[500],
    paid: Colors.success[600],
    expired: Colors.gray[500],
  },
  
  risk: {
    low: Colors.success[500],
    medium: Colors.warning[500],
    high: Colors.error[500],
  },
  
  product: {
    active: Colors.success[500],
    inactive: Colors.gray[500],
    outOfStock: Colors.error[500],
    lowStock: Colors.warning[500],
  },
  
  metrics: {
    positive: Colors.success[500],
    negative: Colors.error[500],
    neutral: Colors.gray[500],
  },
};

// Icon Sizes
export const IconSizes = {
  xs: 12,
  sm: 16,
  base: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
};

// Form Component Sizes
export const FormSizes = {
  input: {
    small: {
      height: 36,
      paddingHorizontal: 12,
      fontSize: Typography.fontSize.sm,
    },
    medium: {
      height: 44,
      paddingHorizontal: 16,
      fontSize: Typography.fontSize.base,
    },
    large: {
      height: 52,
      paddingHorizontal: 20,
      fontSize: Typography.fontSize.lg,
    },
  },
  
  button: {
    small: {
      height: 36,
      paddingHorizontal: 16,
      fontSize: Typography.fontSize.sm,
    },
    medium: {
      height: 44,
      paddingHorizontal: 20,
      fontSize: Typography.fontSize.base,
    },
    large: {
      height: 52,
      paddingHorizontal: 24,
      fontSize: Typography.fontSize.lg,
    },
  },
};

// Accessibility Constants
export const Accessibility = {
  minTouchTarget: 44,
  focusRingWidth: 2,
  focusRingColor: Colors.primary[500],
  contrastRatios: {
    normal: 4.5,
    large: 3,
    enhanced: 7,
  },
};

// Default Component Styles
export const DefaultStyles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.base,
  },
  
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Shadows.md,
  },
  
  headerText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    lineHeight: Typography.lineHeight['2xl'],
  },
  
  bodyText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeight.base,
  },
  
  captionText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal,
    color: Colors.text.tertiary,
    lineHeight: Typography.lineHeight.sm,
  },
  
  button: {
    height: Layout.button.height,
    paddingHorizontal: Layout.button.paddingHorizontal,
    borderRadius: Layout.button.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  
  input: {
    height: Layout.input.height,
    paddingHorizontal: Layout.input.paddingHorizontal,
    borderRadius: Layout.input.borderRadius,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.background.primary,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
};