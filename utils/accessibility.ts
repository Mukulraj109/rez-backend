import { AccessibilityInfo, AccessibilityRole, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';

export type AccessibilityActions = 
  | 'activate'
  | 'increment'
  | 'decrement'
  | 'longpress'
  | 'escape'
  | 'dismiss'
  | 'expand'
  | 'collapse'
  | 'select'
  | 'deselect'
  | 'scroll_up'
  | 'scroll_down'
  | 'scroll_left'
  | 'scroll_right';

export interface AccessibilityProps {
  accessible?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };
  accessibilityActions?: Array<{
    name: AccessibilityActions;
    label?: string;
  }>;
  onAccessibilityAction?: (event: { nativeEvent: { actionName: AccessibilityActions } }) => void;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  accessibilityLabelledBy?: string | string[];
  accessibilityDescribedBy?: string | string[];
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}

class AccessibilityService {
  private static instance: AccessibilityService;
  private screenReaderEnabled: boolean = false;
  private highContrastEnabled: boolean = false;
  private reduceMotionEnabled: boolean = false;
  private announcements: string[] = [];

  private constructor() {
    this.checkAccessibilityFeatures();
  }

  public static getInstance(): AccessibilityService {
    if (!AccessibilityService.instance) {
      AccessibilityService.instance = new AccessibilityService();
    }
    return AccessibilityService.instance;
  }

  private async checkAccessibilityFeatures(): Promise<void> {
    try {
      this.screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      
      if (Platform.OS === 'ios') {
        // Check for iOS-specific accessibility features
        this.highContrastEnabled = await AccessibilityInfo.isAccessibilityServiceEnabled();
        this.reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      } else if (Platform.OS === 'android') {
        // Check for Android-specific accessibility features
        this.highContrastEnabled = await AccessibilityInfo.isAccessibilityServiceEnabled();
      }
    } catch (error) {
      console.warn('Error checking accessibility features:', error);
    }
  }

  public isScreenReaderEnabled(): boolean {
    return this.screenReaderEnabled;
  }

  public isHighContrastEnabled(): boolean {
    return this.highContrastEnabled;
  }

  public isReduceMotionEnabled(): boolean {
    return this.reduceMotionEnabled;
  }

  public async announceMessage(message: string, priority: 'polite' | 'assertive' = 'polite'): Promise<void> {
    try {
      if (this.screenReaderEnabled) {
        await AccessibilityInfo.announceForAccessibility(message);
        this.announcements.push(message);
      }
    } catch (error) {
      console.warn('Error announcing message:', error);
    }
  }

  public getRecentAnnouncements(): string[] {
    return [...this.announcements];
  }

  public clearAnnouncements(): void {
    this.announcements = [];
  }

  // Business-specific accessibility helpers
  public async announceOrderUpdate(orderNumber: string, newStatus: string): Promise<void> {
    const message = `Order ${orderNumber} status updated to ${newStatus}`;
    await this.announceMessage(message, 'assertive');
  }

  public async announceCashbackDecision(amount: number, decision: 'approved' | 'rejected'): Promise<void> {
    const message = `Cashback request for ₹${amount} has been ${decision}`;
    await this.announceMessage(message, 'assertive');
  }

  public async announceDataRefresh(dataType: string): Promise<void> {
    const message = `${dataType} data has been refreshed`;
    await this.announceMessage(message, 'polite');
  }

  public async announceError(error: string): Promise<void> {
    const message = `Error: ${error}`;
    await this.announceMessage(message, 'assertive');
  }

  public async announceSuccess(action: string): Promise<void> {
    const message = `Success: ${action} completed`;
    await this.announceMessage(message, 'polite');
  }
}

export const accessibilityService = AccessibilityService.getInstance();

// Hook for accessibility state management
export const useAccessibility = () => {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [highContrastEnabled, setHighContrastEnabled] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    const checkInitialState = async () => {
      setScreenReaderEnabled(accessibilityService.isScreenReaderEnabled());
      setHighContrastEnabled(accessibilityService.isHighContrastEnabled());
      setReduceMotionEnabled(accessibilityService.isReduceMotionEnabled());
    };

    checkInitialState();

    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled
    );

    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled
    );

    return () => {
      screenReaderSubscription?.remove();
      reduceMotionSubscription?.remove();
    };
  }, []);

  const announce = useCallback(async (message: string, priority?: 'polite' | 'assertive') => {
    await accessibilityService.announceMessage(message, priority);
  }, []);

  return {
    screenReaderEnabled,
    highContrastEnabled,
    reduceMotionEnabled,
    announce,
    service: accessibilityService,
  };
};

