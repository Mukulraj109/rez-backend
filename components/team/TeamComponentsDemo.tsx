/**
 * Team Components Demo
 *
 * This file demonstrates all team management components in action.
 * Use this as a reference for implementation or copy sections as needed.
 */

import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Heading2, Section } from '../ui/DesignSystemComponents';
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
} from './index';
import {
  TeamMemberSummary,
  MerchantRole,
  Permission,
  TeamActivity,
  InviteTeamMemberRequest,
} from '../../types/team';

// Mock Data
const mockTeamMembers: TeamMemberSummary[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    invitedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    acceptedAt: new Date(Date.now() - 86400000 * 29).toISOString(),
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'manager',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    invitedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    acceptedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: 'staff',
    status: 'active',
    invitedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    acceptedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: '4',
    name: 'Alice Williams',
    email: 'alice@example.com',
    role: 'staff',
    status: 'inactive',
    lastLoginAt: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
    invitedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    acceptedAt: new Date(Date.now() - 86400000 * 59).toISOString(),
  },
  {
    id: '5',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    role: 'manager',
    status: 'active',
    invitedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    // No acceptedAt - pending invitation
  },
];

const mockPermissions: Permission[] = [
  'products:view',
  'products:create',
  'products:edit',
  'orders:view',
  'orders:view_all',
  'orders:update_status',
  'customers:view',
  'analytics:view',
  'settings:view',
];

const mockActivities: TeamActivity[] = [
  {
    id: '1',
    merchantId: 'merchant-1',
    action: 'invite',
    targetUserId: '5',
    targetUserEmail: 'charlie@example.com',
    performedBy: '1',
    performedByName: 'John Doe',
    details: { role: 'manager' },
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '2',
    merchantId: 'merchant-1',
    action: 'role_change',
    targetUserId: '2',
    targetUserEmail: 'jane@example.com',
    performedBy: '1',
    performedByName: 'John Doe',
    details: { oldRole: 'staff', newRole: 'manager' },
    timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: '3',
    merchantId: 'merchant-1',
    action: 'accept',
    targetUserId: '3',
    targetUserEmail: 'bob@example.com',
    performedBy: '3',
    performedByName: 'Bob Johnson',
    details: { role: 'staff' },
    timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: '4',
    merchantId: 'merchant-1',
    action: 'status_change',
    targetUserId: '4',
    targetUserEmail: 'alice@example.com',
    performedBy: '1',
    performedByName: 'John Doe',
    details: { oldStatus: 'active', newStatus: 'inactive' },
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

export default function TeamComponentsDemo() {
  const [selectedRole, setSelectedRole] = useState<Exclude<MerchantRole, 'owner'>>('staff');
  const [isLoading, setIsLoading] = useState(false);

  // Handlers
  const handleInvite = async (data: InviteTeamMemberRequest) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      Alert.alert('Success', `Invitation sent to ${data.email}`);
      setIsLoading(false);
    }, 1500);
  };

  const handleEditMember = (member: TeamMemberSummary) => {
    Alert.alert('Edit Member', `Editing ${member.name}`);
  };

  const handleRemoveMember = (member: TeamMemberSummary) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive' },
      ]
    );
  };

  const handleViewDetails = (member: TeamMemberSummary) => {
    Alert.alert('Member Details', `Viewing details for ${member.name}`);
  };

  const handleResendInvitation = () => {
    Alert.alert('Resend', 'Invitation will be resent');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Role Badges Demo */}
      <Section title="Role Badges" subtitle="Color-coded role indicators">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <RoleBadge role="owner" size="small" showIcon />
          <RoleBadge role="admin" size="small" showIcon />
          <RoleBadge role="manager" size="small" showIcon />
          <RoleBadge role="staff" size="small" showIcon />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          <RoleBadge role="owner" size="medium" />
          <RoleBadge role="admin" size="medium" />
          <RoleBadge role="manager" size="medium" />
          <RoleBadge role="staff" size="medium" />
        </View>
      </Section>

      {/* Status Badges Demo */}
      <Section title="Status Badges" subtitle="Member status indicators">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <MemberStatusBadge status="active" size="small" />
          <MemberStatusBadge status="inactive" size="small" />
          <MemberStatusBadge status="suspended" size="small" />
          <MemberStatusBadge status="pending" size="small" />
        </View>
      </Section>

      {/* Invitation Badges Demo */}
      <Section title="Invitation Badges" subtitle="Invitation status with actions">
        <View style={{ gap: 8 }}>
          <InvitationBadge status="pending" />
          <InvitationBadge status="accepted" />
          <InvitationBadge
            status="expired"
            onResend={handleResendInvitation}
            isResending={false}
          />
        </View>
      </Section>

      {/* Role Selector Demo */}
      <Section title="Role Selector" subtitle="Choose team member role">
        <RoleSelector
          value={selectedRole}
          onChange={setSelectedRole}
          testID="demo-role-selector"
        />
      </Section>

      {/* Invitation Form Demo */}
      <Section title="Invitation Form" subtitle="Invite new team members">
        <InvitationForm
          onSubmit={handleInvite}
          isLoading={isLoading}
          testID="demo-invitation-form"
        />
      </Section>

      {/* Team Member Cards Demo */}
      <Section title="Team Member Cards" subtitle="Interactive member cards">
        <View style={{ gap: 12 }}>
          {mockTeamMembers.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              onPress={() => handleViewDetails(member)}
              onEdit={() => handleEditMember(member)}
              onRemove={() => handleRemoveMember(member)}
              showActions={true}
              testID={`team-card-${member.id}`}
            />
          ))}
        </View>
      </Section>

      {/* Permission Toggle Demo */}
      <Section title="Permission Toggle" subtitle="Individual permission controls">
        <View style={{ gap: 8 }}>
          <PermissionToggle
            permission="products:view"
            enabled={true}
            description="View all products in the catalog"
            testID="demo-permission-toggle"
          />
          <PermissionToggle
            permission="products:edit"
            enabled={false}
            description="Modify existing product details"
          />
          <PermissionToggle
            permission="orders:view_all"
            enabled={true}
            description="View all store orders"
          />
        </View>
      </Section>

      {/* Permission Matrix Demo */}
      <Section title="Permission Matrix" subtitle="Complete permissions overview">
        <View style={{ height: 500, backgroundColor: '#FFFFFF', borderRadius: 12 }}>
          <PermissionMatrix
            role="manager"
            permissions={mockPermissions}
            viewOnly={true}
            testID="demo-permission-matrix"
          />
        </View>
      </Section>

      {/* Activity Timeline Demo */}
      <Section title="Activity Timeline" subtitle="Recent team activities">
        <View style={{ height: 400, backgroundColor: '#FFFFFF', borderRadius: 12 }}>
          <ActivityTimeline
            activities={mockActivities}
            maxItems={10}
            testID="demo-activity-timeline"
          />
        </View>
      </Section>
    </ScrollView>
  );
}
