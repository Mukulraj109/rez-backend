# Team Context & State Management Implementation

Complete implementation of team state management for the merchant app with real-time updates, optimistic UI, and comprehensive permission checking.

## Files Created

### 1. `contexts/TeamContext.tsx`
**Purpose**: Centralized team state management with React Context and useReducer

**Key Features**:
- ✅ Complete team member state management
- ✅ Current user permissions and role tracking
- ✅ Optimistic UI updates with rollback on error
- ✅ Real-time updates via Socket.IO
- ✅ Loading and error states
- ✅ Pending operations tracking
- ✅ Automatic initial data fetch

**State Structure**:
```typescript
{
  members: TeamMemberSummary[];           // Array of team members
  membersById: Record<string, TeamMemberSummary>;  // Quick lookup
  currentUserRole: MerchantRole | null;   // User's role
  currentUserPermissions: Permission[];   // User's permissions
  isLoadingMembers: boolean;              // Loading state
  isLoadingPermissions: boolean;          // Loading state
  error: string | null;                   // Error message
  pendingOperations: Set<string>;         // Track pending ops
  totalMembers: number;                   // Total count
  lastFetchedAt: string | null;           // Last fetch time
}
```

**Actions Available**:
- `FETCH_MEMBERS_START/SUCCESS/ERROR` - Fetch team members
- `FETCH_PERMISSIONS_START/SUCCESS/ERROR` - Fetch user permissions
- `ADD_MEMBER_OPTIMISTIC/SUCCESS/ROLLBACK` - Invite member with optimistic update
- `UPDATE_MEMBER_ROLE_OPTIMISTIC/SUCCESS/ROLLBACK` - Update role
- `UPDATE_MEMBER_STATUS_OPTIMISTIC/SUCCESS/ROLLBACK` - Update status
- `REMOVE_MEMBER_OPTIMISTIC/SUCCESS/ROLLBACK` - Remove member
- `UPDATE_MEMBER_REALTIME` - Real-time member update from socket
- `REMOVE_MEMBER_REALTIME` - Real-time member removal from socket
- `START_OPERATION/END_OPERATION` - Track pending operations
- `CLEAR_ERROR` - Clear error state

**Real-Time Events**:
Listens to Socket.IO events:
- `team-member-updated` - Member data changed
- `team-member-removed` - Member was removed
- `team-member-invited` - New member invited

### 2. `hooks/useTeam.ts`
**Purpose**: Custom hooks for type-safe, convenient access to team state

**Available Hooks**:

#### Main Hook
- `useTeam()` - Full context access

#### Data Hooks
- `useTeamMembers()` - Get all team members with loading state
- `useTeamMember(userId)` - Get specific member by ID
- `useCurrentUserTeam()` - Current user's role and permissions
- `usePermissions()` - Permission checking with convenience methods

#### Mutation Hooks
- `useInviteTeamMember()` - Invite new member
- `useUpdateMemberRole()` - Update member role
- `useUpdateMemberStatus()` - Update member status
- `useRemoveTeamMember()` - Remove member
- `useSuspendTeamMember()` - Suspend member
- `useActivateTeamMember()` - Activate member
- `useResendInvitation()` - Resend invitation email

#### Utility Hooks
- `useCanEditMember(role)` - Check if can edit member with role
- `useFilteredTeamMembers(filters)` - Filter members by criteria
- `useTeamStats()` - Team statistics (active, pending, by role)
- `useTeamOperationStatus()` - Check pending operations
- `useSortedTeamMembers(sortBy)` - Sort members
- `useTeamMembersByRole(role)` - Get members by role
- `useTeamAccess()` - Check if user can access team features

### 3. `app/team/_layout.tsx`
**Purpose**: Layout wrapper for team screens with access control

**Key Features**:
- ✅ Wraps all team screens with TeamProvider
- ✅ Permission checking before access
- ✅ Redirects users without team:view permission
- ✅ Custom header with team count and stats
- ✅ Navigation stack for team screens
- ✅ Loading and error states

**Screens Defined**:
- `index` - Team list (main screen)
- `invite` - Invite new member (modal)
- `[memberId]` - Member detail page
- `edit/[memberId]` - Edit member (modal)
- `permissions` - Permissions overview (modal)
- `activity` - Team activity log

## Usage Examples

### Example 1: Display Team Members List

```typescript
import { useTeamMembers } from '../../hooks/useTeam';

function TeamListScreen() {
  const { members, isLoading, refetch, isEmpty } = useTeamMembers();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isEmpty) {
    return <EmptyState message="No team members yet" />;
  }

  return (
    <FlatList
      data={members}
      renderItem={({ item }) => <TeamMemberCard member={item} />}
      onRefresh={refetch}
      refreshing={isLoading}
    />
  );
}
```

### Example 2: Invite Team Member

```typescript
import { useInviteTeamMember } from '../../hooks/useTeam';

function InviteScreen() {
  const inviteMember = useInviteTeamMember();
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    setLoading(true);
    const result = await inviteMember({
      email: 'user@example.com',
      name: 'John Doe',
      role: 'admin'
    });

    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Invitation sent!');
      router.back();
    } else {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <View>
      {/* Form fields */}
      <Button onPress={handleInvite} loading={loading}>
        Send Invitation
      </Button>
    </View>
  );
}
```

