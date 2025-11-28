# Error Handling - Quick Reference

## Imports

```tsx
// Error components
import { ErrorBoundary, withErrorBoundary, useErrorBoundaryContext } from '@/components/common';
import { ErrorFallback } from '@/components/common';

// Error utilities
import {
  handleApiError,
  handleValidationError,
  handleAuthError,
  withRetry,
  safeAsync,
  safeSync,
  logError,
} from '@/utils/errorHandler';

// Error messages
import {
  ErrorType,
  getErrorMessage,
  formatErrorDisplay,
  isErrorRecoverable
} from '@/utils/errorMessages';
```

## Common Patterns

### 1. API Call with Retry

```tsx
const data = await withRetry(
  () => fetch('/api/data').then(r => r.json()),
  { maxAttempts: 3, delayMs: 1000 }
);
```

### 2. Safe Async Operation

```tsx
const { data, error } = await safeAsync(
  () => fetchUserData(),
  'fetchUserData'
);
```

### 3. Wrap Component with Error Boundary

```tsx
<ErrorBoundary name="MyComponent">
  <MyComponent />
</ErrorBoundary>
```

### 4. Handle API Error

```tsx
try {
  const response = await fetch('/api/endpoint');
  const data = await response.json();
} catch (error) {
  const { error: appError, message } = handleApiError(error, 'fetchData');
  showError(message);
}
```

### 5. Handle Validation Error

```tsx
try {
  validateEmail(email);
} catch (error) {
  const { error: appError, message } = handleValidationError(error, 'email');
  setFieldError(message);
}
```

### 6. Component with Error Handling

```tsx
function MyComponent() {
  const { setError } = useErrorBoundaryContext();
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchData();
      setData(result);
    } catch (error) {
      setError(error as Error);
    }
    setLoading(false);
  };

  return <Button onPress={loadData} />;
}
```

## Error Types

| Type | Use Case | Recoverable |
|------|----------|-------------|
| NETWORK | Connection issues | Yes |
| AUTHENTICATION | Login required | Yes |
| AUTHORIZATION | Access denied | No |
| VALIDATION | Bad input | Yes |
| SERVER | 5xx errors | Yes |
| NOT_FOUND | 404 errors | No |
| TIMEOUT | Slow requests | Yes |
| UNKNOWN | Other errors | Yes |

## Error Messages

```tsx
// Get message for error type
const msg = getErrorMessage(error, ErrorType.NETWORK);

// Get message by HTTP status
const msg = getErrorMessageByStatus(404);

// Format error for display
const text = formatErrorDisplay(error);

// Check if recoverable
if (isErrorRecoverable(error)) {
  // Show retry button
}
```

## Log Errors

```tsx
// Simple log
logError(error);

// With context
logError(error, 'fetchUserData');

// With metadata
logError(error, 'fetchUserData', { userId: 123 });
```

## Retry Configuration

```tsx
{
  maxAttempts: 3,           // Number of retry attempts
  delayMs: 1000,            // Initial delay in ms
  backoffMultiplier: 2,     // Exponential backoff multiplier
  onRetry: (attempt) => {}  // Called before each retry
}
```

## Component Props

### ErrorBoundary
- `children: React.ReactNode` - Child components
- `fallback?: React.ReactNode` - Custom error UI
- `onError?: (error, errorInfo) => void` - Error callback
- `name?: string` - Component name for logging

### ErrorFallback
- `title: string` - Error title
- `message: string` - Error message
- `action?: string` - Retry button text
- `onRetry?: () => void` - Retry handler
- `onGoBack?: () => void` - Go back handler
- `details?: string` - Error details
- `showDetails?: boolean` - Show details initially
- `recoverable?: boolean` - Is error recoverable

## Status Code Errors

```tsx
// 400 - Validation error
handleValidationError(error);

// 401 - Auth error
handleAuthError(error);

// 403 - Authorization error
// Automatically mapped to AUTHORIZATION type

// 404 - Not found
// Automatically mapped to NOT_FOUND type

// 5xx - Server error
// Automatically mapped to SERVER type
```

## Testing

```tsx
// Force error
throw new Error('Test error');

// Test retry
await withRetry(
  async () => {
    if (attempts < 2) throw new Error('Fail');
    return 'Success';
  },
  { maxAttempts: 3 }
);

// Test API error
throw new Response('Error', { status: 500 });
```

## Development Tips

- Use `__DEV__` to show extra details in development
- Check console logs for error context
- Use "Show Details" button to see stack traces
- Test error scenarios in development
- Use error boundary context for complex flows

## Gotchas

- Event handlers don't trigger error boundary (use try-catch)
- Async code outside render needs error context or try-catch
- Max retries default is 3 (change if needed)
- Non-recoverable errors don't show retry button
