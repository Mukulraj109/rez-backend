# DEVELOPER HANDBOOK
## Rez Merchant App - Developer Onboarding & Reference

**Version:** 1.0.0
**Last Updated:** 2025-11-17
**For:** New developers joining the project

---

## QUICK START (5 MINUTES)

### 1. Clone and Install
```bash
git clone https://github.com/rez-platform/merchant-app.git
cd merchant-app
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your local API URL
```

### 3. Start Development Server
```bash
npm start
# Press 'i' for iOS, 'a' for Android, 'w' for Web
```

**That's it! You're ready to develop.**

---

## PROJECT STRUCTURE

```
merchant-app/
├── app/                          # Screens (Expo Router - file-based routing)
│   ├── (auth)/                   # Auth routes (login, register)
│   ├── (dashboard)/              # Dashboard routes
│   ├── (products)/               # Product management
│   ├── onboarding/               # Onboarding flow (8 screens)
│   ├── team/                     # Team management (4 screens)
│   ├── analytics/                # Analytics (6 screens)
│   ├── documents/                # Document generation (4 screens)
│   ├── _layout.tsx               # Root layout with auth check
│   └── index.tsx                 # App entry point
│
├── components/                    # Reusable components (89+)
│   ├── common/                   # Common UI (FormInput, Button, etc.)
│   ├── onboarding/               # Onboarding-specific components
│   ├── team/                     # Team management components
│   ├── products/                 # Product & variant components
│   ├── analytics/                # Chart & metric components
│   └── documents/                # Document generation components
│
├── services/                      # API services & business logic
│   └── api/                      # API client & endpoint modules
│       ├── client.ts             # Axios client with interceptors
│       ├── auth.ts               # Authentication endpoints
│       ├── products.ts           # Product endpoints
│       ├── team.ts               # Team endpoints
│       ├── analytics.ts          # Analytics endpoints
│       └── ...
│
├── contexts/                      # React contexts for global state
│   ├── AuthContext.tsx           # Authentication state
│   ├── OnboardingContext.tsx     # Onboarding flow state
│   ├── TeamContext.tsx           # Team management state
│   └── ...
│
├── types/                         # TypeScript type definitions
│   ├── auth.ts                   # Auth types
│   ├── products.ts               # Product types
│   ├── variants.ts               # Variant types
│   ├── team.ts                   # Team & RBAC types
│   └── ...
│
├── utils/                         # Utility functions & helpers
│   ├── validation/               # Zod validation schemas
│   ├── helpers/                  # Helper functions
│   ├── formatters/               # Format utilities (date, currency)
│   └── ...
│
├── constants/                     # App constants
│   ├── colors.ts                 # Color palette
│   ├── permissions.ts            # Permission definitions
│   ├── variantConstants.ts       # Variant attribute options
│   └── ...
│
├── hooks/                         # Custom React hooks
│   ├── useAuth.ts                # Authentication hook
│   ├── usePermission.ts          # Permission checking
│   └── ...
│
├── config/                        # Configuration files
│   └── reactQuery.ts             # React Query config
│
└── assets/                        # Static assets
    ├── images/                   # Images, icons
    └── fonts/                    # Custom fonts
```

---

## KEY CONCEPTS

### 1. Routing (Expo Router)

**File-based routing:**
- `app/index.tsx` → `/`
- `app/products/index.tsx` → `/products`
- `app/products/[id].tsx` → `/products/:id`
- `app/(auth)/login.tsx` → `/login` (groups with parentheses)

**Navigation:**
```typescript
import { router } from 'expo-router';

// Navigate to screen
router.push('/products/123');

// Go back
router.back();

// Replace (no back)
router.replace('/dashboard');
```

### 2. State Management

**Server State (React Query):**
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { productsApi } from '@/services/api/products';

// Fetch data
const { data, isLoading, error } = useQuery({
  queryKey: ['products'],
  queryFn: productsApi.getProducts,
});

// Mutate data
const { mutate } = useMutation({
  mutationFn: productsApi.createProduct,
  onSuccess: () => {
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['products'] });
  },
});
```

**Local State (Context API):**
```typescript
import { useAuth } from '@/contexts/AuthContext';

const { user, login, logout } = useAuth();
```

### 3. Form Handling

**React Hook Form + Zod:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema } from '@/utils/validation/products';

const { control, handleSubmit } = useForm({
  resolver: zodResolver(productSchema),
});

const onSubmit = (data) => {
  // Data is validated automatically
  createProduct(data);
};
```

### 4. Permissions (RBAC)

**Check permissions:**
```typescript
import { usePermission } from '@/hooks/usePermission';

const canEdit = usePermission('products:edit');

if (!canEdit) return <NoPermission />;
```

