# RBAC Quick Reference Card

## 🚀 Quick Import Cheatsheet

```tsx
// Hooks
import {
  usePermissions,           // Get all user permissions
  useHasPermission,         // Check single permission
  useHasAnyPermission,      // Check any of permissions
  useHasAllPermissions,     // Check all permissions
  useRole,                  // Get user role
  useIsOwner, useIsAdmin,   // Role checks
  usePermissionHelpers,     // CRUD helpers
  useTeamPermissions,       // Team management
} from '../hooks/usePermissions';

import {
  useRBAC,                  // Main RBAC hook
  useResourceRBAC,          // Resource-specific
  useActionAuth,            // Action authorization
} from '../hooks/useRBAC';

// Components
import {
  ProtectedAction,          // Wrap any component
  ProtectedButton,          // Protected button
  ProtectedSection,         // Protected section
  ProtectedFeature,         // Feature flag
  ConditionalRender,        // Show/hide based on permission
} from '../components/common/ProtectedAction';

import {
  ProtectedRoute,           // Route protection
  ProtectedScreen,          // Screen wrapper
  withProtection,           // HOC
  useRouteProtection,       // Hook for routes
} from '../components/common/ProtectedRoute';
```

## 🎯 Common Patterns

### 1. Check Single Permission
```tsx
const canEdit = useHasPermission('products:edit');
```

### 2. Check Multiple Permissions (Any)
```tsx
const hasAccess = useHasAnyPermission(['analytics:view', 'reports:view']);
```

### 3. Check Multiple Permissions (All)
```tsx
const canManage = useHasAllPermissions(['products:edit', 'products:delete']);
```

### 4. Get User Role
```tsx
const role = useRole();
const isOwner = useIsOwner();
```

### 5. CRUD Helpers
```tsx
const { canView, canCreate, canEdit, canDelete } = usePermissionHelpers();
if (canEdit('products')) { /* ... */ }
```

### 6. Main RBAC Hook
```tsx
const { canView, canEdit, role, uiVisibility } = useRBAC();
```

### 7. Protect Component
```tsx
<ProtectedAction permission="products:edit">
  <EditForm />
</ProtectedAction>
```

### 8. Protect Route
```tsx
<ProtectedRoute permission="team:view">
  <TeamScreen />
</ProtectedRoute>
```

### 9. Protected Button
```tsx
<ProtectedButton
  permission="products:create"
  title="Add Product"
  onPress={handleAdd}
/>
```

### 10. Conditional Render
```tsx
<ConditionalRender
  permission="analytics:view"
  authorized={<Analytics />}
  unauthorized={<Text>No access</Text>}
/>
```

## 📋 Permission Format

Format: `{resource}:{action}`

**Examples:**
- `products:view`
- `products:create`
- `products:edit`
- `products:delete`
- `orders:update_status`
- `team:invite`

## 🎭 Roles

| Role | Level | Description |
|------|-------|-------------|
| **owner** | 4 | Full access (all 75+ permissions) |
| **admin** | 3 | Most features (54 permissions) |
| **manager** | 2 | Products & orders (24 permissions) |
| **staff** | 1 | View only (11 permissions) |

## 📦 Resources

Products, Orders, Team, Analytics, Settings, Billing, Customers, Promotions, Reviews, Notifications, Reports, Inventory, Categories, Profile, Logs, API

## ⚡ Actions

view, create, edit, delete, export, manage, access, update_status, cancel, refund, invite, remove, change_role, change_status, respond, send, bulk_import, bulk_update, view_all, view_revenue, view_costs, view_detailed, view_invoices, edit_basic, manage_keys

## 🎨 Component Props

### ProtectedAction
```tsx
<ProtectedAction
  permission="products:edit"           // Single permission
  permissions={['p1', 'p2']}           // Multiple permissions
  requireAll={false}                   // Require all or any
  resource="products"                  // Resource name
  action="edit"                        // Action type
  minRole="admin"                      // Minimum role
  fallback={<NoAccess />}              // Custom fallback
  showFallback={true}                  // Show/hide fallback
  onUnauthorized={() => {}}            // Custom handler
>
  {children}
</ProtectedAction>
```

### ProtectedRoute
```tsx
<ProtectedRoute
  permission="team:view"
  unauthorizedRedirect="/(tabs)"       // Redirect path
  showUnauthorizedPage={true}          // Show error page
  loadingComponent={<Loading />}       // Custom loading
>
  {children}
</ProtectedRoute>
```

### ProtectedButton
```tsx
<ProtectedButton
  permission="products:delete"
  title="Delete"
  onPress={handleDelete}
  icon="trash"                         // Ionicons name
  variant="danger"                     // primary|secondary|danger
  disabled={false}
  loading={false}
/>
```

## 🔐 Role Hierarchy Check

```tsx
const { hasRoleLevel } = useRBAC();

// Check if user has at least manager role
if (hasRoleLevel('manager')) {
  // User is manager, admin, or owner
}
```

## 🎯 Resource-Specific RBAC

```tsx
const orderPerms = useResourceRBAC('orders');

orderPerms.canView     // Can view orders
orderPerms.canCreate   // Can create orders
orderPerms.canEdit     // Can edit orders
orderPerms.canDelete   // Can delete orders
orderPerms.canExport   // Can export orders
```

## 🚦 UI Visibility Rules

```tsx
const { uiVisibility } = useRBAC();

uiVisibility.showProducts              // Show products menu
uiVisibility.showTeam                  // Show team menu
uiVisibility.showCreateProduct         // Show create button
uiVisibility.showFinancialData         // Show revenue data
uiVisibility.canBulkImport             // Can bulk import
```

