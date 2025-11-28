import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { teamService } from '@/services/api/team';
import { canViewTeam } from '@/utils/teamHelpers';
import { StoreSelector } from '@/components/stores/StoreSelector';

export default function DashboardLayout() {
  const colorScheme = useColorScheme();
  const { logout, permissions } = useAuth();
  const [teamCount, setTeamCount] = useState<number>(0);

  // Check if user can view team
  const hasTeamViewPermission = canViewTeam(permissions);

  // Check if user can view analytics
  const hasAnalyticsViewPermission = permissions?.includes('analytics:view') ?? true;

  // Check if user can view audit logs
  const hasAuditViewPermission = permissions?.includes('logs:view') ?? false;

  // Load team count
  useEffect(() => {
    if (hasTeamViewPermission) {
      loadTeamCount();
    }
  }, [hasTeamViewPermission]);

  const loadTeamCount = async () => {
    try {
      const response = await teamService.getTeamMembers();
      // Handle response structure: response.data contains { teamMembers, total }
      const total = (response?.data as any)?.total ?? (response as any)?.total ?? 0;
      setTeamCount(total);
    } catch (error) {
      console.error('Failed to load team count:', error);
      setTeamCount(0); // Set to 0 on error
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          height: 70,
          paddingBottom: -9,
          paddingTop: 0,
          elevation: 16,
          shadowColor: '#7C3AED',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 5,
          gap: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        headerShown: true,
        headerTransparent: false,
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerBackground: () => (
          <LinearGradient
            colors={['#7C3AED', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        ),
        headerTintColor: 'white',
        headerLeft: () => (
          <View style={localStyles.headerLeft}>
            <StoreSelector compact />
          </View>
        ),
        headerRight: () => (
          <View style={localStyles.headerRight}>
            <TouchableOpacity 
              onPress={handleLogout}
              style={localStyles.logoutButton}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        ),
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          letterSpacing: 0.3,
          marginLeft: 8,
        },
        headerLeftContainerStyle: {
          paddingLeft: 12,
          maxWidth: '50%',
        },
        headerRightContainerStyle: {
          paddingRight: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'cube' : 'cube-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'receipt' : 'receipt-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cashback"
        options={{
          title: 'Cashback',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'gift' : 'gift-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          href: hasAnalyticsViewPermission ? '/(dashboard)/analytics' : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bar-chart' : 'bar-chart-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          href: hasTeamViewPermission ? '/(dashboard)/team' : null,
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={24}
                color={color}
              />
              {teamCount > 0 && (
                <View style={[styles.badge, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}>
                  <Text style={styles.badgeText}>
                    {teamCount > 99 ? '99+' : teamCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Audit',
          href: hasAuditViewPermission ? '/(dashboard)/audit' : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const localStyles = StyleSheet.create({
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
});

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});