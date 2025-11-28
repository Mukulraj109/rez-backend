# Team Management API - Quick Reference

## Service Methods at a Glance

### Team Members
```typescript
teamService.getTeamMembers(pagination?)        // List all team members
teamService.getTeamMember(userId)              // Get single member
teamService.getCurrentUserPermissions()        // Get own permissions
```

### Invitations
```typescript
teamService.inviteTeamMember(data)             // Send invitation
teamService.resendInvitation(userId)           // Resend invitation
teamService.validateInvitationToken(token)     // Public: Validate token
teamService.acceptInvitation(token, data)      // Public: Accept invitation
```

### Management
```typescript
teamService.updateTeamMemberRole(userId, data)     // Change role
teamService.updateTeamMemberStatus(userId, data)   // Change status
teamService.removeTeamMember(userId)               // Remove member
```

### Permissions
```typescript
teamService.checkPermission(permission)            // Single permission
teamService.checkMultiplePermissions(permissions)  // Multiple permissions
teamService.getRoleCapabilities(role)              // Role details
```

### Utilities
```typescript
teamService.getPermissionDescription(permission)   // Permission label
teamService.getRoleDescription(role)               // Role label
teamService.getAvailableRoles()                    // List assignable roles
teamService.validateInviteData(data)               // Validate before sending
teamService.formatRoleLabel(role)                  // Format role display
teamService.getStatusLabel(status)                 // Format status display
teamService.getStatusBadgeColor(status)            // Badge color
```

## Quick Examples

### Invite Someone
```typescript
const result = await teamService.inviteTeamMember({
  email: 'user@example.com',
  name: 'John Doe',
  role: 'manager'
});
```

### Accept Invitation (Public)
```typescript
await teamService.acceptInvitation(token, {
  password: 'secure123',
  confirmPassword: 'secure123'
});
```

### Check Permission
```typescript
const { hasPermission } = await teamService.checkPermission('team:invite');
if (hasPermission) {
  // Show invite button
}
```

### Get Role Capabilities
```typescript
const adminCaps = teamService.getRoleCapabilities('admin');
console.log(adminCaps.canManageProducts); // true
console.log(adminCaps.permissions); // Array of permissions
```

## Types Cheat Sheet

### Common Types
```typescript
MerchantRole     // 'owner' | 'admin' | 'manager' | 'staff'
TeamMemberStatus // 'active' | 'inactive' | 'suspended'
Permission       // 75+ permission strings

TeamMember       // Full member object
TeamMemberSummary // Basic member info
CurrentUserTeam  // Current user's role & permissions
```

### Request Types
```typescript
InviteTeamMemberRequest           // { email, name, role }
UpdateTeamMemberRoleRequest       // { role }
UpdateTeamMemberStatusRequest     // { status }
AcceptInvitationRequest           // { password, confirmPassword }
```

### Response Types
```typescript
InvitationResponse          // { success, message, invitationId, expiresAt }
ValidateInvitationResult    // { valid, invitation?, message? }
UpdateRoleResponse          // { success, message, data }
UpdateStatusResponse        // { success, message, data }
RemoveMemberResponse        // { success, message, data }
```

## Permission Categories (75+ Total)

### Products (6)
view, create, edit, delete, bulk_import, export

### Orders (6)
view, view_all, update_status, cancel, refund, export

### Team (5)
view, invite, remove, change_role, change_status

### Analytics (4)
view, view_revenue, view_costs, export

### Settings (3)
view, edit, edit_basic

### Billing (3)
view, manage, view_invoices

### Customers (4)
view, edit, delete, export

### Promotions (4)
view, create, edit, delete

### Reviews (3)
view, respond, delete

### Notifications (2)
view, send

### Reports (3)
view, export, view_detailed

### Inventory (3)
view, edit, bulk_update

### Categories (4)
view, create, edit, delete

### Profile (2)
view, edit

### Logs (2)
view, export