**Protect screens:**
```typescript
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

export default function ProductScreen() {
  return (
    <ProtectedRoute permission="products:view">
      <ProductList />
    </ProtectedRoute>
  );
}
```

### 5. API Calls

**All API calls use the centralized client:**
```typescript
// services/api/products.ts
import { apiClient } from './client';

export const productsApi = {
  getProducts: async (filters?) => {
    const { data } = await apiClient.get('/merchant/products', {
      params: filters,
    });
    return data;
  },

  createProduct: async (product) => {
    const { data } = await apiClient.post('/merchant/products', product);
    return data;
  },
};
```

**API client automatically:**
- Adds authentication token
- Handles token refresh
- Retries failed requests
- Formats errors

---

## CODING STANDARDS

### 1. TypeScript

**Always use TypeScript:**
```typescript
// ✓ Good
interface Product {
  id: string;
  name: string;
  price: number;
}

const product: Product = { id: '1', name: 'T-Shirt', price: 29.99 };

// ✗ Bad
const product: any = { id: '1', name: 'T-Shirt', price: 29.99 };
```

**Use strict mode:**
- No `any` types (except when absolutely necessary)
- All function parameters typed
- All return types specified
- Proper null checking

### 2. Components

**Functional components with TypeScript:**
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>${product.price}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 16,
    color: '#7C3AED',
  },
});
```

### 3. Naming Conventions

```typescript
// Components: PascalCase
ProductCard.tsx
FormInput.tsx

// Utilities: camelCase
formatCurrency.ts
validateEmail.ts

// Constants: UPPER_SNAKE_CASE
MAX_FILE_SIZE
DEFAULT_PAGE_SIZE

// Types/Interfaces: PascalCase
interface UserProfile { }
type ProductStatus = 'active' | 'inactive';

// Files: kebab-case or PascalCase
product-card.tsx  or  ProductCard.tsx
```

### 4. File Organization

**Component structure:**
```typescript
// ComponentName.tsx
import React from 'react';
import { View } from 'react-native';

// 1. Types/Interfaces
interface Props {
  // ...
}

// 2. Component
export const ComponentName: React.FC<Props> = ({ }) => {
  // 3. Hooks
  const { data } = useQuery(...);

  // 4. Event handlers
  const handlePress = () => { };

  // 5. Render
  return <View></View>;
};

// 6. Styles
const styles = StyleSheet.create({
  // ...
});
```

---

## COMMON PATTERNS

### 1. Loading States

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['products'],
  queryFn: productsApi.getProducts,
});

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorState error={error} />;
if (!data || data.length === 0) return <EmptyState />;

return <ProductList products={data} />;
```

### 2. Error Handling

```typescript
import { handleError } from '@/utils/errorHandler';

try {
  await createProduct(data);
  Toast.show({ type: 'success', message: 'Product created!' });
} catch (error) {
  handleError(error); // Logs to Sentry and shows user-friendly message
}
```

### 3. Form Validation

```typescript
// Define schema
const productSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  price: z.number().positive('Price must be positive'),
});

// Use in form
const { control, handleSubmit } = useForm({
  resolver: zodResolver(productSchema),
});
```

### 4. API Integration

```typescript
// 1. Define types
interface Product {
  id: string;
  name: string;
}

// 2. Create API methods
export const productsApi = {
  getProducts: async (): Promise<Product[]> => {
    const { data } = await apiClient.get('/merchant/products');
    return data;
  },
};

// 3. Use in component with React Query
const { data: products } = useQuery({
  queryKey: ['products'],
  queryFn: productsApi.getProducts,
});
```

---

## COMMON TASKS

### Add a New Screen

1. **Create file in `app/` directory:**
```bash
touch app/my-new-screen.tsx
```

2. **Create component:**
```typescript
import React from 'react';
import { View, Text } from 'react-native';

export default function MyNewScreen() {
  return (
    <View>
      <Text>My New Screen</Text>
    </View>
  );
}
```

3. **Navigate to it:**
```typescript
import { router } from 'expo-router';
router.push('/my-new-screen');
```

### Add a New API Endpoint

1. **Add type definition:**
```typescript
// types/myTypes.ts
export interface MyData {
  id: string;
  name: string;
}
```

2. **Create API method:**
```typescript
// services/api/myApi.ts
export const myApi = {
  getData: async (): Promise<MyData[]> => {
    const { data } = await apiClient.get('/merchant/my-data');
    return data;
  },
};
```

3. **Use in component:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { myApi } from '@/services/api/myApi';

const { data } = useQuery({
  queryKey: ['my-data'],
  queryFn: myApi.getData,
});
```

### Add a New Permission

1. **Add to constants:**
```typescript
// constants/permissions.ts
export const PERMISSIONS = {
  // ... existing permissions
  MY_NEW_PERMISSION: 'my:new:permission',
};
```

2. **Use in component:**
```typescript
const canDoAction = usePermission('my:new:permission');
```

### Add a New Component

1. **Create component file:**
```typescript
// components/common/MyComponent.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MyComponentProps {
  title: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