### Example 3: Permission-Based UI

```typescript
import { usePermissions } from '../../hooks/useTeam';

function TeamMemberActions({ member }) {
  const {
    canChangeRole,
    canChangeStatus,
    canRemoveTeam
  } = usePermissions();

  return (
    <View>
      {canChangeRole && (
        <Button onPress={() => handleChangeRole(member.id)}>
          Change Role
        </Button>
      )}
      {canChangeStatus && (
        <Button onPress={() => handleSuspend(member.id)}>
          Suspend
        </Button>
      )}
      {canRemoveTeam && (
        <Button onPress={() => handleRemove(member.id)} danger>
          Remove
        </Button>
      )}
    </View>
  );
}
```

### Example 4: Role-Based Access Control

```typescript
import { useCanEditMember } from '../../hooks/useTeam';

function MemberDetailScreen({ route }) {
  const { memberId } = route.params;
  const { member } = useTeamMember(memberId);
  const canEdit = useCanEditMember(member?.role);

  return (
    <View>
      <MemberDetails member={member} />
      {canEdit && (
        <Button onPress={() => router.push(`/team/edit/${memberId}`)}>
          Edit Member
        </Button>
      )}
    </View>
  );
}
```

### Example 5: Team Statistics Dashboard

```typescript
import { useTeamStats } from '../../hooks/useTeam';

function TeamDashboard() {
  const stats = useTeamStats();

  return (
    <View>
      <StatCard
        label="Total Members"
        value={stats.total}
        isLoading={stats.isLoading}
      />
      <StatCard
        label="Active"
        value={stats.active}
        color="green"
      />
      <StatCard
        label="Pending"
        value={stats.pending}
        color="amber"
      />
      <StatCard
        label="Suspended"
        value={stats.suspended}
        color="red"
      />

      <RoleBreakdown>
        <RoleStat label="Admins" value={stats.roles.admin} />
        <RoleStat label="Managers" value={stats.roles.manager} />
        <RoleStat label="Staff" value={stats.roles.staff} />
      </RoleBreakdown>
    </View>
  );
}
```

### Example 6: Filtered and Sorted List

```typescript
import { useFilteredTeamMembers, useSortedTeamMembers } from '../../hooks/useTeam';

function FilteredTeamList() {
  const [filters, setFilters] = useState({
    status: 'active',
    searchTerm: ''
  });
  const [sortBy, setSortBy] = useState('name');

  const { members: filteredMembers } = useFilteredTeamMembers(filters);
  const { members: sortedMembers } = useSortedTeamMembers(sortBy);

  // Combine filters and sorting
  const displayMembers = sortBy
    ? sortedMembers.filter(m =>
        filteredMembers.some(fm => fm.id === m.id)
      )
    : filteredMembers;

  return (
    <View>
      <FilterBar filters={filters} onFiltersChange={setFilters} />
      <SortSelector value={sortBy} onChange={setSortBy} />
      <FlatList
        data={displayMembers}
        renderItem={({ item }) => <TeamMemberCard member={item} />}
      />
    </View>
  );
}
```

### Example 7: Optimistic Updates with Rollback

```typescript
import { useUpdateMemberRole, useTeam } from '../../hooks/useTeam';

function ChangeRoleButton({ memberId, newRole }) {
  const updateRole = useUpdateMemberRole();
  const { getMember } = useTeam();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRoleChange = async () => {
    setIsUpdating(true);

    // Optimistic update happens automatically in context
    const result = await updateRole(memberId, newRole);

    setIsUpdating(false);

    if (result.success) {
      // Success - optimistic update is kept
      Alert.alert('Success', 'Role updated!');
    } else {
      // Error - optimistic update rolled back automatically
      Alert.alert('Error', result.error);
    }
  };

  return (
    <Button onPress={handleRoleChange} loading={isUpdating}>
      Change to {newRole}
    </Button>
  );
}
```

## Integration with Existing App

### Step 1: Update Root Layout
Add TeamContext to your app's root layout (if not using team layout):

```typescript
// app/_layout.tsx
import { TeamProvider } from '../contexts/TeamContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <TeamProvider>
        {/* Your app content */}
      </TeamProvider>
    </AuthProvider>
  );
}
```

**Note**: If you're using `app/team/_layout.tsx`, the TeamProvider is already included in that layout. You don't need to add it to the root layout unless you want team data available outside the team screens.

### Step 2: Update Socket Service (Optional Enhancement)
Add team-specific socket events to your socket service types:

```typescript
// types/socket.ts
export interface ServerToClientEvents {
  // ... existing events
  'team-member-updated': (data: TeamMemberSummary) => void;
  'team-member-removed': (data: { userId: string }) => void;
  'team-member-invited': (data: TeamMemberSummary) => void;
}
```