## 🔍 Permission Summary

```tsx
const { permissionSummary } = useRBAC();

permissionSummary.total                // Total permissions
permissionSummary.sensitive            // Sensitive permissions
permissionSummary.byCategory           // Grouped by category
```

## 🛡️ Authorization Guard

```tsx
const { authorize } = useRBAC();

const handleAction = () => {
  const authorized = authorize('products:delete', {
    onUnauthorized: () => {
      Alert.alert('Access Denied');
    }
  });

  if (authorized) {
    performAction();
  }
};
```

## 📊 Team Permissions

```tsx
const {
  canViewTeam,
  canInviteMembers,
  canRemoveMembers,
  canChangeRoles,
  canEditMember,
} = useTeamPermissions();

// Check if can edit specific member
if (canEditMember(member.role)) {
  // User can edit this member
}
```

## 🎯 Feature Permissions

```tsx
const {
  canManageProducts,
  canManageOrders,
  canManageTeam,
  canViewAnalytics,
  canViewFinancials,
  canManageBilling,
} = useFeaturePermissions();
```

## 🔄 Permission State

```tsx
const { hasPermission, isLoading, isReady } = usePermissionState('products:edit');

if (isLoading) return <Loading />;
if (hasPermission) return <EditButton />;
return null;
```

## ⚡ Optimistic Permission

```tsx
// Returns cached value immediately, updates when fresh data arrives
const canEdit = useOptimisticPermission('products:edit');
```

## 🧪 Testing

```tsx
// Mock permissions
jest.mock('../hooks/usePermissions', () => ({
  usePermissions: () => ({
    permissions: ['products:view', 'products:edit'],
    role: 'admin',
    isLoading: false,
  }),
}));
```

## 📝 Permission Categories

1. **Products** - View, create, edit, delete, bulk_import, export
2. **Orders** - View, view_all, update_status, cancel, refund, export
3. **Team** - View, invite, remove, change_role, change_status
4. **Analytics** - View, view_revenue, view_costs, export
5. **Settings** - View, edit, edit_basic
6. **Billing** - View, manage, view_invoices
7. **Customers** - View, edit, delete, export
8. **Promotions** - View, create, edit, delete
9. **Reviews** - View, respond, delete
10. **Notifications** - View, send
11. **Reports** - View, export, view_detailed
12. **Inventory** - View, edit, bulk_update
13. **Categories** - View, create, edit, delete
14. **Profile** - View, edit
15. **Logs** - View, export
16. **API** - Access, manage_keys

## 🎨 Role Colors

```tsx
import { ROLE_COLORS, ROLE_ICONS } from '../constants/roles';

// Get color for role
const color = ROLE_COLORS[role];        // '#3B82F6' for admin
const icon = ROLE_ICONS[role];          // 'people' for admin
```

## 🔍 Permission Utils

```tsx
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  isSensitivePermission,
  compareRolePermissions,
} from '../utils/permissions';

// Check if role has permission
hasPermission('admin', 'products:edit');  // true

// Check if permission is sensitive
isSensitivePermission('billing:manage');  // true

// Compare two roles
const diff = compareRolePermissions('admin', 'manager');
diff.onlyInRole1    // Permissions only admin has
diff.onlyInRole2    // Permissions only manager has
diff.shared         // Common permissions
```

## 🚨 Common Mistakes to Avoid

❌ **Don't:**
```tsx
if (user.role === 'admin') { /* Bad */ }
```

✅ **Do:**
```tsx
if (useHasPermission('feature:access')) { /* Good */ }
```

❌ **Don't:**
```tsx
// Checking permission without loading check
const canEdit = permissions.includes('products:edit');
```

✅ **Do:**
```tsx
const { permissions, isLoading } = usePermissions();
if (!isLoading && permissions.includes('products:edit')) { /* Good */ }
```

## 📦 Full Example

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useRBAC } from '../hooks/useRBAC';
import { ProtectedAction, ProtectedButton } from '../components/common/ProtectedAction';
import { ProtectedRoute } from '../components/common/ProtectedRoute';

function ProductsScreen() {
  const { canView, canCreate, canDelete, role, uiVisibility } = useRBAC();

  return (
    <ProtectedRoute permission="products:view">
      <View>
        <Text>Products ({role})</Text>

        {/* Protected actions */}
        <ProtectedAction permission="products:create">
          <AddProductForm />
        </ProtectedAction>

        {/* Protected button */}
        <ProtectedButton
          permission="products:delete"
          title="Delete All"
          onPress={handleDeleteAll}
          variant="danger"
        />

        {/* Conditional rendering */}
        {uiVisibility.showCreateProduct && (
          <CreateButton />
        )}

        {/* Resource check */}
        {canView('products') && <ProductList />}
      </View>
    </ProtectedRoute>
  );
}
```

## 🔗 Related Files

- `constants/roles.ts` - Role definitions
- `utils/permissions.ts` - Permission utilities
- `hooks/usePermissions.ts` - Permission hooks
- `hooks/useRBAC.ts` - Main RBAC hook
- `components/common/ProtectedAction.tsx` - Protection components
- `components/common/ProtectedRoute.tsx` - Route protection
- `types/team.ts` - Type definitions
- `services/api/team.ts` - Team service API

## 📚 Documentation

See `RBAC_SYSTEM_GUIDE.md` for complete documentation.
