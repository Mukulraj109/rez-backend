# Team Management - Quick Start Guide

## 🚀 For Developers

### Check if User Can View Team
```typescript
import { useAuth } from '@/contexts/AuthContext';
import { canViewTeam } from '@/utils/teamHelpers';

function MyComponent() {
  const { permissions } = useAuth();

  if (!canViewTeam(permissions)) {
    return <AccessDenied />;
  }

  return <TeamContent />;
}
```

### Check Specific Permission
```typescript
import { useAuth } from '@/contexts/AuthContext';

function InviteButton() {
  const { hasPermission } = useAuth();

  if (!hasPermission('team:invite')) {
    return null; // Hide button
  }

  return <Button title="Invite Member" />;
}
```

### Get Team Statistics
```typescript
import { teamService } from '@/services/api/team';
import { getTeamStats } from '@/utils/teamHelpers';

async function loadStats() {
  const response = await teamService.getTeamMembers();
  const stats = getTeamStats(response.data.teamMembers);

  console.log(`${stats.active} active, ${stats.pending} pending`);
}
```

### Format Role & Status
```typescript
import {
  formatRoleName,
  getRoleColor,
  formatStatusName,
  getStatusColor
} from '@/utils/teamHelpers';

// Get role display
const roleName = formatRoleName('admin');    // "Admin"
const roleColor = getRoleColor('admin');     // "#3B82F6"

// Get status display
const statusName = formatStatusName('active'); // "Active"
const statusColor = getStatusColor('active');  // "#10B981"
```

### Filter & Search Team Members
```typescript
import {
  filterActiveMembers,
  filterByRole,
  searchMembers
} from '@/utils/teamHelpers';

// Get only active members
const active = filterActiveMembers(allMembers);

// Get admins only
const admins = filterByRole(allMembers, 'admin');

// Search by name or email
const results = searchMembers(allMembers, 'john');
```

### Sort Team Members
```typescript
import {
  sortByName,
  sortByRole,
  sortByLastLogin
} from '@/utils/teamHelpers';

// Sort alphabetically
const sorted = sortByName(members, 'asc');

// Sort by role hierarchy (owners first)
const byRole = sortByRole(members, 'desc');

// Sort by last login (most recent first)
const byLogin = sortByLastLogin(members, 'desc');
```

---

## 📋 Common Use Cases

### 1. Show/Hide UI Based on Permission
```typescript
import { useAuth } from '@/contexts/AuthContext';

function TeamActions() {
  const { hasPermission, hasAnyPermission } = useAuth();

  return (
    <View>
      {/* Show if has specific permission */}
      {hasPermission('team:invite') && (
        <Button title="Invite Member" />
      )}

      {/* Show if has any of these permissions */}
      {hasAnyPermission(['team:change_role', 'team:change_status']) && (
        <Button title="Manage Member" />
      )}
    </View>
  );
}
```

### 2. Check if User Can Manage Another User
```typescript
import { useAuth } from '@/contexts/AuthContext';
import { canManageTeamMember } from '@/utils/teamHelpers';

function MemberCard({ member }) {
  const { role } = useAuth();

  const canManage = role && canManageTeamMember(role, member.role);

  return (
    <View>
      <Text>{member.name}</Text>
      {canManage && <Button title="Edit" />}
    </View>
  );
}
```

### 3. Display Role Badge
```typescript
import { View, Text } from 'react-native';
import { getRoleColor, formatRoleName } from '@/utils/teamHelpers';

function RoleBadge({ role }) {
  return (
    <View style={{
      backgroundColor: getRoleColor(role) + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6
    }}>
      <Text style={{ color: getRoleColor(role) }}>
        {formatRoleName(role)}
      </Text>
    </View>
  );
}
```

### 4. Display Status Badge
```typescript
import { View, Text } from 'react-native';
import { getStatusColor, formatStatusName } from '@/utils/teamHelpers';

function StatusBadge({ status }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: getStatusColor(status) + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4
    }}>
      <View style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: getStatusColor(status)
      }} />
      <Text style={{ color: getStatusColor(status) }}>
        {formatStatusName(status)}
      </Text>
    </View>
  );
}
```

### 5. Display User Avatar
```typescript
import { View, Text } from 'react-native';
import { getInitials, getAvatarColor } from '@/utils/teamHelpers';

function UserAvatar({ name }) {
  return (
    <View style={{
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: getAvatarColor(name),
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
```

### 6. Show Relative Time
```typescript
import { Text } from 'react-native';
import { getRelativeTime } from '@/utils/teamHelpers';

function LastLogin({ lastLoginAt }) {
  if (!lastLoginAt) return null;

  return (
    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
      Last seen {getRelativeTime(lastLoginAt)}
    </Text>
  );
}
```

### 7. Invite Team Member
```typescript
import { teamService } from '@/services/api/team';

async function inviteMember(email: string, name: string, role: 'admin' | 'manager' | 'staff') {
  try {
    const response = await teamService.inviteTeamMember({
      email,
      name,
      role
    });

    console.log('Invitation sent:', response.message);
    // Show success message
  } catch (error) {
    console.error('Failed to invite:', error.message);
    // Show error message
  }
}
```

### 8. Update Member Role
```typescript
import { teamService } from '@/services/api/team';

async function updateRole(userId: string, newRole: 'admin' | 'manager' | 'staff') {
  try {
    const response = await teamService.updateTeamMemberRole(userId, { role: newRole });
    console.log('Role updated:', response.message);
    // Refresh team list
  } catch (error) {
    console.error('Failed to update role:', error.message);
  }
}
```

