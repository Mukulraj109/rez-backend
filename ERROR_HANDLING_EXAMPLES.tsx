/**
 * Error Handling - Implementation Examples
 * Complete working examples for error handling patterns in the merchant app
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  ErrorBoundary,
  withErrorBoundary,
  useErrorBoundaryContext,
  ErrorFallback,
} from '@/components/common';
import {
  handleApiError,
  handleValidationError,
  handleAuthError,
  withRetry,
  safeAsync,
  logError,
  parseError,
} from '@/utils/errorHandler';
import { ErrorType, getErrorMessage } from '@/utils/errorMessages';

// ============================================================================
// EXAMPLE 1: API Call with Error Handling and Retry
// ============================================================================

interface ApiExampleState {
  data: any;
  loading: boolean;
  error: any;
}

export function ApiErrorExample() {
  const [state, setState] = useState<ApiExampleState>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchUserWithRetry = useCallback(async () => {
    setState({ data: null, loading: true, error: null });

    try {
      // This will retry up to 3 times with exponential backoff
      const response = await withRetry(
        async () => {
          const res = await fetch('/api/users/123');
          if (!res.ok) throw res;
          return res.json();
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          backoffMultiplier: 2,
          onRetry: (attempt, error) => {
            console.log(`Retry attempt ${attempt} for API call`, error.message);
          },
        }
      );

      setState({ data: response, loading: false, error: null });
    } catch (error) {
      const { error: appError, message } = handleApiError(error, 'fetchUserWithRetry');
      setState({ data: null, loading: false, error: message });
      logError(appError, 'fetchUserWithRetry', { userId: 123 });
    }
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>API Call with Retry</Text>

      {state.loading && <Text style={styles.info}>Loading...</Text>}

      {state.error && (
        <ErrorFallback
          title={state.error.title}
          message={state.error.message}
          onRetry={fetchUserWithRetry}
          recoverable={state.error.recoverable}
        />
      )}

      {state.data && (
        <Text style={styles.success}>
          Success: {JSON.stringify(state.data, null, 2)}
        </Text>
      )}

      <TouchableOpacity style={styles.button} onPress={fetchUserWithRetry}>
        <Text style={styles.buttonText}>Fetch User (with Retry)</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// EXAMPLE 2: Safe Async Wrapper
// ============================================================================

export function SafeAsyncExample() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const loadDataSafely = useCallback(async () => {
    setResult(null);
    setError(null);

    const { data, error: err } = await safeAsync(
      async () => {
        // Simulate API call
        const response = await fetch('/api/data');
        if (!response.ok) throw response;
        return response.json();
      },
      'loadDataSafely'
    );

    if (err) {
      const message = getErrorMessage(err);
      setError(message);
    } else {
      setResult(data);
    }
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Safe Async Operation</Text>

      {error && (
        <ErrorFallback
          title={error.title}
          message={error.message}
          onRetry={loadDataSafely}
          recoverable={error.recoverable}
        />
      )}

      {result && <Text style={styles.success}>Data: {JSON.stringify(result)}</Text>}

      <TouchableOpacity style={styles.button} onPress={loadDataSafely}>
        <Text style={styles.buttonText}>Load Data (Safe)</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// EXAMPLE 3: Form Validation with Error Handling
// ============================================================================

interface FormData {
  email: string;
  password: string;
  phone: string;
}

export function FormValidationExample() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateEmail = (email: string): boolean => {
    try {
      if (!email) throw new Error('Email is required');
      if (!email.includes('@')) throw new Error('Invalid email format');
      return true;
    } catch (error) {
      const { message } = handleValidationError(error, 'email');
      setErrors((prev) => ({ ...prev, email: message.message }));
      return false;
    }
  };

  const validatePassword = (password: string): boolean => {
    try {
      if (!password) throw new Error('Password is required');
      if (password.length < 8) throw new Error('Password must be at least 8 characters');
      return true;
    } catch (error) {
      const { message } = handleValidationError(error, 'password');
      setErrors((prev) => ({ ...prev, password: message.message }));
      return false;
    }
  };

  const validatePhone = (phone: string): boolean => {
    try {
      if (!phone) throw new Error('Phone is required');
      if (!/^\d{10}$/.test(phone)) throw new Error('Phone must be 10 digits');
      return true;
    } catch (error) {
      const { message } = handleValidationError(error, 'phone');
      setErrors((prev) => ({ ...prev, phone: message.message }));
      return false;
    }
  };

  const handleSubmit = useCallback(() => {
    setErrors({});

    let isValid = true;
    isValid = validateEmail(formData.email) && isValid;
    isValid = validatePassword(formData.password) && isValid;
    isValid = validatePhone(formData.phone) && isValid;

    if (isValid) {
      Alert.alert('Success', 'Form submitted successfully!');
    }
  }, [formData]);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Form Validation</Text>

      <View style={styles.input}>
        <Text style={styles.inputLabel}>Email</Text>
        {/* TextInput would go here */}
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.input}>
        <Text style={styles.inputLabel}>Password</Text>
        {/* TextInput would go here */}
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>

      <View style={styles.input}>
        <Text style={styles.inputLabel}>Phone</Text>
        {/* TextInput would go here */}
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Submit Form</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// EXAMPLE 4: Using Error Boundary Context
// ============================================================================

