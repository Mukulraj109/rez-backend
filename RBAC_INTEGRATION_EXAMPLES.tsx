/**
 * RBAC Integration Examples
 * Real-world examples of RBAC implementation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import RBAC hooks
import {
  usePermissions,
  useHasPermission,
  useHasAnyPermission,
  useIsOwner,
  useIsAdmin,
  useRole,
  usePermissionHelpers,
  useTeamPermissions,
} from './hooks/usePermissions';

import { useRBAC, useResourceRBAC } from './hooks/useRBAC';

// Import protection components
import {
  ProtectedAction,
  ProtectedButton,
  ProtectedSection,
  ProtectedFeature,
  ConditionalRender,
} from './components/common/ProtectedAction';

import {
  ProtectedRoute,
  ProtectedScreen,
  useRouteProtection,
} from './components/common/ProtectedRoute';

// ============================================================================
// EXAMPLE 1: Product Management Screen
// ============================================================================

export function ProductManagementScreen() {
  const { canView, canCreate, canEdit, canDelete, canExport } = usePermissionHelpers();
  const productPerms = useResourceRBAC('products');

  return (
    <ProtectedRoute permission="products:view">
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Product Management</Text>

        {/* Create Section - Only for users with create permission */}
        <ProtectedSection permission="products:create" title="Add New Product">
          <ProductForm />
        </ProtectedSection>

        {/* Product List - Visible to all */}
        {productPerms.canView && (
          <View style={styles.section}>
            <ProductList />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <ProtectedButton
            permission="products:create"
            title="Add Product"
            onPress={() => Alert.alert('Create Product')}
            icon="add-circle"
            variant="primary"
          />

          <ProtectedButton
            permission="products:bulk_import"
            title="Bulk Import"
            onPress={() => Alert.alert('Bulk Import')}
            icon="cloud-upload"
            variant="secondary"
          />

          <ProtectedButton
            permission="products:export"
            title="Export"
            onPress={() => Alert.alert('Export')}
            icon="download"
            variant="secondary"
          />
        </View>

        {/* Advanced Features - Only for admin+ */}
        <ProtectedFeature
          featureName="Advanced Product Settings"
          minRole="admin"
        >
          <AdvancedProductSettings />
        </ProtectedFeature>
      </ScrollView>
    </ProtectedRoute>
  );
}

// ============================================================================
// EXAMPLE 2: Order Management with Conditional Actions
// ============================================================================

interface Order {
  id: string;
  status: string;
  total: number;
  customer: string;
}