2. **Export from index:**
```typescript
// components/common/index.ts
export { MyComponent } from './MyComponent';
```

3. **Use in screen:**
```typescript
import { MyComponent } from '@/components/common';

<MyComponent title="Hello World" />
```

---

## DEBUGGING

### 1. Debug Logging

```typescript
// Development only
if (__DEV__) {
  console.log('Debug info:', data);
}

// Production (use Sentry)
import * as Sentry from '@sentry/react-native';
Sentry.captureMessage('Something happened', 'info');
```

### 2. React Query DevTools

```typescript
// Enable in development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Add to app
<ReactQueryDevtools initialIsOpen={false} />
```

### 3. Network Debugging

```bash
# Enable API logging
ENABLE_API_LOGGING=true npm start
```

### 4. Common Issues

**Issue: "Module not found"**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

**Issue: "Type errors"**
```bash
# Check types
npx tsc --noEmit
```

**Issue: "API not working"**
- Check `.env` file has correct API_BASE_URL
- Check backend is running
- Check network inspector

---

## TESTING

### Unit Tests (Jest)

```typescript
// __tests__/utils/formatCurrency.test.ts
import { formatCurrency } from '@/utils/formatters';

describe('formatCurrency', () => {
  it('formats USD currency correctly', () => {
    expect(formatCurrency(29.99, 'USD')).toBe('$29.99');
  });
});
```

**Run tests:**
```bash
npm test
```

### Integration Tests

```typescript
// __tests__/screens/ProductsScreen.test.tsx
import { render, waitFor } from '@testing-library/react-native';
import ProductsScreen from '@/app/(products)/index';

it('renders product list', async () => {
  const { getByText } = render(<ProductsScreen />);
  await waitFor(() => {
    expect(getByText('Products')).toBeTruthy();
  });
});
```

---

## DEPLOYMENT

### Development Build

```bash
npm start
# Press 'i' for iOS, 'a' for Android
```

### Production Build

**iOS:**
```bash
eas build --platform ios --profile production
```

**Android:**
```bash
eas build --platform android --profile production
```

**Web:**
```bash
npx expo export:web
```

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

---

## RESOURCES

### Documentation
- **Expo:** https://docs.expo.dev
- **React Native:** https://reactnative.dev
- **React Query:** https://tanstack.com/query
- **Zod:** https://zod.dev

### Project Documentation
- `PRODUCTION_READINESS_CHECKLIST.md` - Production requirements
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `FINAL_PROJECT_COMPLETION_REPORT.md` - Complete project overview
- `CHANGELOG.md` - Version history
- `WEEK{N}_COMPLETION_SUMMARY.md` - Weekly summaries

### Getting Help
- Email: support@rezmerchant.com
- GitHub Issues: https://github.com/rez-platform/merchant-app/issues
- Team Chat: [Internal Slack/Discord]

---

## BEST PRACTICES

### DO:
- ✓ Use TypeScript strict mode
- ✓ Handle all errors
- ✓ Add loading states
- ✓ Validate all inputs
- ✓ Check permissions
- ✓ Write tests for utilities
- ✓ Use React Query for API calls
- ✓ Follow naming conventions
- ✓ Comment complex logic
- ✓ Keep components small and focused

### DON'T:
- ✗ Use `any` type (except when necessary)
- ✗ Leave console.log in production
- ✗ Forget error handling
- ✗ Skip input validation
- ✗ Bypass permission checks
- ✗ Commit .env file
- ✗ Commit secrets or API keys
- ✗ Create God components (too large)
- ✗ Ignore TypeScript errors
- ✗ Skip code reviews

---

## QUICK REFERENCE

### Important Commands

```bash
# Start development
npm start

# Run iOS
npm run ios

# Run Android
npm run android

# Run Web
npm run web

# Run tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build (production)
eas build --platform [ios/android] --profile production

# Submit to stores
eas submit --platform [ios/android]
```

### Important Directories

```
app/         - Screens (Expo Router)
components/  - Reusable components
services/    - API services
contexts/    - Global state
types/       - TypeScript types
utils/       - Helper functions
constants/   - App constants
```

### Important Files

```
app.json           - App configuration
.env               - Environment variables (not committed)
.env.example       - Environment template
package.json       - Dependencies
tsconfig.json      - TypeScript config
eas.json           - Build configuration
```

---

## WELCOME TO THE TEAM!

You're now ready to start developing the Rez Merchant App. If you have any questions:

1. Check this handbook
2. Check project documentation (40+ MD files)
3. Ask the team
4. Create a GitHub issue

**Happy coding!** 🚀

---

**Last Updated:** 2025-11-17
**Version:** 1.0.0
