import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export type DeviceType = 'phone' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveLayout {
  deviceType: DeviceType;
  orientation: Orientation;
  isTablet: boolean;
  isPhone: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
  usableWidth: number;
  usableHeight: number;
  gridColumns: number;
  spacing: number;
  margin: number;
  cardMinWidth: number;
  cardMaxWidth: number;
  modalWidth: number;
  modalHeight: number;
}

export interface BreakpointConfig {
  phone: {
    maxWidth: number;
    columns: number;
    spacing: number;
    margin: number;
  };
  tablet: {
    minWidth: number;
    maxWidth: number;
    columns: number;
    spacing: number;
    margin: number;
  };
  desktop: {
    minWidth: number;
    columns: number;
    spacing: number;
    margin: number;
  };
}

const defaultBreakpoints: BreakpointConfig = {
  phone: {
    maxWidth: 768,
    columns: 2,
    spacing: 12,
    margin: 16,
  },
  tablet: {
    minWidth: 768,
    maxWidth: 1024,
    columns: 3,
    spacing: 16,
    margin: 24,
  },
  desktop: {
    minWidth: 1024,
    columns: 4,
    spacing: 20,
    margin: 32,
  },
};

function getDeviceType(width: number, height: number): DeviceType {
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);

  // Check if it's a phone (smaller dimension < 768)
  if (minDimension < defaultBreakpoints.tablet.minWidth) {
    return 'phone';
  }

  // Check if it's a tablet (768 <= smaller dimension < 1024)
  if (minDimension < defaultBreakpoints.desktop.minWidth) {
    return 'tablet';
  }

  // Desktop/large tablet
  return 'desktop';
}

function getOrientation(width: number, height: number): Orientation {
  return width > height ? 'landscape' : 'portrait';
}

function calculateLayout(
  width: number,
  height: number,
  deviceType: DeviceType,
  orientation: Orientation,
  breakpoints: BreakpointConfig = defaultBreakpoints
): ResponsiveLayout {
  const config = breakpoints[deviceType];
  
  // Adjust columns based on orientation for tablets
  let gridColumns = config.columns;
  if (deviceType === 'tablet' && orientation === 'portrait') {
    gridColumns = Math.max(2, config.columns - 1);
  } else if (deviceType === 'phone' && orientation === 'landscape') {
    gridColumns = Math.min(3, config.columns + 1);
  }

  // Calculate usable dimensions (accounting for safe areas, status bars, etc.)
  const usableWidth = width - (config.margin * 2);
  const usableHeight = height - (config.margin * 2);

  // Calculate card dimensions
  const cardMinWidth = Math.min(280, (usableWidth - (config.spacing * (gridColumns - 1))) / gridColumns);
  const cardMaxWidth = Math.min(400, usableWidth);

  // Calculate modal dimensions
  const modalWidth = deviceType === 'phone' 
    ? Math.min(width * 0.9, 400) 
    : Math.min(width * 0.7, 600);
  const modalHeight = deviceType === 'phone' 
    ? Math.min(height * 0.8, 600) 
    : Math.min(height * 0.7, 700);

  return {
    deviceType,
    orientation,
    isTablet: deviceType === 'tablet',
    isPhone: deviceType === 'phone',
    isDesktop: deviceType === 'desktop',
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    screenWidth: width,
    screenHeight: height,
    usableWidth,
    usableHeight,
    gridColumns,
    spacing: config.spacing,
    margin: config.margin,
    cardMinWidth,
    cardMaxWidth,
    modalWidth,
    modalHeight,
  };
}

export const useResponsiveLayout = (customBreakpoints?: Partial<BreakpointConfig>): ResponsiveLayout => {
  const [layout, setLayout] = useState<ResponsiveLayout>(() => {
    const { width, height } = Dimensions.get('window');
    const deviceType = getDeviceType(width, height);
    const orientation = getOrientation(width, height);
    const breakpoints = customBreakpoints 
      ? { ...defaultBreakpoints, ...customBreakpoints }
      : defaultBreakpoints;
    
    return calculateLayout(width, height, deviceType, orientation, breakpoints);
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const deviceType = getDeviceType(window.width, window.height);
      const orientation = getOrientation(window.width, window.height);
      const breakpoints = customBreakpoints 
        ? { ...defaultBreakpoints, ...customBreakpoints }
        : defaultBreakpoints;
      
      setLayout(calculateLayout(window.width, window.height, deviceType, orientation, breakpoints));
    });

    return () => subscription?.remove();
  }, [customBreakpoints]);

  return layout;
};

