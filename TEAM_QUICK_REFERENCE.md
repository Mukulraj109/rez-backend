# Team Context Quick Reference

Quick reference guide for using team state management in the merchant app.

## Import Statements

```typescript
// Main context
import { TeamProvider, useTeamContext } from '../contexts/TeamContext';

// Hooks
import {
  useTeam,
  useTeamMembers,
  useTeamMember,
  useCurrentUserTeam,
  usePermissions,
  useInviteTeamMember,
  useUpdateMemberRole,
  useUpdateMemberStatus,
  useRemoveTeamMember,
  useSuspendTeamMember,
  useActivateTeamMember,
  useResendInvitation,
  useCanEditMember,
  useFilteredTeamMembers,
  useTeamStats,
  useTeamAccess
} from '../hooks/useTeam';

// Types
import {
  TeamMember,
  TeamMemberSummary,
  MerchantRole,
  TeamMemberStatus,
  Permission,
  InviteTeamMemberRequest
} from '../types/team';
```

## Common Patterns

### 1. Display Team List
```typescript
const { members, isLoading } = useTeamMembers();

if (isLoading) return <LoadingSpinner />;

return (
  <FlatList
    data={members}
    renderItem={({ item }) => <MemberCard member={item} />}
  />
);
```

### 2. Check Permission
```typescript
const { canInviteTeam } = usePermissions();

return canInviteTeam ? <InviteButton /> : null;
```

### 3. Invite Member
```typescript
const inviteMember = useInviteTeamMember();

const result = await inviteMember({
  email: 'user@email.com',
  name: 'John Doe',
  role: 'admin'
});

if (result.success) {
  Alert.alert('Success', 'Invitation sent');
}
```

### 4. Update Role
```typescript
const updateRole = useUpdateMemberRole();

await updateRole(memberId, 'manager');
```

### 5. Suspend Member
```typescript
const suspendMember = useSuspendTeamMember();

await suspendMember(memberId);
```

### 6. Get Team Stats
```typescript
const { total, active, pending, roles } = useTeamStats();

return (
  <View>
    <Text>Total: {total}</Text>
    <Text>Active: {active}</Text>
    <Text>Admins: {roles.admin}</Text>
  </View>
);
```

## Type Reference

### Roles
```typescript
type MerchantRole = 'owner' | 'admin' | 'manager' | 'staff';
```

### Status
```typescript
type TeamMemberStatus = 'active' | 'inactive' | 'suspended';
```

### Team Member
```typescript
interface TeamMemberSummary {
  id: string;
  name: string;
  email: string;
  role: MerchantRole;
  status: TeamMemberStatus;
  lastLoginAt?: string;
  invitedAt: string;
  acceptedAt?: string;
}
```

## Hook Return Values

### useTeamMembers()
```typescript
{
  members: TeamMemberSummary[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  total: number;
  isEmpty: boolean;
}
```

### usePermissions()
```typescript
{
  permissions: Permission[];
  hasPermission: (p: Permission) => boolean;
  hasAnyPermission: (ps: Permission[]) => boolean;
  hasAllPermissions: (ps: Permission[]) => boolean;
  isLoading: boolean;

  // Convenience
  canViewTeam: boolean;
  canInviteTeam: boolean;
  canRemoveTeam: boolean;
  canChangeRole: boolean;
  canChangeStatus: boolean;
  canManageProducts: boolean;
  canManageOrders: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
}
```

### useTeamStats()
```typescript
{
  total: number;
  active: number;
  pending: number;
  suspended: number;
  roles: {
    owner: number;
    admin: number;
    manager: number;
    staff: number;
  };
  isLoading: boolean;
}
```

## Mutation Functions

All mutation functions return:
```typescript
{
  success: boolean;
  error?: string;
}
```

### Example Usage
```typescript
const inviteMember = useInviteTeamMember();
const result = await inviteMember(data);

if (!result.success) {
  Alert.alert('Error', result.error);
}
```

## Permission Strings

### Team Management
- `team:view` - View team members
- `team:invite` - Invite new members
- `team:remove` - Remove members
- `team:change_role` - Change member roles
- `team:change_status` - Change member status

### Products
- `products:view` - View products
- `products:create` - Create products
- `products:edit` - Edit products
- `products:delete` - Delete products

