/**
 * ProtectedRoute Component
 * Route protection based on permissions
 * Redirects to unauthorized page if user doesn't have permission
 */

import React, { ReactNode, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRBAC, Action, Resource } from '../../hooks/useRBAC';
import { useHasPermission, useHasAnyPermission, useHasAllPermissions } from '../../hooks/usePermissions';
import { Permission, MerchantRole } from '../../types/team';

/**
 * Props for ProtectedRoute component
 */
interface ProtectedRouteProps {
  children: ReactNode;

  // Permission-based protection (choose one)
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // For permissions array

  // Resource-based protection (alternative to permission)
  resource?: Resource;
  action?: Action;

  // Role-based protection
  minRole?: MerchantRole;

  // Redirect configuration
  unauthorizedRedirect?: string; // Route to redirect to
  showUnauthorizedPage?: boolean; // Show unauthorized page instead of redirect

  // Custom unauthorized handler
  onUnauthorized?: () => void;

  // Loading configuration
  loadingComponent?: ReactNode;
}

/**
 * Default Loading Component
 */
const DefaultLoadingComponent: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3B82F6" />
    <Text style={styles.loadingText}>Loading permissions...</Text>
  </View>
);

/**
 * Default Unauthorized Component
 */
interface UnauthorizedPageProps {
  reason?: string;
  onGoBack: () => void;
}

const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({ reason, onGoBack }) => (
  <View style={styles.unauthorizedContainer}>
    <View style={styles.unauthorizedContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed" size={64} color="#EF4444" />
      </View>

      <Text style={styles.unauthorizedTitle}>Access Denied</Text>

      <Text style={styles.unauthorizedMessage}>
        {reason || 'You don\'t have permission to access this page.'}
      </Text>

      <Text style={styles.unauthorizedHint}>
        If you believe this is an error, please contact your administrator.
      </Text>

      <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  </View>
);

/**
 * ProtectedRoute Component
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  resource,
  action,
  minRole,
  unauthorizedRedirect = '/(tabs)',
  showUnauthorizedPage = true,
  onUnauthorized,
  loadingComponent,
}) => {
  const router = useRouter();
  const rbac = useRBAC();
  const hasPermission = useHasPermission(permission!);
  const hasAnyPermission = useHasAnyPermission(permissions || []);
  const hasAllPermissions = useHasAllPermissions(permissions || []);

  // Determine if user is authorized
  let authorized = false;
  let reason: string | undefined;

  // Show loading state while checking permissions
  if (rbac.isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return <DefaultLoadingComponent />;
  }

  // Check by single permission
  if (permission) {
    authorized = hasPermission;
    if (!authorized) {
      reason = `This page requires the "${permission}" permission.`;
    }
  }
  // Check by multiple permissions
  else if (permissions && permissions.length > 0) {
    authorized = requireAll ? hasAllPermissions : hasAnyPermission;
    if (!authorized) {
      reason = requireAll
        ? 'This page requires all of the specified permissions.'
        : 'This page requires at least one of the specified permissions.';
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
      reason = `This page requires at least "${minRole}" role. Your current role: "${rbac.role}".`;
    }
  }
  // If no protection specified, allow access
  else {
    authorized = true;
  }

  // Handle unauthorized access
  useEffect(() => {
    if (!authorized && !rbac.isLoading) {
      // Call custom handler if provided
      if (onUnauthorized) {
        onUnauthorized();
      }

      // Redirect if showUnauthorizedPage is false
      if (!showUnauthorizedPage) {
        router.replace(unauthorizedRedirect as any);
      }
    }
  }, [authorized, rbac.isLoading, onUnauthorized, showUnauthorizedPage, unauthorizedRedirect, router]);

  // Show unauthorized page
  if (!authorized) {
    if (showUnauthorizedPage) {
      return (
        <UnauthorizedPage
          reason={reason}
          onGoBack={() => router.back()}
        />
      );
    }

    // Return null while redirecting
    return null;
  }

  // Render children if authorized
  return <>{children}</>;
};

/**
 * ProtectedScreen - Higher-order component for screen protection
 */
interface ProtectedScreenProps extends ProtectedRouteProps {
  title?: string;
  description?: string;
}

export const ProtectedScreen: React.FC<ProtectedScreenProps> = ({
  title,
  description,
  children,
  ...protectionProps
}) => {
  return (
    <ProtectedRoute {...protectionProps}>
      <View style={styles.screenContainer}>
        {(title || description) && (
          <View style={styles.screenHeader}>
            {title && <Text style={styles.screenTitle}>{title}</Text>}
            {description && <Text style={styles.screenDescription}>{description}</Text>}
          </View>
        )}
        <View style={styles.screenContent}>{children}</View>
      </View>
    </ProtectedRoute>
  );
};

/**
 * ProtectedTab - Tab protection with fallback
 */
interface ProtectedTabProps extends ProtectedRouteProps {
  tabName: string;
  icon: string;
}

export const ProtectedTab: React.FC<ProtectedTabProps> = ({
  tabName,
  icon,
  children,
  ...protectionProps
}) => {
  const rbac = useRBAC();

  // Check if user has access
  let hasAccess = false;

  if (protectionProps.permission) {
    hasAccess = rbac.checkPermission(protectionProps.permission);
  } else if (protectionProps.resource && protectionProps.action) {
    hasAccess = rbac.canPerformAction(protectionProps.action, protectionProps.resource).authorized;
  } else if (protectionProps.minRole) {
    hasAccess = rbac.hasRoleLevel(protectionProps.minRole);
  } else {
    hasAccess = true;
  }

  // Don't render tab if no access
  if (!hasAccess) {
    return null;
  }

  return <ProtectedRoute {...protectionProps}>{children}</ProtectedRoute>;
};

/**
 * withProtection - HOC for route protection
 */
export const withProtection = (
  Component: React.ComponentType<any>,
  protectionConfig: Omit<ProtectedRouteProps, 'children'>
) => {
  return (props: any) => (
    <ProtectedRoute {...protectionConfig}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

/**
 * useRouteProtection - Hook for programmatic route protection
 */
export const useRouteProtection = (
  config: Omit<ProtectedRouteProps, 'children'>
): { authorized: boolean; isLoading: boolean; reason?: string } => {
  const rbac = useRBAC();
  const hasPermission = useHasPermission(config.permission!);
  const hasAnyPermission = useHasAnyPermission(config.permissions || []);
  const hasAllPermissions = useHasAllPermissions(config.permissions || []);

  let authorized = false;
  let reason: string | undefined;

  if (rbac.isLoading) {
    return { authorized: false, isLoading: true };
  }

  // Check authorization based on config
  if (config.permission) {
    authorized = hasPermission;
    if (!authorized) reason = 'Missing required permission';
  } else if (config.permissions && config.permissions.length > 0) {
    authorized = config.requireAll ? hasAllPermissions : hasAnyPermission;
    if (!authorized) reason = 'Missing required permissions';
  } else if (config.resource && config.action) {
    const result = rbac.canPerformAction(config.action, config.resource);
    authorized = result.authorized;
    reason = result.reason;
  } else if (config.minRole) {
    authorized = rbac.hasRoleLevel(config.minRole);
    if (!authorized) reason = 'Insufficient role level';
  } else {
    authorized = true;
  }

  return { authorized, isLoading: false, reason };
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },

  // Unauthorized styles
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  unauthorizedContent: {
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  unauthorizedTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  unauthorizedMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  unauthorizedHint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 150,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Screen styles
  screenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  screenHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  screenDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  screenContent: {
    flex: 1,
  },
});

/**
 * Export all components and utilities
 */
export default ProtectedRoute;