// Hook for responsive dimensions
export const useResponsiveDimensions = () => {
  const layout = useResponsiveLayout();
  
  return {
    // Grid layout helpers
    getGridItemWidth: (columns?: number) => {
      const cols = columns || layout.gridColumns;
      return (layout.usableWidth - (layout.spacing * (cols - 1))) / cols;
    },
    
    // Responsive padding/margin
    getHorizontalPadding: () => layout.margin,
    getVerticalPadding: () => layout.margin,
    getSpacing: () => layout.spacing,
    
    // Component sizing
    getButtonHeight: () => layout.isTablet ? 52 : 44,
    getInputHeight: () => layout.isTablet ? 48 : 40,
    getHeaderHeight: () => layout.isTablet ? 64 : 56,
    
    // Typography scaling
    getFontSize: (baseSize: number) => {
      const scale = layout.isTablet ? 1.1 : layout.isPhone ? 1 : 1.2;
      return Math.round(baseSize * scale);
    },
    
    // Icon sizing
    getIconSize: (baseSize: number) => {
      const scale = layout.isTablet ? 1.2 : layout.isPhone ? 1 : 1.3;
      return Math.round(baseSize * scale);
    },
    
    ...layout,
  };
};

// Hook for responsive component props
export const useResponsiveProps = <T extends Record<string, any>>(
  phoneProps: T,
  tabletProps?: Partial<T>,
  desktopProps?: Partial<T>
): T => {
  const { deviceType } = useResponsiveLayout();
  
  let props = phoneProps;
  
  if (deviceType === 'tablet' && tabletProps) {
    props = { ...props, ...tabletProps };
  } else if (deviceType === 'desktop' && desktopProps) {
    props = { ...props, ...desktopProps };
  }
  
  return props;
};

// Hook for responsive styles
export const useResponsiveStyles = <T extends Record<string, any>>(
  styles: {
    phone: T;
    tablet?: Partial<T>;
    desktop?: Partial<T>;
  }
): T => {
  const { deviceType } = useResponsiveLayout();
  
  let computedStyles = styles.phone;
  
  if (deviceType === 'tablet' && styles.tablet) {
    computedStyles = { ...computedStyles, ...styles.tablet };
  } else if (deviceType === 'desktop' && styles.desktop) {
    computedStyles = { ...computedStyles, ...styles.desktop };
  }
  
  return computedStyles;
};

// Utility functions for responsive calculations
export const ResponsiveUtils = {
  // Calculate number of columns based on item width and screen size
  calculateColumns: (itemWidth: number, screenWidth: number, spacing: number = 16, margin: number = 16): number => {
    const availableWidth = screenWidth - (margin * 2);
    const maxColumns = Math.floor((availableWidth + spacing) / (itemWidth + spacing));
    return Math.max(1, maxColumns);
  },
  
  // Get responsive value based on device type
  getResponsiveValue: <T>(values: { phone: T; tablet?: T; desktop?: T }, deviceType: DeviceType): T => {
    if (deviceType === 'tablet' && values.tablet !== undefined) {
      return values.tablet;
    }
    if (deviceType === 'desktop' && values.desktop !== undefined) {
      return values.desktop;
    }
    return values.phone;
  },
  
  // Scale value based on device type
  scaleValue: (baseValue: number, deviceType: DeviceType): number => {
    const scales = {
      phone: 1,
      tablet: 1.2,
      desktop: 1.4,
    };
    return Math.round(baseValue * scales[deviceType]);
  },
  
  // Check if device supports specific features
  supportsHover: (): boolean => {
    return Platform.OS === 'web';
  },
  
  supportsKeyboard: (): boolean => {
    return Platform.OS === 'web' || Platform.OS === 'macos';
  },
  
  // Get optimal modal size
  getModalSize: (
    deviceType: DeviceType, 
    screenWidth: number, 
    screenHeight: number,
    contentRatio: number = 0.8
  ): { width: number; height: number } => {
    if (deviceType === 'phone') {
      return {
        width: Math.min(screenWidth * 0.9, 400),
        height: Math.min(screenHeight * 0.8, 600),
      };
    } else if (deviceType === 'tablet') {
      return {
        width: Math.min(screenWidth * 0.7, 600),
        height: Math.min(screenHeight * 0.7, 700),
      };
    } else {
      return {
        width: Math.min(screenWidth * 0.6, 800),
        height: Math.min(screenHeight * 0.8, 900),
      };
    }
  },
};