### 9. Remove Team Member
```typescript
import { teamService } from '@/services/api/team';
import { Alert } from 'react-native';

async function removeMember(userId: string, memberName: string) {
  Alert.alert(
    'Remove Team Member',
    `Are you sure you want to remove ${memberName}?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await teamService.removeTeamMember(userId);
            console.log('Member removed');
            // Refresh team list
          } catch (error) {
            console.error('Failed to remove:', error.message);
          }
        }
      }
    ]
  );
}
```

---

## 🎨 UI Components

### Complete Member List Item
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  getInitials,
  getAvatarColor,
  formatRoleName,
  getRoleColor,
  formatStatusName,
  getStatusColor,
  getRelativeTime
} from '@/utils/teamHelpers';

function TeamMemberListItem({ member, onPress }) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(member.name) }]}>
        <Text style={styles.initials}>{getInitials(member.name)}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.email}>{member.email}</Text>
      </View>

      {/* Right Side */}
      <View style={styles.right}>
        {/* Role Badge */}
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role) + '20' }]}>
          <Text style={[styles.roleBadgeText, { color: getRoleColor(member.role) }]}>
            {formatRoleName(member.role)}
          </Text>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(member.status) + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(member.status) }]}>
            {formatStatusName(member.status)}
          </Text>
        </View>

        {/* Last Login */}
        {member.lastLoginAt && (
          <Text style={styles.lastLogin}>
            {getRelativeTime(member.lastLoginAt)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  lastLogin: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});

export default TeamMemberListItem;
```

---

## 🔧 Troubleshooting

### Team Tab Not Showing
```typescript
// Check permissions in auth context
import { useAuth } from '@/contexts/AuthContext';

function Debug() {
  const { permissions, role } = useAuth();

  console.log('Role:', role);
  console.log('Permissions:', permissions);
  console.log('Has team:view?', permissions.includes('team:view'));

  return null;
}
```

### Permissions Not Loading
```typescript
// Manually refresh permissions
import { useAuth } from '@/contexts/AuthContext';

function RefreshButton() {
  const { refreshPermissions } = useAuth();

  return (
    <Button
      title="Refresh Permissions"
      onPress={async () => {
        try {
          await refreshPermissions();
          console.log('Permissions refreshed');
        } catch (error) {
          console.error('Failed to refresh:', error);
        }
      }}
    />
  );
}
```

### Check Current Permissions
```typescript
import { useAuth } from '@/contexts/AuthContext';

function PermissionsDebug() {
  const { permissions, role } = useAuth();

  return (
    <View>
      <Text>Role: {role}</Text>
      <Text>Permissions ({permissions.length}):</Text>
      {permissions.map(p => (
        <Text key={p}>• {p}</Text>
      ))}
    </View>
  );
}
```

---

## 📚 Reference

### All Permission Helper Functions
```typescript
// From utils/teamHelpers.ts
canInviteMembers(role, permissions)
canUpdateRoles(role, permissions)
canRemoveMembers(role, permissions)
canUpdateStatus(role, permissions)
canViewTeam(permissions)
canManageTeamMember(currentUserRole, targetMemberRole)
hasPermission(permissions, permission)
hasAllPermissions(userPermissions, requiredPermissions)
hasAnyPermission(userPermissions, permissions)
```

### All Formatting Functions
```typescript
// From utils/teamHelpers.ts
formatRoleName(role)
getRoleColor(role)
getRoleBackgroundColor(role)
getRoleDescription(role)
getRoleIcon(role)
formatStatusName(status)
getStatusColor(status)
getStatusBackgroundColor(status)
getStatusIcon(status)
getStatusDescription(status)
getPermissionDescription(permission)
formatPermissionName(permission)
```

### All Filtering/Sorting Functions
```typescript
// From utils/teamHelpers.ts
filterByRole(members, role)
filterByStatus(members, status)
filterActiveMembers(members)
filterPendingMembers(members)
filterSuspendedMembers(members)
searchMembers(members, searchTerm)
sortByName(members, order)
sortByRole(members, order)
sortByLastLogin(members, order)
sortByInvitedDate(members, order)
```

### All Utility Functions
```typescript
// From utils/teamHelpers.ts
formatDate(dateString)
formatDateTime(dateString)
getRelativeTime(dateString)
getTeamStats(members)
isValidEmail(email)
isValidPassword(password)
isValidName(name)
getInitials(name)
getAvatarColor(name)
```

---

## 💡 Best Practices

1. **Always check permissions before showing UI**
   ```typescript
   if (!hasPermission('team:invite')) return null;
   ```

2. **Use helper functions for consistency**
   ```typescript
   // Good
   const color = getRoleColor(role);

   // Bad
   const color = role === 'admin' ? '#3B82F6' : '#6B7280';
   ```

3. **Handle loading and error states**
   ```typescript
   if (isLoading) return <Loader />;
   if (error) return <ErrorMessage />;
   return <TeamList />;
   ```

4. **Refresh data after mutations**
   ```typescript
   await teamService.inviteTeamMember(data);
   await refreshTeamList(); // Reload data
   ```

5. **Use TypeScript types**
   ```typescript
   import { MerchantRole, Permission } from '@/types/team';

   function checkRole(role: MerchantRole): boolean {
     // Type-safe
   }
   ```

---

**Quick Start Guide Version**: 1.0.0
**Last Updated**: 2025-11-17
