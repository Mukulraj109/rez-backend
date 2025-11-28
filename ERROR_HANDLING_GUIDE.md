# Error Handling System - Merchant App

Comprehensive error handling and error boundary implementation for the Merchant App with React Native and Expo.

## Overview

The error handling system provides:
- **Global Error Boundaries** - Catch React component errors
- **Centralized Error Logging** - Consistent error reporting
- **User-Friendly Messages** - Different error types with appropriate UI
- **Retry Mechanisms** - Automatic retry for recoverable errors
- **Error Tracking** - Development and production error monitoring

## Architecture

### Components

#### 1. **ErrorBoundary.tsx**
Class-based error boundary component that catches React errors.

**Features:**
- Catches render errors in child components
- Provides retry mechanism (max 3 attempts)
- Logs errors with context
- Custom fallback UI support
- Error boundary context provider

**Usage:**
```tsx
import { ErrorBoundary, ErrorBoundaryProvider } from '@/components/common';

// Wrap entire app (already done in app/_layout.tsx)
<ErrorBoundaryProvider>
  <App />
</ErrorBoundaryProvider>

// Wrap specific components
<ErrorBoundary name="MyComponent">
  <MyComponent />
</ErrorBoundary>

// With custom error handler
<ErrorBoundary
  onError={(error, errorInfo) => {
    console.error('Custom error handler:', error);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

#### 2. **ErrorFallback.tsx**
UI component for displaying error messages with recovery options.

**Features:**
- Customizable title and message
- Action buttons (Retry, Go Back)
- Error details toggle (dev mode)
- Theme-aware styling
- Accessibility support

**Usage:**
```tsx
import { ErrorFallback } from '@/components/common';

<ErrorFallback
  title="Connection Error"
  message="Unable to connect to server"
  action="Retry"
  onRetry={handleRetry}
  onGoBack={handleGoBack}
  details={errorStack}
  showDetails={__DEV__}
  recoverable={true}
/>
```

### Utilities

#### 3. **errorHandler.ts**
Core error handling utilities and logging functions.

**Key Functions:**

```tsx
// Create standardized app errors
createAppError(message, type, originalError?, status?)

// Parse any error type to AppError
parseError(error)

// Log errors with context
logError(error, context?, metadata?)

// Handle API errors
handleApiError(error, context?)

// Handle React component errors
handleComponentError(error, errorInfo, componentName?)

// Handle validation errors
handleValidationError(error, fieldName?)

// Handle authentication errors
handleAuthError(error)

// Retry operations with backoff
withRetry(fn, options)

// Safe async wrapper
safeAsync(fn, context?)

// Safe sync wrapper
safeSync(fn, context?)

// Execute operations sequentially
executeSequentially(operations, context?)

// Get error severity
getErrorSeverity(error) // Returns: 'low' | 'medium' | 'high'
```

#### 4. **errorMessages.ts**
User-friendly error messages and message configuration.

**Error Types:**
- `NETWORK` - Connection failures
- `AUTHENTICATION` - Auth token issues
- `AUTHORIZATION` - Permission denied
- `VALIDATION` - Invalid input data
- `SERVER` - Server-side errors (5xx)
- `NOT_FOUND` - 404 errors
- `TIMEOUT` - Request timeouts
- `UNKNOWN` - Unclassified errors

**Usage:**
```tsx
import { ErrorType, getErrorMessage, formatErrorDisplay } from '@/utils/errorMessages';

// Get error message by type
const message = getErrorMessage(error, ErrorType.NETWORK);
// Returns: { title: string, message: string, action: string, recoverable: boolean }

// Get error message by HTTP status
const message = getErrorMessageByStatus(404);

// Format error for display
const display = formatErrorDisplay(error);

// Check if recoverable
const recoverable = isErrorRecoverable(error);
```

## Implementation Examples

### Example 1: API Call with Error Handling

```tsx
import { handleApiError, withRetry } from '@/utils/errorHandler';

async function fetchUserData(userId: string) {
  try {
    const result = await withRetry(
      async () => {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw response;
        }
        return response.json();
      },
      {
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2,
        onRetry: (attempt) => {
          console.log(`Retry attempt ${attempt}`);
        },
      }
    );
    return result;
  } catch (error) {
    const { error: appError, message } = handleApiError(error, 'fetchUserData');
    // Display message to user
    showErrorUI(message);
    throw appError;
  }
}
```

### Example 2: Form Validation with Error Handling

```tsx
import { handleValidationError } from '@/utils/errorHandler';

function validateEmail(email: string) {
  try {
    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }
  } catch (error) {
    const { error: appError, message } = handleValidationError(error, 'email');
    showFieldError(message);
    return false;
  }
  return true;
}
```

### Example 3: Safe Async Operations

```tsx
import { safeAsync } from '@/utils/errorHandler';

function MyComponent() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data: result, error: err } = await safeAsync(
      () => fetchData(),
      'loadData'
    );

    if (err) {
      setError(err);
    } else {
      setData(result);
    }
    setLoading(false);
  };

  return (
    <View>
      {error && <ErrorFallback error={error} onRetry={loadData} />}
      {loading && <LoadingSpinner />}
      {data && <DataDisplay data={data} />}
      <Button onPress={loadData} title="Load Data" />
    </View>
  );
}
```

### Example 4: Component-Level Error Boundary

```tsx
import { ErrorBoundary, withErrorBoundary } from '@/components/common';

// Option 1: Direct wrapper
function Dashboard() {
  return (
    <ErrorBoundary name="Dashboard">
      <DashboardContent />
    </ErrorBoundary>
  );
}