export function OrderCard({ order }: { order: Order }) {
  const { canEdit, canDelete } = usePermissionHelpers();
  const canUpdateStatus = useHasPermission('orders:update_status');
  const canCancel = useHasPermission('orders:cancel');
  const canRefund = useHasPermission('orders:refund');

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Order #{order.id}</Text>
      <Text>Status: {order.status}</Text>
      <Text>Total: ${order.total}</Text>
      <Text>Customer: {order.customer}</Text>

      <View style={styles.cardActions}>
        {/* Update Status - Most common, shown to staff+ */}
        {canUpdateStatus && (
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="refresh" size={20} color="#3B82F6" />
            <Text>Update Status</Text>
          </TouchableOpacity>
        )}

        {/* Cancel - Requires manager+ */}
        {canCancel && (
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="close-circle" size={20} color="#F59E0B" />
            <Text>Cancel</Text>
          </TouchableOpacity>
        )}

        {/* Refund - Requires admin+ */}
        {canRefund && (
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="cash" size={20} color="#EF4444" />
            <Text>Refund</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// EXAMPLE 3: Team Management Screen
// ============================================================================

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
}

export function TeamManagementScreen() {
  const {
    canViewTeam,
    canInviteMembers,
    canRemoveMembers,
    canChangeRoles,
    canEditMember,
  } = useTeamPermissions();

  const members: TeamMember[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'owner' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'admin' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'staff' },
  ];

  return (
    <ProtectedScreen
      permission="team:view"
      title="Team Management"
      description="Manage your team members and their roles"
    >
      <ScrollView>
        {/* Invite Section */}
        <ProtectedAction permission="team:invite">
          <View style={styles.inviteSection}>
            <Text style={styles.sectionTitle}>Invite Team Member</Text>
            <InviteForm />
          </View>
        </ProtectedAction>

        {/* Team Members List */}
        <View style={styles.teamList}>
          {members.map(member => (
            <View key={member.id} style={styles.teamMemberCard}>
              <View>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberEmail}>{member.email}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>

              <View style={styles.memberActions}>
                {/* Edit button - only if user can edit this member */}
                {canEditMember(member.role) && (
                  <TouchableOpacity>
                    <Ionicons name="create" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                )}

                {/* Remove button - only if can remove and can edit this member */}
                {canRemoveMembers && canEditMember(member.role) && (
                  <TouchableOpacity>
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ProtectedScreen>
  );
}

// ============================================================================
// EXAMPLE 4: Dashboard with Role-Based Widgets
// ============================================================================

export function DashboardScreen() {
  const { role, uiVisibility } = useRBAC();
  const isOwner = useIsOwner();
  const isAdmin = useIsAdmin();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard ({role})</Text>

      {/* Stats visible to all */}
      <View style={styles.statsRow}>
        <StatCard title="Products" value="150" icon="cube" />
        <StatCard title="Orders" value="45" icon="cart" />
      </View>

      {/* Financial stats - only for roles with financial access */}
      {uiVisibility.showFinancialData && (
        <View style={styles.statsRow}>
          <StatCard title="Revenue" value="$12,450" icon="cash" />
          <StatCard title="Profit" value="$8,320" icon="trending-up" />
        </View>
      )}

      {/* Analytics Section - Conditional on permission */}
      <ConditionalRender
        permission="analytics:view"
        authorized={
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analytics</Text>
            <AnalyticsChart />
          </View>
        }
        unauthorized={
          <View style={styles.lockedSection}>
            <Ionicons name="lock-closed" size={32} color="#9CA3AF" />
            <Text>Upgrade to view analytics</Text>
          </View>
        }
      />

      {/* Team Overview - Admin+ only */}
      {(isOwner || isAdmin) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Overview</Text>
          <TeamSummary />
        </View>
      )}

      {/* Billing Section - Owner only */}
      <ProtectedSection permission="billing:view" title="Billing">
        <BillingOverview />
      </ProtectedSection>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <ActivityFeed />
      </View>
    </ScrollView>
  );
}

// ============================================================================
// EXAMPLE 5: Settings Screen with Nested Protection
// ============================================================================

export function SettingsScreen() {
  const { permissions } = usePermissions();
  const canEditBasic = useHasPermission('settings:edit_basic');
  const canEditAll = useHasPermission('settings:edit');

  return (
    <ProtectedRoute permission="settings:view">
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Settings</Text>

        {/* Basic Settings - Staff can view, Manager+ can edit */}
        <View style={styles.settingsGroup}>
          <Text style={styles.settingsGroupTitle}>Store Information</Text>

          <ProtectedAction permission="settings:edit_basic">
            <SettingItem
              label="Store Name"
              value="My Store"
              editable={canEditBasic}
            />
            <SettingItem
              label="Store Description"
              value="Best products"
              editable={canEditBasic}
            />
          </ProtectedAction>
        </View>

        {/* Advanced Settings - Admin+ only */}
        <ProtectedSection permission="settings:edit" title="Advanced Settings">
          <SettingItem
            label="API Endpoint"
            value="api.example.com"
            editable={canEditAll}
          />
          <SettingItem
            label="Webhook URL"
            value="webhook.example.com"
            editable={canEditAll}
          />
        </ProtectedSection>

        {/* Danger Zone - Owner only */}
        <ProtectedSection minRole="owner" title="Danger Zone">
          <View style={styles.dangerZone}>
            <Text style={styles.dangerText}>Delete Account</Text>
            <TouchableOpacity style={styles.dangerButton}>
              <Text style={styles.dangerButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </ProtectedSection>
      </ScrollView>
    </ProtectedRoute>
  );
}

// ============================================================================
// EXAMPLE 6: Navigation with Role-Based Menu Items
// ============================================================================

export function MainNavigation() {
  const { uiVisibility, role } = useRBAC();
  const hasFinancialAccess = useHasAnyPermission([
    'analytics:view_revenue',
    'billing:view',
  ]);

  const menuItems = [
    // Always visible
    { label: 'Dashboard', icon: 'home', route: '/dashboard', show: true },

    // Conditional items based on permissions
    { label: 'Products', icon: 'cube', route: '/products', show: uiVisibility.showProducts },
    { label: 'Orders', icon: 'cart', route: '/orders', show: uiVisibility.showOrders },
    { label: 'Customers', icon: 'people', route: '/customers', show: uiVisibility.showCustomers },
    { label: 'Analytics', icon: 'analytics', route: '/analytics', show: uiVisibility.showAnalytics },
    { label: 'Reports', icon: 'document-text', route: '/reports', show: uiVisibility.showReports },
    { label: 'Team', icon: 'people-circle', route: '/team', show: uiVisibility.showTeam },
    { label: 'Settings', icon: 'settings', route: '/settings', show: uiVisibility.showSettings },

    // Financial items (conditional)
    { label: 'Billing', icon: 'card', route: '/billing', show: hasFinancialAccess },

    // Owner only items
    { label: 'Logs', icon: 'list', route: '/logs', show: role === 'owner' },
  ];

  return (
    <View style={styles.navigation}>
      {menuItems.filter(item => item.show).map(item => (
        <TouchableOpacity key={item.route} style={styles.navItem}>
          <Ionicons name={item.icon as any} size={24} color="#3B82F6" />
          <Text style={styles.navLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// EXAMPLE 7: Bulk Actions with Permission Checks
// ============================================================================

export function ProductBulkActions({ selectedProducts }: { selectedProducts: string[] }) {
  const { authorize } = useRBAC();

  const handleBulkDelete = () => {
    const authorized = authorize('products:delete', {
      onUnauthorized: () => {
        Alert.alert(
          'Permission Denied',
          'You do not have permission to delete products.'
        );
      },
    });

    if (authorized) {
      Alert.alert('Delete Products', `Delete ${selectedProducts.length} products?`);
    }
  };

  const handleBulkExport = () => {
    const authorized = authorize('products:export', {
      onUnauthorized: () => {
        Alert.alert(
          'Permission Denied',
          'You do not have permission to export products.'
        );
      },
    });

    if (authorized) {
      Alert.alert('Export', 'Exporting products...');
    }
  };

  return (
    <View style={styles.bulkActions}>
      <Text>{selectedProducts.length} selected</Text>

      <ProtectedButton
        permission="products:edit"
        title="Edit"
        onPress={() => Alert.alert('Edit')}
        icon="create"
      />

      <ProtectedButton
        permission="products:delete"
        title="Delete"
        onPress={handleBulkDelete}
        icon="trash"
        variant="danger"
      />

      <ProtectedButton
        permission="products:export"
        title="Export"
        onPress={handleBulkExport}
        icon="download"
      />
    </View>
  );
}

// ============================================================================
// EXAMPLE 8: Form with Permission-Based Field Visibility
// ============================================================================

export function ProductEditForm({ product }: { product: any }) {
  const { canEdit } = usePermissionHelpers();
  const canEditPrice = useHasPermission('products:edit');
  const canDelete = useHasPermission('products:delete');

  return (
    <View style={styles.form}>
      {/* Basic fields - visible to all who can view */}
      <FormField label="Product Name" value={product.name} editable={canEdit('products')} />
      <FormField label="Description" value={product.description} editable={canEdit('products')} />

      {/* Price field - only editable by manager+ */}
      <ProtectedAction permission="products:edit">
        <FormField label="Price" value={product.price} editable={canEditPrice} />
      </ProtectedAction>

      {/* Cost field - only visible to admin+ (sensitive data) */}
      <ProtectedAction permission="analytics:view_costs">
        <FormField label="Cost" value={product.cost} editable={canEditPrice} />
      </ProtectedAction>

      {/* Action buttons */}
      <View style={styles.formActions}>
        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>

        <ProtectedButton
          permission="products:delete"
          title="Delete"
          onPress={() => Alert.alert('Delete')}
          variant="danger"
        />
      </View>
    </View>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function ProductForm() {
  return <View><Text>Product Form</Text></View>;
}

function ProductList() {
  return <View><Text>Product List</Text></View>;
}

function AdvancedProductSettings() {
  return <View><Text>Advanced Settings</Text></View>;
}

function InviteForm() {
  return <View><Text>Invite Form</Text></View>;
}

function AnalyticsChart() {
  return <View><Text>Analytics Chart</Text></View>;
}

function TeamSummary() {
  return <View><Text>Team Summary</Text></View>;
}

function BillingOverview() {
  return <View><Text>Billing Overview</Text></View>;
}

function ActivityFeed() {
  return <View><Text>Activity Feed</Text></View>;
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={32} color="#3B82F6" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function SettingItem({ label, value, editable }: { label: string; value: string; editable: boolean }) {
  return (
    <View style={styles.settingItem}>
      <Text>{label}</Text>
      <Text>{value}</Text>
      {editable && <Ionicons name="create" size={20} color="#3B82F6" />}
    </View>
  );
}

function FormField({ label, value, editable }: { label: string; value: any; editable: boolean }) {
  return (
    <View style={styles.formField}>
      <Text>{label}</Text>
      <Text>{value}</Text>
      {editable && <Text>(editable)</Text>}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  card: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inviteSection: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  teamList: {
    marginTop: 16,
  },
  teamMemberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  memberRole: {
    fontSize: 12,
    color: '#3B82F6',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  lockedSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  settingsGroup: {
    marginBottom: 24,
  },
  settingsGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dangerZone: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 8,
  },
  dangerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
  },
  dangerButton: {
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  navItem: {
    alignItems: 'center',
    padding: 12,
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  bulkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F3F4F6',
  },
  form: {
    padding: 16,
  },
  formField: {
    marginBottom: 16,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