// Accessibility helper functions
export const AccessibilityHelpers = {
  // Create accessible button props
  createButtonProps: (
    label: string,
    hint?: string,
    disabled: boolean = false,
    selected: boolean = false
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'button',
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: {
      disabled,
      selected,
    },
  }),

  // Create accessible text input props
  createTextInputProps: (
    label: string,
    value?: string,
    placeholder?: string,
    required: boolean = false,
    error?: string
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'text',
    accessibilityLabel: label + (required ? ' required' : ''),
    accessibilityValue: { text: value || placeholder || '' },
    accessibilityHint: error || 'Double tap to edit',
    accessibilityState: {
      disabled: false,
    },
  }),

  // Create accessible switch props
  createSwitchProps: (
    label: string,
    value: boolean,
    disabled: boolean = false
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'switch',
    accessibilityLabel: label,
    accessibilityValue: { text: value ? 'on' : 'off' },
    accessibilityState: {
      checked: value,
      disabled,
    },
  }),

  // Create accessible list props
  createListProps: (
    label: string,
    itemCount: number
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'list',
    accessibilityLabel: `${label}, ${itemCount} items`,
  }),

  // Create accessible list item props
  createListItemProps: (
    label: string,
    index: number,
    total: number,
    selected: boolean = false
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'button',
    accessibilityLabel: `${label}, ${index + 1} of ${total}`,
    accessibilityState: {
      selected,
    },
  }),

  // Create accessible modal props
  createModalProps: (
    title: string,
    dismissible: boolean = true
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'none' as any, // 'dialog' not supported in RN, using 'none' with cast
    accessibilityLabel: title,
    accessibilityHint: dismissible ? 'Swipe down to close' : undefined,
    accessibilityActions: dismissible ? [{ name: 'dismiss' }] : undefined,
  }),

  // Create accessible tab props
  createTabProps: (
    label: string,
    selected: boolean,
    index: number,
    total: number
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'tab',
    accessibilityLabel: `${label}, tab ${index + 1} of ${total}`,
    accessibilityState: {
      selected,
    },
  }),

  // Create accessible card props
  createCardProps: (
    title: string,
    subtitle?: string,
    actionable: boolean = false
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: actionable ? 'button' : 'text',
    accessibilityLabel: subtitle ? `${title}, ${subtitle}` : title,
    accessibilityHint: actionable ? 'Double tap to open' : undefined,
  }),

  // Create accessible progress indicator props
  createProgressProps: (
    label: string,
    current: number,
    total: number
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'progressbar',
    accessibilityLabel: label,
    accessibilityValue: {
      min: 0,
      max: total,
      now: current,
      text: `${Math.round((current / total) * 100)}% complete`,
    },
  }),

  // Create accessible image props
  createImageProps: (
    description: string,
    decorative: boolean = false
  ): AccessibilityProps => ({
    accessible: !decorative,
    accessibilityRole: decorative ? 'image' : 'imagebutton',
    accessibilityLabel: decorative ? undefined : description,
    importantForAccessibility: decorative ? 'no' : 'yes',
  }),

  // Create screen reader optimized announcement
  formatAnnouncement: (
    title: string,
    details: string[],
    priority: 'polite' | 'assertive' = 'polite'
  ): string => {
    const formattedDetails = details.join(', ');
    return `${title}. ${formattedDetails}`;
  },

  // Create accessible form field props
  createFormFieldProps: (
    label: string,
    value: string,
    error?: string,
    required: boolean = false,
    type: 'text' | 'email' | 'password' | 'number' = 'text'
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'text',
    accessibilityLabel: `${label}${required ? ', required' : ''}${error ? ', error' : ''}`,
    accessibilityValue: { text: value },
    accessibilityHint: error || `Enter ${type === 'password' ? 'password' : label.toLowerCase()}`,
    accessibilityState: {
      disabled: false,
    },
  }),
};