// Option 2: HOC wrapper
const SafeDashboard = withErrorBoundary(Dashboard, {
  name: 'Dashboard',
  onError: (error, errorInfo) => {
    analytics.logError(error, errorInfo);
  },
});
```

### Example 5: Using Error Boundary Context

```tsx
import { useErrorBoundaryContext } from '@/components/common';

function MyComponent() {
  const { error, setError, resetError } = useErrorBoundaryContext();

  const handleAsyncError = async () => {
    try {
      const result = await fetchData();
    } catch (error) {
      setError(error as Error);
    }
  };

  if (error) {
    return <ErrorFallback error={error} onRetry={resetError} />;
  }

  return <View>{/* component content */}</View>;
}
```

## Error Types and Status Codes

### HTTP Status Codes Mapping

| Status | Type | Message |
|--------|------|---------|
| 400 | VALIDATION | Invalid input data |
| 401 | AUTHENTICATION | Session expired, login required |
| 403 | AUTHORIZATION | Access denied |
| 404 | NOT_FOUND | Resource not found |
| 5xx | SERVER | Server encountered an error |

### Network Errors

| Error | Type | Recoverable |
|-------|------|-------------|
| Connection refused | NETWORK | Yes |
| Network timeout | TIMEOUT | Yes |
| DNS lookup failed | NETWORK | Yes |
| No internet | NETWORK | Yes |

## Development vs Production

### Development Mode (__DEV__)

- Full error stack traces displayed
- Detailed error information available
- "Show Details" button visible in error UI
- Console logging enabled

### Production Mode

- User-friendly error messages only
- Stack traces not shown to users
- Errors logged to monitoring service (future: Sentry)
- Technical details hidden

## Testing Error Handling

### Force an Error (Development)

```tsx
function TestErrorBoundary() {
  const [shouldError, setShouldError] = React.useState(false);

  if (shouldError) {
    throw new Error('Test error from component');
  }

  return (
    <Button
      onPress={() => setShouldError(true)}
      title="Trigger Error"
    />
  );
}
```

### Test API Error Handling

```tsx
import { handleApiError } from '@/utils/errorHandler';

async function testApiError() {
  try {
    throw new Response('Not Found', { status: 404 });
  } catch (error) {
    const { error: appError, message } = handleApiError(error);
    console.log('Error message:', message);
    // Output: { title: 'Not Found', message: 'The requested resource was not found.' }
  }
}
```

### Test Retry Mechanism

```tsx
import { withRetry } from '@/utils/errorHandler';

let attempts = 0;
await withRetry(
  async () => {
    attempts++;
    if (attempts < 3) {
      throw new Error('Temporary error');
    }
    return 'Success!';
  },
  {
    maxAttempts: 3,
    delayMs: 100,
    onRetry: (attempt) => console.log(`Attempt ${attempt}`),
  }
);
// Logs: Attempt 1, Attempt 2
// Returns: 'Success!'
```

## Integration with Backend

### Handle Backend Errors

```tsx
async function createOrder(orderData: OrderData) {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw response;
    }

    return await response.json();
  } catch (error) {
    const { error: appError, message } = handleApiError(error, 'createOrder');

    // Log to backend monitoring
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry or similar
      // Sentry.captureException(appError);
    }

    return { error: appError, userMessage: message };
  }
}
```

## File Structure

```
merchant-app/
├── components/
│   └── common/
│       ├── ErrorBoundary.tsx      # Error boundary components & hooks
│       ├── ErrorFallback.tsx       # Error UI component
│       └── index.ts               # Exports
├── utils/
│   ├── errorHandler.ts            # Error handling utilities
│   └── errorMessages.ts           # User-friendly messages
├── app/
│   └── _layout.tsx                # Wrapped with ErrorBoundaryProvider
└── ERROR_HANDLING_GUIDE.md         # This file
```

## Best Practices

1. **Always use try-catch for async operations**
   ```tsx
   try {
     await asyncOp();
   } catch (error) {
     const { error: appError, message } = handleApiError(error, 'context');
   }
   ```

2. **Provide context when logging errors**
   ```tsx
   logError(error, 'Component.functionName', { userId: 123 });
   ```

3. **Use appropriate error types**
   ```tsx
   handleAuthError(error);        // For auth failures
   handleValidationError(error);  // For validation failures
   handleApiError(error);         // For API failures
   ```

4. **Implement component-level error boundaries**
   - Wrap feature sections with ErrorBoundary
   - Prevents entire app from crashing
   - Allows graceful degradation

5. **Show user-friendly messages**
   - Use messages from errorMessages.ts
   - Don't expose technical details
   - Provide recovery actions when possible

6. **Test error scenarios**
   - Test network errors
   - Test validation failures
   - Test server errors
   - Test retry mechanisms

## Future Enhancements

- [ ] Integrate with Sentry for error tracking
- [ ] Analytics tracking for error types
- [ ] Error rate monitoring and alerts
- [ ] Custom error reporting form
- [ ] Error recovery suggestions
- [ ] Offline error queue

## Troubleshooting

### Error Boundary Not Catching Errors

- Event handlers: Wrap in try-catch manually
- Async code: Use safeAsync or error context
- Timers: Use try-catch in callbacks

### Infinite Error Loop

- Check max retry attempts (default: 3)
- Verify error is actually recoverable
- Check for render-time errors vs async errors

### Error Message Not Appearing

- Verify ErrorBoundaryProvider is in app._layout.tsx
- Check if error is being thrown from event handler
- Ensure error is thrown during render phase

## Support & Questions

For issues or questions about error handling:
1. Check this guide first
2. Review example implementations
3. Check console logs in development mode
4. Review error stack traces