### API (2)
access, manage_keys

## Role Permission Counts

| Role | Permissions | Team | Products | Orders | Billing |
|------|:-----------|:-----|:---------|:-------|:--------|
| Owner | 75+ | ✓ | ✓ | ✓ | ✓ |
| Admin | 54 | ✓* | ✓ | ✓ | ✗ |
| Manager | 24 | ✗ | ✓ | ✓ | ✗ |
| Staff | 11 | ✗ | view | view | ✗ |

*Admin can view and manage team but can't change roles

## Status Values

- **active**: Member is fully active
- **inactive**: Member hasn't accepted invitation yet
- **suspended**: Member account is suspended (cannot login)

## Endpoint Reference

| Method | Endpoint | Permission | Returns |
|--------|----------|-----------|---------|
| GET | /api/merchant/team | team:view | TeamMembersListResponse |
| GET | /api/merchant/team/:userId | team:view | TeamMemberResponse |
| GET | /api/merchant/team/me/permissions | - | CurrentUserTeam |
| POST | /api/merchant/team/invite | team:invite | InvitationResponse |
| POST | /api/merchant/team/:userId/resend-invite | team:invite | ResendInvitationResponse |
| PUT | /api/merchant/team/:userId/role | team:change_role | UpdateRoleResponse |
| PUT | /api/merchant/team/:userId/status | team:change_status | UpdateStatusResponse |
| DELETE | /api/merchant/team/:userId | team:remove | RemoveMemberResponse |
| GET | /api/merchant/team-public/validate-invitation/:token | - | ValidateInvitationResult |
| POST | /api/merchant/team-public/accept-invitation/:token | - | AcceptInvitationResponse |

## Common Patterns

### Prevent Current User from Editing Themselves
```typescript
if (currentUserId === targetUserId) {
  // Show error: "Cannot modify your own account"
}
```

### Hide Options Based on Target Role
```typescript
const canEdit = teamService.canEditTeamMember(currentRole, targetRole);
if (!canEdit) {
  // Disable edit buttons
}
```

### Color-Coded Status Badges
```typescript
const color = teamService.getStatusBadgeColor(member.status);
// Returns: '#10b981' (green), '#f59e0b' (amber), or '#ef4444' (red)
```

### Format Data for Display
```typescript
const formatted = teamService.formatTeamMember(member);
// Adds: roleLabel property
```

### Validate Before Sending
```typescript
const { valid, errors } = teamService.validateInviteData(formData);
if (!valid) {
  errors.forEach(err => console.error(err));
}
```

## Common Error Scenarios

### Cannot Invite Owner
```
Invalid role. Can only invite admin, manager, or staff
```

### Cannot Change Owner Role
```
Cannot change role of owner
```

### Cannot Remove Owner
```
Cannot remove owner
```

### Cannot Suspend Yourself
```
Cannot change your own status
```

### Cannot Remove Yourself
```
Cannot remove yourself
```

### Invalid Token
```
Invalid invitation token
```

### Password Mismatch
```
Passwords do not match
```

## Setup Checklist

- [ ] Import teamService where needed
- [ ] Add permission checks to components
- [ ] Create team management UI components
- [ ] Implement error handling with toast/alerts
- [ ] Add loading states for async operations
- [ ] Test all role transitions
- [ ] Verify permission checks work correctly
- [ ] Test invitation acceptance flow
- [ ] Verify email delivery in production
- [ ] Document for team members

## File Locations

```
types/team.ts                          # Type definitions
services/api/team.ts                   # Service implementation
TEAM_API_IMPLEMENTATION_GUIDE.md        # Full documentation
TEAM_API_QUICK_REFERENCE.md             # This file
```

## Related Services/Features

- **authService** - Authentication management
- **storageService** - Local data persistence
- **apiClient** - HTTP client with interceptors
- **Error handling** - Toast notifications
- **Loading states** - UI skeleton loaders
- **Form validation** - Input validation utilities
