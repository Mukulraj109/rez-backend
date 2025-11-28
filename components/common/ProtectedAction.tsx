/**
 * ProtectedAction Component
 * Component wrapper for permission-protected actions
 * Only renders children if user has required permissions
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRBAC, Action, Resource } from '../../hooks/useRBAC';
import { useHasPermission, useHasAnyPermission, useHasAllPermissions } from '../../hooks/usePermissions';
import { Permission, MerchantRole } from '../../types/team';

/**
 * Props for ProtectedAction component
 */
interface ProtectedActionProps {
  children: ReactNode;

  // Permission-based protection (choose one)
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // For permissions array - require all or any

  // Resource-based protection (alternative to permission)
  resource?: Resource;
  action?: Action;

  // Role-based protection
  minRole?: MerchantRole;

  // Fallback UI
  fallback?: ReactNode;
  showFallback?: boolean; // If false, renders nothing when unauthorized

  // Custom unauthorized handler
  onUnauthorized?: () => void;

  // Style
  style?: any;
}

/**
 * Default fallback component
 */
const DefaultFallback: React.FC<{ reason?: string }> = ({ reason }) => (
  <View style={styles.fallbackContainer}>
    <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
    <Text style={styles.fallbackText}>
      {reason || 'You don\'t have permission to access this'}
    </Text>
  </View>
);

/**
 * ProtectedAction Component
 */
export const ProtectedAction: React.FC<ProtectedActionProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  resource,
  action,
  minRole,
  fallback,
  showFallback = true,
  onUnauthorized,
  style,
}) => {
  const rbac = useRBAC();
  const hasPermission = useHasPermission(permission!);
  const hasAnyPermission = useHasAnyPermission(permissions || []);
  const hasAllPermissions = useHasAllPermissions(permissions || []);

  // Determine if user is authorized
  let authorized = false;
  let reason: string | undefined;

  // Check loading state
  if (rbac.isLoading) {
    return showFallback ? <DefaultFallback reason="Loading permissions..." /> : null;
  }

  // Check by single permission
  if (permission) {
    authorized = hasPermission;
    if (!authorized) {
      reason = `You don't have permission: ${permission}`;
    }
  }
  // Check by multiple permissions
  else if (permissions && permissions.length > 0) {
    authorized = requireAll ? hasAllPermissions : hasAnyPermission;
    if (!authorized) {
      reason = requireAll
        ? 'You don\'t have all required permissions'
        : 'You don\'t have any of the required permissions';
    }
  }
  // Check by resource and action
  else if (resource && action) {
    const result = rbac.canPerformAction(action, resource);
    authorized = result.authorized;
    reason = result.reason;
  }
  // Check by minimum role
  else if (minRole) {
    authorized = rbac.hasRoleLevel(minRole);
    if (!authorized) {
      reason = `Minimum role required: ${minRole}`;
    }
  }
  // If no protection specified, allow access
  else {
    authorized = true;
  }

  // Handle unauthorized access
  if (!authorized) {
    if (onUnauthorized) {
      onUnauthorized();
    }

    if (!showFallback) {
      return null;
    }

    if (fallback) {
      return <View style={style}>{fallback}</View>;
    }

    return <DefaultFallback reason={reason} />;
  }

  // Render children if authorized
  return <View style={style}>{children}</View>;
};

/**
 * ProtectedButton - Button that's only visible/enabled with permission
 */
interface ProtectedButtonProps extends ProtectedActionProps {
  onPress: () => void;
  title: string;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const ProtectedButton: React.FC<ProtectedButtonProps> = ({
  onPress,
  title,
  icon,
  disabled = false,
  loading = false,
  variant = 'primary',
  ...protectionProps
}) => {
  return (
    <ProtectedAction {...protectionProps} showFallback={false}>
      <TouchableOpacity
        style={[
          styles.button,
          variant === 'primary' && styles.buttonPrimary,
          variant === 'secondary' && styles.buttonSecondary,
          variant === 'danger' && styles.buttonDanger,
          (disabled || loading) && styles.buttonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {icon && <Ionicons name={icon as any} size={20} color="#fff" style={styles.buttonIcon} />}
        <Text style={styles.buttonText}>{loading ? 'Loading...' : title}</Text>
      </TouchableOpacity>
    </ProtectedAction>
  );
};

/**
 * ProtectedSection - Section that's only visible with permission
 */
interface ProtectedSectionProps extends ProtectedActionProps {
  title?: string;
  description?: string;
}

export const ProtectedSection: React.FC<ProtectedSectionProps> = ({
  title,
  description,
  children,
  ...protectionProps
}) => {
  return (
    <ProtectedAction {...protectionProps} showFallback={false}>
      <View style={styles.section}>
        {title && <Text style={styles.sectionTitle}>{title}</Text>}
        {description && <Text style={styles.sectionDescription}>{description}</Text>}
        <View style={styles.sectionContent}>{children}</View>
      </View>
    </ProtectedAction>
  );
};

/**
 * ProtectedFeature - Feature flag component
 */
interface ProtectedFeatureProps extends ProtectedActionProps {
  featureName: string;
  beta?: boolean;
}

export const ProtectedFeature: React.FC<ProtectedFeatureProps> = ({
  featureName,
  beta = false,
  children,
  ...protectionProps
}) => {
  return (
    <ProtectedAction {...protectionProps} showFallback={false}>
      <View style={styles.feature}>
        <View style={styles.featureHeader}>
          <Text style={styles.featureName}>{featureName}</Text>
          {beta && (
            <View style={styles.betaBadge}>
              <Text style={styles.betaText}>BETA</Text>
            </View>
          )}
        </View>
        {children}
      </View>
    </ProtectedAction>
  );
};

/**
 * ConditionalRender - Render different content based on permission
 */
interface ConditionalRenderProps extends Omit<ProtectedActionProps, 'fallback' | 'children'> {
  authorized: ReactNode;
  unauthorized: ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  authorized,
  unauthorized,
  ...protectionProps
}) => {
  return (
    <ProtectedAction {...protectionProps} fallback={unauthorized} showFallback={true}>
      {authorized}
    </ProtectedAction>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  fallbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fallbackText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Button styles
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonPrimary: {
    backgroundColor: '#3B82F6',
  },
  buttonSecondary: {
    backgroundColor: '#6B7280',
  },
  buttonDanger: {
    backgroundColor: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Section styles
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  sectionContent: {
    // Content styling
  },

  // Feature styles
  feature: {
    marginVertical: 8,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  betaBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FCD34D',
    borderRadius: 4,
  },
  betaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
});

/**
 * Export all components
 */
export default ProtectedAction;