// Screen reader specific utilities
export const ScreenReaderUtils = {
  // Skip navigation helper
  createSkipLink: (targetId: string, label: string = 'Skip to main content'): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'link',
    accessibilityLabel: label,
    accessibilityHint: 'Double tap to skip navigation',
  }),

  // Landmark navigation
  createLandmark: (
    type: 'main' | 'navigation' | 'banner' | 'complementary' | 'contentinfo',
    label?: string
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'none' as any, // 'main'/'complementary' not supported in RN
    accessibilityLabel: label,
  }),

  // Live region for dynamic content
  createLiveRegion: (
    content: string,
    level: 'polite' | 'assertive' = 'polite'
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityLiveRegion: level,
    accessibilityLabel: content,
  }),

  // Table accessibility
  createTableProps: (
    caption: string,
    rowCount: number,
    columnCount: number
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'none' as any, // 'grid' not supported in RN
    accessibilityLabel: `${caption}, ${rowCount} rows, ${columnCount} columns`,
  }),

  createTableCellProps: (
    content: string,
    rowIndex: number,
    columnIndex: number,
    isHeader: boolean = false
  ): AccessibilityProps => ({
    accessible: true,
    accessibilityRole: 'none' as any, // 'columnheader'/'gridcell' not supported in RN
    accessibilityLabel: content,
    accessibilityValue: { text: `Row ${rowIndex + 1}, Column ${columnIndex + 1}` },
  }),
};

// High contrast and visual accessibility utilities
export const VisualAccessibilityUtils = {
  // Get high contrast colors
  getContrastColors: (highContrast: boolean) => ({
    background: highContrast ? '#000000' : '#FFFFFF',
    text: highContrast ? '#FFFFFF' : '#000000',
    border: highContrast ? '#FFFFFF' : '#E5E7EB',
    primary: highContrast ? '#FFFF00' : '#3B82F6',
    danger: highContrast ? '#FF0000' : '#EF4444',
    success: highContrast ? '#00FF00' : '#10B981',
  }),

  // Focus indicator styles
  getFocusStyles: (highContrast: boolean) => ({
    borderWidth: 2,
    borderColor: highContrast ? '#FFFF00' : '#3B82F6',
    backgroundColor: highContrast ? '#000000' : 'rgba(59, 130, 246, 0.1)',
  }),

  // Text size scaling
  getScaledFontSize: (baseSize: number, scale: number = 1) => {
    return Math.round(baseSize * scale);
  },

  // Touch target sizing
  getMinimumTouchTarget: () => ({
    minWidth: 44,
    minHeight: 44,
  }),
};

// Business logic accessibility helpers
export const BusinessAccessibilityHelpers = {
  // Order status accessibility
  createOrderStatusProps: (
    orderNumber: string,
    status: string,
    customerName: string
  ): AccessibilityProps => ({
    ...AccessibilityHelpers.createCardProps(
      `Order ${orderNumber}`,
      `Status: ${status}, Customer: ${customerName}`,
      true
    ),
  }),

  // Cashback request accessibility
  createCashbackRequestProps: (
    amount: number,
    customerName: string,
    status: string,
    riskLevel?: string
  ): AccessibilityProps => ({
    ...AccessibilityHelpers.createCardProps(
      `Cashback request for ₹${amount}`,
      `Customer: ${customerName}, Status: ${status}${riskLevel ? `, Risk: ${riskLevel}` : ''}`,
      true
    ),
  }),

  // Product accessibility
  createProductProps: (
    name: string,
    price: number,
    stock: number,
    status: string
  ): AccessibilityProps => ({
    ...AccessibilityHelpers.createCardProps(
      name,
      `Price: ₹${price}, Stock: ${stock}, Status: ${status}`,
      true
    ),
  }),

  // Dashboard metric accessibility
  createMetricProps: (
    title: string,
    value: string | number,
    change?: number
  ): AccessibilityProps => ({
    ...AccessibilityHelpers.createCardProps(
      title,
      `Value: ${value}${change ? `, Change: ${change > 0 ? '+' : ''}${change}%` : ''}`,
      true
    ),
  }),

  // Approval action accessibility
  createApprovalActionProps: (
    action: 'approve' | 'reject',
    itemType: string,
    amount?: number
  ): AccessibilityProps => ({
    ...AccessibilityHelpers.createButtonProps(
      `${action.charAt(0).toUpperCase() + action.slice(1)} ${itemType}${amount ? ` for ₹${amount}` : ''}`,
      `Double tap to ${action} this ${itemType}`,
      false
    ),
  }),
};