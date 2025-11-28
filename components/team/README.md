# Team Management Components

Comprehensive set of React Native components for team member management in the merchant app.

## Components Overview

### 1. TeamMemberCard
Displays team member information with actions.

**Features:**
- Avatar with role-based colors
- Name, email, role badge
- Status indicator (active/inactive/pending)
- Last login timestamp
- Quick actions (edit, remove)
- Tap to view details

**Usage:**
```tsx
import { TeamMemberCard } from '@/components/team';

<TeamMemberCard
  member={teamMember}
  onPress={() => navigateToDetails(teamMember.id)}
  onEdit={() => handleEdit(teamMember)}
  onRemove={() => handleRemove(teamMember.id)}
  showActions={true}
  testID="team-member-card"
/>
```

**Props:**
- `member: TeamMemberSummary` - Team member data
- `onPress?: () => void` - Card tap handler
- `onEdit?: () => void` - Edit button handler
- `onRemove?: () => void` - Remove button handler
- `showActions?: boolean` - Show/hide action buttons (default: true)
- `style?: ViewStyle` - Custom styles
- `testID?: string` - Test identifier

---

### 2. InvitationForm
Reusable form for inviting team members.

**Features:**
- Name, email, role fields
- Real-time validation
- Role selector with descriptions
- Loading states
- Error handling

**Usage:**
```tsx
import { InvitationForm } from '@/components/team';

<InvitationForm
  onSubmit={handleInvite}
  isLoading={isSubmitting}
  testID="invitation-form"
/>
```

**Props:**
- `onSubmit: (data: InviteTeamMemberRequest) => void` - Form submission handler
- `isLoading?: boolean` - Loading state
- `style?: ViewStyle` - Custom styles
- `testID?: string` - Test identifier

**Validation:**
- Email: Required, valid format
- Name: Required, min 2 characters
- Role: Required selection

---

### 3. RoleSelector
Dropdown selector for team member roles.

**Features:**
- 3 roles (admin, manager, staff)
- Role descriptions and permission counts
- Color-coded badges
- Modal picker interface
- Disabled state support

**Usage:**
```tsx
import { RoleSelector } from '@/components/team';

const [role, setRole] = useState<MerchantRole>('staff');

<RoleSelector
  value={role}
  onChange={setRole}
  disabled={false}
  error={validationError}
  testID="role-selector"
/>
```

**Props:**
- `value: Exclude<MerchantRole, 'owner'>` - Selected role
- `onChange: (role) => void` - Selection handler
- `disabled?: boolean` - Disable selector
- `error?: string` - Validation error message
- `style?: ViewStyle` - Custom styles
- `testID?: string` - Test identifier

**Roles:**
- **Admin** - 65 permissions - Full access
- **Manager** - 45 permissions - Products, orders, customers
- **Staff** - 20 permissions - Limited access

---

### 4. PermissionMatrix
Visual grid of all permissions by category.

**Features:**
- 16 permission categories
- 75+ individual permissions
- Search and filter
- Expandable/collapsible categories
- View-only or editable mode
- Permission counts per category

**Usage:**
```tsx
import { PermissionMatrix } from '@/components/team';

<PermissionMatrix
  role={currentRole}
  permissions={userPermissions}
  viewOnly={true}
  onPermissionChange={(permission, enabled) => {
    console.log(`${permission}: ${enabled}`);
  }}
  testID="permission-matrix"
/>
```

**Props:**
- `role: MerchantRole` - Current role
- `permissions: Permission[]` - Enabled permissions
- `viewOnly?: boolean` - Read-only mode (default: true)
- `onPermissionChange?: (permission, enabled) => void` - Toggle handler
- `style?: ViewStyle` - Custom styles
- `testID?: string` - Test identifier

**Categories:**
- Products, Orders, Team, Analytics, Settings
- Billing, Customers, Promotions, Reviews
- Notifications, Reports, Inventory, Categories
- Profile, Logs, API

---

### 5. RoleBadge
Color-coded role indicator badge.

**Features:**
- 4 roles with distinct colors
- 3 sizes (small, medium, large)
- Optional icon
- Role-specific styling

**Usage:**
```tsx
import { RoleBadge } from '@/components/team';

<RoleBadge
  role="admin"
  size="medium"
  showIcon={true}
  testID="role-badge"
/>
```

**Props:**
- `role: MerchantRole` - Role to display
- `size?: 'small' | 'medium' | 'large'` - Badge size (default: medium)
- `showIcon?: boolean` - Show role icon (default: false)
- `style?: ViewStyle` - Custom styles
- `testID?: string` - Test identifier

