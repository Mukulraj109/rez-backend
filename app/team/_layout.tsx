import React, { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { TeamProvider, useTeamContext } from '../../contexts/TeamContext';
import { useTeamAccess, useTeamStats } from '../../hooks/useTeam';

// ============================================================================
// TEAM ACCESS GUARD
// ============================================================================

/**
 * Component to check team access permissions
 * Redirects if user doesn't have access to team features
 */
function TeamAccessGuard({ children }: { children: React.ReactNode }) {
  const { canAccess, isLoading, shouldRedirect } = useTeamAccess();
  const segments = useSegments();

  useEffect(() => {
    // Only redirect if we're not loading and user shouldn't have access
    if (shouldRedirect && !isLoading) {
      console.warn('⚠️ User does not have team access, redirecting to dashboard');
      router.replace('/(dashboard)');
    }
  }, [shouldRedirect, isLoading]);

  // Show loading while checking permissions
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  // Show error if no access
  if (!canAccess) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorMessage}>
          You don't have permission to access team management.
        </Text>
        <Text style={styles.errorSubMessage}>
          Contact your account owner or administrator for access.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(dashboard)')}
        >
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // User has access, render children
  return <>{children}</>;
}

// ============================================================================
// TEAM HEADER
// ============================================================================

/**
 * Custom header for team screens
 * Shows team member count
 */
function TeamHeader() {
  const { totalMembers, isLoadingMembers } = useTeamContext();
  const stats = useTeamStats();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>Team</Text>
        {!isLoadingMembers && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{totalMembers}</Text>
          </View>
        )}
      </View>
      {!stats.isLoading && (
        <View style={styles.headerRight}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          {stats.pending > 0 && (
            <View style={[styles.statItem, styles.statItemPending]}>
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// TEAM LAYOUT (WITHOUT PROVIDER)
// ============================================================================

/**
 * Inner layout component that uses team context
 * This must be wrapped by TeamProvider
 */
function TeamLayoutContent() {
  return (
    <TeamAccessGuard>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#1F2937',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerShadowVisible: true,
          animation: 'slide_from_right',
        }}
      >
        {/* Team List Screen */}
        <Stack.Screen
          name="index"
          options={{
            headerTitle: () => <TeamHeader />,
            headerBackVisible: false,
            headerRight: () => (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push('/team/invite')}
              >
                <Text style={styles.headerButtonText}>+ Invite</Text>
              </TouchableOpacity>
            ),
          }}
        />

        {/* Invite Member Screen */}
        <Stack.Screen
          name="invite"
          options={{
            title: 'Invite Team Member',
            presentation: 'modal',
            headerRight: () => null,
          }}
        />

        {/* Team Member Detail Screen */}
        <Stack.Screen
          name="[memberId]"
          options={{
            title: 'Team Member',
            headerBackTitle: 'Team',
          }}
        />

        {/* Edit Member Screen */}
        <Stack.Screen
          name="edit/[memberId]"
          options={{
            title: 'Edit Team Member',
            presentation: 'modal',
          }}
        />

        {/* Permissions Overview Screen */}
        <Stack.Screen
          name="permissions"
          options={{
            title: 'Permissions',
            presentation: 'modal',
          }}
        />

        {/* Team Activity Log Screen */}
        <Stack.Screen
          name="activity"
          options={{
            title: 'Team Activity',
            headerBackTitle: 'Team',
          }}
        />
      </Stack>
    </TeamAccessGuard>
  );
}

// ============================================================================
// MAIN TEAM LAYOUT (WITH PROVIDER)
// ============================================================================

/**
 * Main layout for team screens
 * Wraps everything with TeamProvider
 */
export default function TeamLayout() {
  return (
    <TeamProvider>
      <TeamLayoutContent />
    </TeamProvider>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  errorSubMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    minWidth: 200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  badgeContainer: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },

  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statItemPending: {
    backgroundColor: '#FEF3C7',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },

  headerButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
