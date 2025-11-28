# Team Components - Quick Reference

## Import
```typescript
import {
  TeamMemberCard,
  InvitationForm,
  RoleSelector,
  PermissionMatrix,
  RoleBadge,
  MemberStatusBadge,
  InvitationBadge,
  PermissionToggle,
  ActivityTimeline,
} from '@/components/team';
```

## Component Cheat Sheet

### 1. TeamMemberCard
```typescript
<TeamMemberCard
  member={teamMember}           // Required: TeamMemberSummary
  onPress={() => {}}            // Optional: Tap handler
  onEdit={() => {}}             // Optional: Edit button
  onRemove={() => {}}           // Optional: Remove button
  showActions={true}            // Optional: Show/hide actions
  testID="card"                 // Optional: Test ID
/>
```

### 2. InvitationForm
```typescript
<InvitationForm
  onSubmit={(data) => {}}       // Required: Submit handler
  isLoading={false}             // Optional: Loading state
  testID="form"                 // Optional: Test ID
/>
// Returns: { email, name, role }
```

### 3. RoleSelector
```typescript
<RoleSelector
  value={role}                  // Required: Current role
  onChange={(role) => {}}       // Required: Change handler
  disabled={false}              // Optional: Disabled
  error="Error message"         // Optional: Error text
  testID="selector"             // Optional: Test ID
/>
```

### 4. PermissionMatrix
```typescript
<PermissionMatrix
  role={userRole}               // Required: MerchantRole
  permissions={perms}           // Required: Permission[]
  viewOnly={true}               // Optional: Read-only
  onPermissionChange={(p, e) => {}} // Optional: Toggle handler
  testID="matrix"               // Optional: Test ID
/>
```

### 5. RoleBadge
```typescript
<RoleBadge
  role="admin"                  // Required: MerchantRole
  size="medium"                 // Optional: small|medium|large
  showIcon={false}              // Optional: Show icon
  testID="badge"                // Optional: Test ID
/>
```

### 6. MemberStatusBadge
```typescript
<MemberStatusBadge
  status="active"               // Required: Status
  size="medium"                 // Optional: small|medium
  showIndicator={true}          // Optional: Show dot
  testID="status"               // Optional: Test ID
/>
```

### 7. InvitationBadge
```typescript
<InvitationBadge
  status="pending"              // Required: Status
  onResend={() => {}}           // Optional: Resend handler
  isResending={false}           // Optional: Loading state
  testID="invite"               // Optional: Test ID
/>
```

### 8. PermissionToggle
```typescript
<PermissionToggle
  permission="products:edit"    // Required: Permission
  enabled={true}                // Required: Current state
  onChange={(enabled) => {}}    // Optional: Toggle handler
  disabled={false}              // Optional: Disabled
  description="Edit products"   // Optional: Description
  testID="toggle"               // Optional: Test ID
/>
```

### 9. ActivityTimeline
```typescript
<ActivityTimeline
  activities={activities}       // Required: TeamActivity[]
  maxItems={10}                 // Optional: Limit items
  testID="timeline"             // Optional: Test ID
/>
```

---

## Common Patterns

### Team List Screen
```typescript
{teamMembers.map((member) => (
  <TeamMemberCard
    key={member.id}
    member={member}
    onPress={() => navigate('MemberDetails', { id: member.id })}
    onEdit={() => setEditMember(member)}
    onRemove={() => confirmRemove(member.id)}
  />
))}
```

### Invite Modal
```typescript
<Modal visible={showInviteModal}>
  <InvitationForm
    onSubmit={async (data) => {
      await teamApi.invite(data);
      setShowInviteModal(false);
    }}
    isLoading={isSubmitting}
  />
</Modal>
```

### Role Editor
```typescript
const [role, setRole] = useState(member.role);

<RoleSelector
  value={role}
  onChange={setRole}
  error={errors.role}
/>

<Button
  title="Save"
  onPress={() => updateMemberRole(member.id, role)}
/>
```

### Permissions View
```typescript
<PermissionMatrix
  role={currentUser.role}
  permissions={currentUser.permissions}
  viewOnly={true}
/>
```

---

## Type Definitions

```typescript
// Team Member
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

// Roles
type MerchantRole = 'owner' | 'admin' | 'manager' | 'staff';

// Status
type TeamMemberStatus = 'active' | 'inactive' | 'suspended';

// Invitation
interface InviteTeamMemberRequest {
  email: string;
  name: string;
  role: Exclude<MerchantRole, 'owner'>;
}

// Permissions (75+ total)
type Permission =
  | 'products:view' | 'products:create' | 'products:edit'
  | 'orders:view' | 'orders:update_status'
  | 'team:view' | 'team:invite' | 'team:remove'
  // ... and 65+ more

// Activity
interface TeamActivity {
  id: string;
  action: 'invite' | 'accept' | 'role_change' | 'status_change' | 'remove';
  targetUserEmail: string;
  performedByName: string;
  details: Record<string, any>;
  timestamp: string;
}
```

---

## Styling

### Colors
- Owner: `#7C3AED` (Purple)
- Admin: `#3B82F6` (Blue)
- Manager: `#10B981` (Green)
- Staff: `#6B7280` (Gray)

### Sizes
- Small: 32px height
- Medium: 40px height
- Large: 48px height

---

## Validation Rules

### Email
- Required
- Valid format: `user@domain.com`
- Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

### Name
- Required
- Min length: 2 characters
- Max length: 100 characters

### Role
- Required
- One of: admin, manager, staff
- Cannot assign owner role

---

## API Integration

```typescript
// Invite member
const response = await teamApi.inviteTeamMember({
  email: 'user@example.com',
  name: 'John Doe',
  role: 'manager',
});

// Update role
await teamApi.updateMemberRole(memberId, { role: 'admin' });

// Remove member
await teamApi.removeMember(memberId);

// Get activities
const activities = await teamApi.getActivities();
```

---

## Testing

```typescript
import { render, fireEvent } from '@testing-library/react-native';

test('TeamMemberCard edit button', () => {
  const onEdit = jest.fn();
  const { getByTestId } = render(
    <TeamMemberCard member={mock} onEdit={onEdit} testID="card" />
  );

  fireEvent.press(getByTestId('card-edit-button'));
  expect(onEdit).toHaveBeenCalled();
});
```

---

## Error Handling

```typescript
try {
  await teamApi.inviteTeamMember(data);
  Alert.alert('Success', 'Invitation sent');
} catch (error) {
  Alert.alert('Error', error.message);
}
```

---

## Performance Tips

1. Use `React.memo` for list items
2. Implement virtualization for 100+ members
3. Debounce search in PermissionMatrix
4. Lazy load ActivityTimeline
5. Cache permission descriptions

---

## Accessibility

- All components have `testID` props
- Minimum 44x44 touch targets
- Color contrast ratio > 4.5:1
- Screen reader labels
- Keyboard navigation support

---

## Need Help?

- See `README.md` for detailed docs
- Check `TeamComponentsDemo.tsx` for examples
- Review `types/team.ts` for all types
- Consult `IMPLEMENTATION_SUMMARY.md` for overview
