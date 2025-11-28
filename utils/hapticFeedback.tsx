import React, { useCallback, useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticFeedbackType = 
  | 'light'
  | 'medium' 
  | 'heavy'
  | 'selection'
  | 'success'
  | 'warning'
  | 'error'
  | 'rigid'
  | 'soft';

export interface HapticOptions {
  enabled?: boolean;
  intensity?: number;
  duration?: number;
}

class HapticFeedbackService {
  private static instance: HapticFeedbackService;
  private isEnabled: boolean = true;
  private defaultOptions: HapticOptions = {
    enabled: true,
    intensity: 1.0,
    duration: 100
  };

  private constructor() {
    this.checkHapticSupport();
  }

  public static getInstance(): HapticFeedbackService {
    if (!HapticFeedbackService.instance) {
      HapticFeedbackService.instance = new HapticFeedbackService();
    }
    return HapticFeedbackService.instance;
  }

  private async checkHapticSupport(): Promise<void> {
    try {
      // Check if haptics are supported on this device
      if (Platform.OS === 'ios') {
        this.isEnabled = true;
      } else if (Platform.OS === 'android') {
        // Android haptics are generally supported on most modern devices
        this.isEnabled = true;
      } else {
        this.isEnabled = false;
      }
    } catch (error) {
      console.warn('Haptic feedback not supported on this device:', error);
      this.isEnabled = false;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public isHapticEnabled(): boolean {
    return this.isEnabled;
  }

  public setDefaultOptions(options: Partial<HapticOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  public async trigger(
    type: HapticFeedbackType, 
    options: HapticOptions = {}
  ): Promise<void> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    if (!this.isEnabled || !mergedOptions.enabled) {
      return;
    }

    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'rigid':
          if (Platform.OS === 'ios') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
          } else {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
          break;
        case 'soft':
          if (Platform.OS === 'ios') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
          } else {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          break;
        case 'selection':
          await Haptics.selectionAsync();
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.warn('Failed to trigger haptic feedback:', error);
    }
  }

  // Convenience methods for common interactions
  public async buttonPress(): Promise<void> {
    await this.trigger('light');
  }

  public async cardPress(): Promise<void> {
    await this.trigger('medium');
  }

  public async tabSwitch(): Promise<void> {
    await this.trigger('selection');
  }

  public async swipeAction(): Promise<void> {
    await this.trigger('medium');
  }

  public async longPress(): Promise<void> {
    await this.trigger('heavy');
  }

  public async pullRefresh(): Promise<void> {
    await this.trigger('light');
  }

  public async toggleSwitch(): Promise<void> {
    await this.trigger('selection');
  }

  public async orderConfirmation(): Promise<void> {
    await this.trigger('success');
  }

  public async errorAlert(): Promise<void> {
    await this.trigger('error');
  }

  public async warningAlert(): Promise<void> {
    await this.trigger('warning');
  }

  public async cashbackApproval(): Promise<void> {
    await this.trigger('success');
  }

  public async cashbackRejection(): Promise<void> {
    await this.trigger('error');
  }

  public async dataSync(): Promise<void> {
    await this.trigger('soft');
  }

  public async menuOpen(): Promise<void> {
    await this.trigger('light');
  }

  public async formSubmission(): Promise<void> {
    await this.trigger('medium');
  }

  public async modalOpen(): Promise<void> {
    await this.trigger('light');
  }

  public async modalClose(): Promise<void> {
    await this.trigger('light');
  }

  // Pattern-based haptics for complex interactions
  public async successPattern(): Promise<void> {
    await this.trigger('light');
    setTimeout(async () => {
      await this.trigger('medium');
    }, 100);
    setTimeout(async () => {
      await this.trigger('success');
    }, 200);
  }

  public async errorPattern(): Promise<void> {
    await this.trigger('heavy');
    setTimeout(async () => {
      await this.trigger('error');
    }, 150);
  }

  public async loadingPattern(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await this.trigger('light');
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  public async swipeCompletePattern(): Promise<void> {
    await this.trigger('medium');
    setTimeout(async () => {
      await this.trigger('selection');
    }, 100);
  }
}

// Export singleton instance
export const hapticFeedback = HapticFeedbackService.getInstance();

// Hook for using haptic feedback in React components

export interface UseHapticFeedbackOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export const useHapticFeedback = (options: UseHapticFeedbackOptions = {}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(options.enabled ?? true);

  useEffect(() => {
    setIsSupported(hapticFeedback.isHapticEnabled());
    hapticFeedback.setEnabled(isEnabled);
  }, [isEnabled]);

  const trigger = useCallback(async (
    type: HapticFeedbackType, 
    hapticOptions?: HapticOptions
  ) => {
    try {
      await hapticFeedback.trigger(type, { 
        ...hapticOptions, 
        enabled: isEnabled 
      });
    } catch (error) {
      if (options.onError) {
        options.onError(error as Error);
      }
    }
  }, [isEnabled, options.onError]);

  // Convenience methods
  const buttonPress = useCallback(() => trigger('light'), [trigger]);
  const cardPress = useCallback(() => trigger('medium'), [trigger]);
  const longPress = useCallback(() => trigger('heavy'), [trigger]);
  const success = useCallback(() => trigger('success'), [trigger]);
  const error = useCallback(() => trigger('error'), [trigger]);
  const warning = useCallback(() => trigger('warning'), [trigger]);
  const selection = useCallback(() => trigger('selection'), [trigger]);

  return {
    isSupported,
    isEnabled,
    setEnabled: setIsEnabled,
    trigger,
    buttonPress,
    cardPress,
    longPress,
    success,
    error,
    warning,
    selection,
    // Convenience patterns
    successPattern: useCallback(() => hapticFeedback.successPattern(), []),
    errorPattern: useCallback(() => hapticFeedback.errorPattern(), []),
    loadingPattern: useCallback(() => hapticFeedback.loadingPattern(), []),
  };
};

// Higher-order component for adding haptic feedback to any component
export interface WithHapticFeedbackProps {
  onPress?: () => void;
  onLongPress?: () => void;
  hapticType?: HapticFeedbackType;
  hapticOnPress?: boolean;
  hapticOnLongPress?: boolean;
  hapticEnabled?: boolean;
}

export function withHapticFeedback<P extends object>(
  Component: React.ComponentType<P>
) {
  return React.forwardRef<any, P & WithHapticFeedbackProps>((props, ref) => {
    const {
      onPress,
      onLongPress,
      hapticType = 'medium',
      hapticOnPress = true,
      hapticOnLongPress = true,
      hapticEnabled = true,
      ...restProps
    } = props;

    const handlePress = useCallback(async () => {
      if (hapticOnPress && hapticEnabled) {
        await hapticFeedback.trigger(hapticType);
      }
      if (onPress) {
        onPress();
      }
    }, [onPress, hapticType, hapticOnPress, hapticEnabled]);

    const handleLongPress = useCallback(async () => {
      if (hapticOnLongPress && hapticEnabled) {
        await hapticFeedback.trigger('heavy');
      }
      if (onLongPress) {
        onLongPress();
      }
    }, [onLongPress, hapticOnLongPress, hapticEnabled]);

    return (
      <Component
        ref={ref}
        {...(restProps as P)}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
    );
  });
}

// Utility functions for specific use cases
export const HapticUtils = {
  // For form interactions
  async fieldFocus(): Promise<void> {
    await hapticFeedback.trigger('light');
  },

  async fieldBlur(): Promise<void> {
    await hapticFeedback.trigger('soft');
  },

  async fieldError(): Promise<void> {
    await hapticFeedback.trigger('error');
  },

  async fieldSuccess(): Promise<void> {
    await hapticFeedback.trigger('success');
  },

  // For navigation
  async tabChange(): Promise<void> {
    await hapticFeedback.trigger('selection');
  },

  async pageTransition(): Promise<void> {
    await hapticFeedback.trigger('light');
  },

  async backNavigation(): Promise<void> {
    await hapticFeedback.trigger('light');
  },

  // For data operations
  async dataRefresh(): Promise<void> {
    await hapticFeedback.trigger('soft');
  },

  async dataLoad(): Promise<void> {
    await hapticFeedback.trigger('light');
  },

  async dataError(): Promise<void> {
    await hapticFeedback.trigger('error');
  },

  // For business-specific actions
  async orderStatusUpdate(): Promise<void> {
    await hapticFeedback.trigger('medium');
  },

  async cashbackProcessed(): Promise<void> {
    await hapticFeedback.successPattern();
  },

  async productAdded(): Promise<void> {
    await hapticFeedback.trigger('success');
  },

  async bulkActionComplete(): Promise<void> {
    await hapticFeedback.successPattern();
  },

  async notificationReceived(): Promise<void> {
    await hapticFeedback.trigger('medium');
  },
};