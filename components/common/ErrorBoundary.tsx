/**
 * Global Error Boundary Component
 * Catches React errors and displays fallback UI
 * Provides retry mechanism and error logging
 */

import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { ErrorFallback } from './ErrorFallback';
import {
  handleComponentError,
  parseError,
  logError,
  getErrorSeverity,
} from '@/utils/errorHandler';
import { getErrorMessage, ErrorType } from '@/utils/errorMessages';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, retry: () => void) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

/**
 * Class-based Error Boundary component
 * Catches JavaScript errors in child components
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private colorScheme: string = 'light';
  private readonly maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, name } = this.props;
    const { errorCount } = this.state;

    // Log the error
    handleComponentError(error, errorInfo, name || 'Unknown Component');

    // Call custom error handler if provided
    onError?.(error, errorInfo);

    // Update state with error information
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Check if we've exceeded max retries
    if (errorCount >= this.maxRetries) {
      logError(
        parseError(error) as any,
        `ErrorBoundary: Max retries exceeded for ${name || 'Unknown Component'}`
      );
    }
  }

  handleRetry = () => {
    const { errorCount } = this.state;

    // Check if we should reset error state
    if (errorCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    } else {
      // If max retries exceeded, show a non-recoverable error
      logError(
        parseError(new Error('Max retries exceeded')) as any,
        `ErrorBoundary: Recovery failed after ${this.maxRetries} attempts`
      );
    }
  };

  render() {
    const { hasError, error, errorCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      const appError = parseError(error);
      const errorMessage = getErrorMessage(error, appError.type);
      const severity = getErrorSeverity(appError);
      const isRecoverable = errorCount < this.maxRetries;

      // Use custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.handleRetry);
        }
        return fallback as React.ReactElement;
      }

      // Use default error fallback
      return (
        <SafeAreaView style={{ flex: 1 }}>
          <ErrorFallback
            title={errorMessage.title}
            message={errorMessage.message}
            action={errorMessage.action}
            onRetry={isRecoverable ? this.handleRetry : undefined}
            details={__DEV__ ? error.toString() : undefined}
            showDetails={__DEV__}
            recoverable={isRecoverable}
          />
        </SafeAreaView>
      );
    }

    return children;
  }
}

/**
 * Hook-based Error Boundary alternative using state
 * More lightweight than the class component
 */
interface UseErrorBoundaryReturn {
  error: Error | null;
  hasError: boolean;
  resetError: () => void;
  setError: (error: Error) => void;
}

export const useErrorBoundary = (): UseErrorBoundaryReturn => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((err: Error) => {
    logError(parseError(err) as any, 'useErrorBoundary');
    setError(err);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    hasError: !!error,
    resetError,
    setError: handleError,
  };
};

/**
 * Error Boundary Provider with context
 * Allows child components to trigger error boundary state
 */
interface ErrorBoundaryContextType {
  error: Error | null;
  setError: (error: Error) => void;
  resetError: () => void;
}

export const ErrorBoundaryContext = React.createContext<
  ErrorBoundaryContextType | undefined
>(undefined);

interface ErrorBoundaryProviderProps {
  children: React.ReactNode;
}

export const ErrorBoundaryProvider = ({ children }: ErrorBoundaryProviderProps) => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleSetError = (err: Error) => {
    logError(parseError(err) as any, 'ErrorBoundaryProvider');
    setError(err);
  };

  const handleResetError = () => {
    setError(null);
  };

  const value: ErrorBoundaryContextType = {
    error,
    setError: handleSetError,
    resetError: handleResetError,
  };

  return (
    <ErrorBoundary
      name="ErrorBoundaryProvider"
      onError={handleSetError}
    >
      <ErrorBoundaryContext.Provider value={value}>
        {children}
      </ErrorBoundaryContext.Provider>
    </ErrorBoundary>
  );
};

/**
 * Hook to access error boundary context
 */
export const useErrorBoundaryContext = (): ErrorBoundaryContextType => {
  const context = React.useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error(
      'useErrorBoundaryContext must be used within ErrorBoundaryProvider'
    );
  }
  return context;
};

/**
 * Wrapper component for async errors
 * Catches errors from async operations in child components
 */
interface AsyncErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

export const AsyncErrorBoundary = ({
  children,
  onError,
}: AsyncErrorBoundaryProps) => {
  const { setError } = useErrorBoundaryContext();

  const handleAsyncError = React.useCallback(
    (error: Error) => {
      logError(parseError(error) as any, 'AsyncErrorBoundary');
      onError?.(error);
      setError(error);
    },
    [setError, onError]
  );

  // Setup global error handlers for async operations
  React.useEffect(() => {
    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      handleAsyncError(event.reason);
    };

    const handleError = (event: ErrorEvent) => {
      handleAsyncError(event.error);
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handlePromiseRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
      window.removeEventListener('error', handleError);
    };
  }, [handleAsyncError]);

  return <>{children}</>;
};

/**
 * Higher-order component to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ReactNode | ((error: Error, retry: () => void) => React.ReactNode);
    name?: string;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary
        fallback={options?.fallback}
        name={options?.name || Component.displayName || Component.name}
        onError={options?.onError}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `WithErrorBoundary(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
}