### Orders
- `orders:view` - View orders
- `orders:update_status` - Update order status
- `orders:cancel` - Cancel orders
- `orders:refund` - Process refunds

### Analytics
- `analytics:view` - View analytics
- `analytics:view_revenue` - View revenue data
- `analytics:export` - Export analytics

### Settings
- `settings:view` - View settings
- `settings:edit` - Edit settings

## Real-Time Events

The context automatically listens to:
- `team-member-updated` - Member data changed
- `team-member-removed` - Member was removed
- `team-member-invited` - New member invited

No manual subscription needed!

## Common Scenarios

### Show/Hide Based on Permission
```typescript
const { canInviteTeam } = usePermissions();

{canInviteTeam && (
  <Button onPress={handleInvite}>
    Invite Member
  </Button>
)}
```

### Filter Active Members Only
```typescript
const { members } = useFilteredTeamMembers({
  status: 'active'
});
```

### Search Members
```typescript
const [search, setSearch] = useState('');
const { members } = useFilteredTeamMembers({
  searchTerm: search
});
```

### Sort by Name
```typescript
const { members } = useSortedTeamMembers('name');
```

### Check if Can Edit Member
```typescript
const canEdit = useCanEditMember(member.role);

{canEdit && <EditButton />}
```

### Access Control in Layout
```typescript
const { canAccess, shouldRedirect } = useTeamAccess();

if (shouldRedirect) {
  router.replace('/(dashboard)');
}
```

## Error Handling

```typescript
try {
  await inviteMember(data);
} catch (error) {
  Alert.alert('Error', error.message);
}
```

Or use the result object:
```typescript
const result = await inviteMember(data);

if (!result.success) {
  Alert.alert('Error', result.error);
}
```

## Loading States

```typescript
const { isLoading } = useTeamMembers();
const { isLoading: loadingPerms } = useCurrentUserTeam();

if (isLoading || loadingPerms) {
  return <LoadingSpinner />;
}
```

## Optimistic Updates

Optimistic updates happen automatically:

```typescript
// UI updates immediately
await updateRole(memberId, 'admin');

// If error occurs, change is rolled back automatically
```

## Best Practices

1. **Always check permissions before showing UI**
   ```typescript
   const { canInviteTeam } = usePermissions();
   {canInviteTeam && <InviteButton />}
   ```

2. **Handle loading states**
   ```typescript
   if (isLoading) return <LoadingSpinner />;
   ```

3. **Show error messages**
   ```typescript
   if (result.error) {
     Alert.alert('Error', result.error);
   }
   ```

4. **Use specific hooks for specific needs**
   ```typescript
   // Instead of
   const { state } = useTeam();
   const members = state.members;

   // Use
   const { members } = useTeamMembers();
   ```

5. **Memoize expensive computations**
   ```typescript
   const filteredMembers = useMemo(() => {
     return members.filter(m => m.status === 'active');
   }, [members]);
   ```

## File Locations

- **Context**: `contexts/TeamContext.tsx`
- **Hooks**: `hooks/useTeam.ts`
- **Layout**: `app/team/_layout.tsx`
- **Types**: `types/team.ts`
- **Service**: `services/api/team.ts`

## Need Help?

See `TEAM_CONTEXT_IMPLEMENTATION.md` for:
- Detailed examples
- Integration guide
- Troubleshooting
- API reference
- Testing guide

## Cheat Sheet

```typescript
// Get data
const { members } = useTeamMembers();
const { member } = useTeamMember(id);
const { role, permissions } = useCurrentUserTeam();
const stats = useTeamStats();

// Check permissions
const { canInviteTeam, canRemoveTeam } = usePermissions();
const canEdit = useCanEditMember(targetRole);

// Mutations
const invite = useInviteTeamMember();
const updateRole = useUpdateMemberRole();
const updateStatus = useUpdateMemberStatus();
const remove = useRemoveTeamMember();
const suspend = useSuspendTeamMember();
const activate = useActivateTeamMember();

// Filters & sorting
const { members } = useFilteredTeamMembers({ status: 'active' });
const { members } = useSortedTeamMembers('name');

// Access control
const { canAccess, shouldRedirect } = useTeamAccess();
```

---

**Quick Links**:
- [Full Documentation](./TEAM_CONTEXT_IMPLEMENTATION.md)
- [Team Types](./types/team.ts)
- [Team Service](./services/api/team.ts)