### Step 3: Create Team Screens
Create the actual screen files in `app/team/`:
- `app/team/index.tsx` - Team list
- `app/team/invite.tsx` - Invite form
- `app/team/[memberId].tsx` - Member detail
- `app/team/edit/[memberId].tsx` - Edit form
- `app/team/permissions.tsx` - Permissions overview
- `app/team/activity.tsx` - Activity log

## Features Implemented

### ✅ State Management
- Centralized team state with React Context
- Type-safe state updates with useReducer
- Efficient member lookup with indexed state

### ✅ Optimistic Updates
- Immediate UI updates for better UX
- Automatic rollback on error
- Pending operations tracking

### ✅ Real-Time Updates
- Socket.IO integration for live updates
- Automatic state sync when members change
- Event listeners cleanup on unmount

### ✅ Permission System
- Role-based access control (RBAC)
- Granular permission checking
- Convenience methods for common checks

### ✅ Error Handling
- Graceful error states
- Clear error messages
- Automatic retry on failure

### ✅ Performance
- Memoized selectors with useMemo
- Indexed state for O(1) lookups
- Efficient re-renders

### ✅ Developer Experience
- Type-safe hooks
- Clear API surface
- Comprehensive examples

## Permission System

### Available Permissions
```typescript
type Permission =
  | 'team:view' | 'team:invite' | 'team:remove'
  | 'team:change_role' | 'team:change_status'
  | 'products:view' | 'products:create' | 'products:edit'
  | 'orders:view' | 'orders:update_status'
  | 'analytics:view' | 'analytics:view_revenue'
  | 'settings:view' | 'settings:edit'
  // ... and more
```

### Role Hierarchy
1. **Owner** - Full access (all permissions)
2. **Admin** - Manage products, orders, team (no billing)
3. **Manager** - Manage products and orders (no team)
4. **Staff** - View-only with order updates

### Permission Checking
```typescript
// Single permission
if (hasPermission('team:invite')) {
  // Show invite button
}

// Multiple permissions (any)
if (hasAnyPermission(['team:invite', 'team:remove'])) {
  // User can do at least one
}

// Multiple permissions (all)
if (hasAllPermissions(['products:edit', 'products:delete'])) {
  // User can do both
}

// Role-based check
if (canEditMember('manager')) {
  // Current user can edit managers
}
```

## Real-Time Updates Flow

1. **User A** invites a new team member
2. **TeamContext** sends API request with optimistic update
3. **Backend** processes invitation
4. **Backend** emits `team-member-invited` socket event
5. **User B** receives socket event via SocketService
6. **TeamContext** dispatches `UPDATE_MEMBER_REALTIME` action
7. **User B's UI** updates automatically

## Testing Guide

### Test Optimistic Updates
```typescript
// Test that UI updates immediately
const result = await inviteMember({...});
// UI should show new member before API completes

// Test rollback on error
// Mock API to return error
// Verify member is removed from UI
```

### Test Permissions
```typescript
// Test that buttons are hidden without permission
// Test that actions fail without permission
// Test that navigation is blocked without permission
```

### Test Real-Time Updates
```typescript
// Test that socket events update state
// Test that multiple users see updates
// Test that reconnection resyncs data
```

## Troubleshooting

### Members Not Showing
- Check if user has `team:view` permission
- Check if TeamProvider is wrapping the component
- Check if fetchTeamMembers() is being called

### Real-Time Updates Not Working
- Verify socket connection is established
- Check socket event listeners are registered
- Ensure socket events match backend implementation

### Permission Checks Always False
- Verify user permissions are loaded (check isLoadingPermissions)
- Check if correct permission string is used
- Ensure user role has required permissions

### Optimistic Updates Not Rolling Back
- Check error handling in mutation functions
- Verify rollback action is dispatched
- Check that old state is preserved before update

## API Integration

The context uses `teamService` from `services/api/team.ts`:

```typescript
// Get team members
await teamService.getTeamMembers();

// Get current user permissions
await teamService.getCurrentUserPermissions();

// Invite member
await teamService.inviteTeamMember({ email, name, role });

// Update role
await teamService.updateTeamMemberRole(userId, { role });

// Update status
await teamService.updateTeamMemberStatus(userId, { status });

// Remove member
await teamService.removeTeamMember(userId);

// Resend invitation
await teamService.resendInvitation(userId);
```

## Next Steps

1. **Create Team Screens**: Implement the actual UI screens for team management
2. **Add Notifications**: Show toasts/alerts for team actions
3. **Activity Log**: Implement team activity tracking
4. **Bulk Operations**: Add bulk invite/remove/role update
5. **Advanced Filters**: Add more filtering options
6. **Export Team**: Add CSV export functionality
7. **Team Analytics**: Show team performance metrics

## Summary

✅ **Complete team state management implementation**
✅ **Real-time updates via Socket.IO**
✅ **Optimistic UI with automatic rollback**
✅ **Comprehensive permission system**
✅ **Type-safe custom hooks**
✅ **Access control and navigation guards**
✅ **Production-ready error handling**
✅ **Efficient performance**

All three files are created and ready to use. The team context provides a solid foundation for building team management features in your merchant app.