**Colors:**
- **Owner** - Purple (#7C3AED)
- **Admin** - Blue (#3B82F6)
- **Manager** - Green (#10B981)
- **Staff** - Gray (#6B7280)

---

### 6. MemberStatusBadge
Status indicator for team members.

**Features:**
- 4 statuses (active, inactive, suspended, pending)
- Color-coded indicators
- 2 sizes (small, medium)
- Optional status dot

**Usage:**
```tsx
import { MemberStatusBadge } from '@/components/team';

<MemberStatusBadge
  status="active"
  size="small"
  showIndicator={true}
  testID="status-badge"
/>
```

**Props:**
- `status: TeamMemberStatus | 'pending'` - Current status
- `size?: 'small' | 'medium'` - Badge size (default: medium)
- `showIndicator?: boolean` - Show status dot (default: true)
- `style?: ViewStyle` - Custom styles
- `testID?: string` - Test identifier

**Statuses:**
- **Active** - Green - Member is active
- **Inactive** - Gray - Member is inactive
- **Suspended** - Red - Member is suspended
- **Pending** - Yellow - Invitation pending

---

### 7. InvitationBadge
Invitation status with resend functionality.

**Features:**
- 3 statuses (pending, accepted, expired)
- Resend button for expired invitations
- Loading states
- Icon indicators

**Usage:**
```tsx
import { InvitationBadge } from '@/components/team';

<InvitationBadge
  status="expired"
  onResend={handleResend}
  isResending={isLoading}
  testID="invitation-badge"
/>
```

**Props:**
- `status: 'pending' | 'accepted' | 'expired'` - Invitation status
- `onResend?: () => void` - Resend handler (only for expired)
- `isResending?: boolean` - Resending loading state
- `style?: ViewStyle` - Custom styles
- `testID?: string` - Test identifier

---

### 8. PermissionToggle
Individual permission toggle control.

**Features:**
- Permission name and description
- Category-based icons
- Toggle switch
- Disabled state for view-only

**Usage:**
```tsx
import { PermissionToggle } from '@/components/team';

<PermissionToggle
  permission="products:edit"
  enabled={true}
  onChange={(enabled) => console.log(enabled)}
  disabled={false}
  description="Modify existing product details"
  testID="permission-toggle"
/>
```

**Props:**
- `permission: Permission` - Permission key
- `enabled: boolean` - Current state
- `onChange?: (enabled: boolean) => void` - Toggle handler
- `disabled?: boolean` - Disable toggle (default: false)
- `description?: string` - Permission description
- `style?: ViewStyle` - Custom styles
- `testID?: string` - Test identifier

---

### 9. ActivityTimeline
Activity log timeline display.

**Features:**
- Chronological activity feed
- Action type icons and colors
- Relative timestamps
- Activity details
- Performer information

**Usage:**
```tsx
import { ActivityTimeline } from '@/components/team';

<ActivityTimeline
  activities={activityLog}
  maxItems={10}
  testID="activity-timeline"
/>
```

**Props:**
- `activities: TeamActivity[]` - Activity log entries
- `maxItems?: number` - Limit displayed items
- `style?: ViewStyle` - Custom styles
- `testID?: string` - Test identifier

**Activity Types:**
- **Invite** - Blue - Invitation sent
- **Accept** - Green - Invitation accepted
- **Role Change** - Orange - Role updated
- **Status Change** - Indigo - Status updated
- **Remove** - Red - Member removed
- **Resend Invite** - Purple - Invitation resent

---

## Complete Example

```tsx
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import {
  TeamMemberCard,
  InvitationForm,
  RoleSelector,
  PermissionMatrix,
  RoleBadge,
  MemberStatusBadge,
  InvitationBadge,
  ActivityTimeline,
} from '@/components/team';

export default function TeamManagementScreen() {
  const [selectedRole, setSelectedRole] = useState('staff');
  const [teamMembers, setTeamMembers] = useState([]);

  const handleInvite = async (data) => {
    // Send invitation
    await teamApi.inviteTeamMember(data);
  };

  const handleRemove = async (memberId) => {
    // Remove member
    await teamApi.removeMember(memberId);
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      {/* Invitation Form */}
      <InvitationForm
        onSubmit={handleInvite}
        testID="invite-form"
      />

      {/* Team Members List */}
      {teamMembers.map((member) => (
        <TeamMemberCard
          key={member.id}
          member={member}
          onPress={() => navigateToDetails(member.id)}
          onEdit={() => handleEdit(member)}
          onRemove={() => handleRemove(member.id)}
        />
      ))}

      {/* Permission Matrix */}
      <PermissionMatrix
        role={currentUser.role}
        permissions={currentUser.permissions}
        viewOnly={true}
      />

      {/* Activity Timeline */}
      <ActivityTimeline
        activities={activities}
        maxItems={20}
      />
    </ScrollView>
  );
}
```

## Styling

All components use the theme system from `ThemeProvider`:
- Automatic dark/light mode support
- Consistent spacing and typography
- Color scheme integration
- Responsive design

## Accessibility

All components include:
- `testID` props for testing
- Proper touch targets (min 44x44)
- Screen reader support
- Keyboard navigation support
- Error states with ARIA labels

## Type Safety

All components are fully typed with TypeScript using types from `types/team.ts`:
- `TeamMember`, `TeamMemberSummary`
- `MerchantRole`, `TeamMemberStatus`
- `Permission`, `TeamActivity`
- `InviteTeamMemberRequest`

## Testing

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { TeamMemberCard } from '@/components/team';

test('TeamMemberCard calls onEdit when edit button pressed', () => {
  const onEdit = jest.fn();
  const { getByTestId } = render(
    <TeamMemberCard
      member={mockMember}
      onEdit={onEdit}
      testID="team-card"
    />
  );

  fireEvent.press(getByTestId('team-card-edit-button'));
  expect(onEdit).toHaveBeenCalled();
});
```

## Performance

Components are optimized for:
- Large lists (100+ team members)
- Fast rendering with memoization
- Efficient state updates
- Minimal re-renders

## Dependencies

- `react-native` - Core framework
- `@expo/vector-icons` - Icons (Ionicons)
- `types/team.ts` - Type definitions
- `ui/ThemeProvider` - Theme system
- `ui/DesignSystemComponents` - Base components