function ErrorContextContent() {
  const { error, setError, resetError } = useErrorBoundaryContext();

  const triggerError = useCallback(() => {
    setError(new Error('Intentional error from context'));
  }, [setError]);

  if (error) {
    return (
      <ErrorFallback
        title="Error from Context"
        message={error.message}
        onRetry={resetError}
        recoverable={true}
      />
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Error Boundary Context</Text>
      <Text style={styles.info}>
        This component uses the error boundary context to trigger and handle errors.
      </Text>
      <TouchableOpacity style={styles.button} onPress={triggerError}>
        <Text style={styles.buttonText}>Trigger Error via Context</Text>
      </TouchableOpacity>
    </View>
  );
}

export const ErrorContextExample = () => (
  <ErrorBoundary name="ErrorContextExample">
    <ErrorContextContent />
  </ErrorBoundary>
);

// ============================================================================
// EXAMPLE 5: Component with Error Boundary HOC
// ============================================================================

function DataFetcher() {
  const [data, setData] = useState(null);
  const [error, setError] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw response;
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      const { message } = handleApiError(err, 'DataFetcher');
      setError(message);
      setData(null);
    }
  }, []);

  if (error) {
    return (
      <ErrorFallback
        title={error.title}
        message={error.message}
        onRetry={fetchData}
        recoverable={error.recoverable}
      />
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Data Fetcher with HOC</Text>
      {data ? (
        <Text style={styles.success}>{JSON.stringify(data)}</Text>
      ) : (
        <TouchableOpacity style={styles.button} onPress={fetchData}>
          <Text style={styles.buttonText}>Fetch Data</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Wrap with error boundary HOC
export const SafeDataFetcher = withErrorBoundary(DataFetcher, {
  name: 'DataFetcher',
  onError: (error) => {
    console.error('DataFetcher error:', error.message);
  },
});

// ============================================================================
// EXAMPLE 6: Authentication Error Handling
// ============================================================================

export function AuthErrorExample() {
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<any>(null);

  const handleLogin = useCallback(async () => {
    try {
      setError(null);

      // Simulate auth API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'password' }),
      });

      if (response.status === 401) {
        throw new Error('Invalid credentials');
      }

      if (!response.ok) throw response;

      const result = await response.json();
      setAuthenticated(true);
    } catch (err) {
      const { message } = handleAuthError(err);
      setError(message);
    }
  }, []);

  if (authenticated) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>Authenticated</Text>
        <Text style={styles.success}>You are logged in!</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            setAuthenticated(false);
            setError(null);
          }}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <ErrorFallback
        title={error.title}
        message={error.message}
        onRetry={handleLogin}
        recoverable={error.recoverable}
      />
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Authentication Error Handling</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  section: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  success: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    marginVertical: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
});

// ============================================================================
// COMPLETE APP EXAMPLE WITH ALL PATTERNS
// ============================================================================

export function ErrorHandlingExampleApp() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
          Error Handling Examples
        </Text>

        <ApiErrorExample />
        <SafeAsyncExample />
        <FormValidationExample />
        <ErrorContextExample />
        <SafeDataFetcher />
        <AuthErrorExample />

        <View style={{ height: 20 }} />
      </View>
    </ScrollView>
  );
}

export default ErrorHandlingExampleApp;
