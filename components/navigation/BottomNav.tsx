import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { teamService } from '@/services/api/team';
import { canViewTeam } from '@/utils/teamHelpers';
import { useState, useEffect } from 'react';

const BOTTOM_NAV_HEIGHT = 60;

export const BottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const { permissions } = useAuth();
  const [teamCount, setTeamCount] = useState<number>(0);

  const hasTeamViewPermission = canViewTeam(permissions);
  const hasAnalyticsViewPermission = permissions?.includes('analytics:view') ?? true;
  const hasAuditViewPermission = permissions?.includes('logs:view') ?? false;

  useEffect(() => {
    if (hasTeamViewPermission) {
      loadTeamCount();
    }
  }, [hasTeamViewPermission]);

  const loadTeamCount = async () => {
    try {
      const response = await teamService.getTeamMembers();
      const total = response?.data?.total ?? response?.total ?? 0;
      setTeamCount(total);
    } catch (error) {
      // Set to 0 on error
    }
  };

  const navItems = [
    {
      name: 'Dashboard',
      route: '/(dashboard)',
      icon: 'home',
      iconOutline: 'home-outline',
      show: true,
    },
    {
      name: 'Products',
      route: '/(dashboard)/products',
      icon: 'cube',
      iconOutline: 'cube-outline',
      show: true,
    },
    {
      name: 'Orders',
      route: '/(dashboard)/orders',
      icon: 'receipt',
      iconOutline: 'receipt-outline',
      show: true,
    },
    {
      name: 'Cashback',
      route: '/(dashboard)/cashback',
      icon: 'gift',
      iconOutline: 'gift-outline',
      show: true,
    },
    {
      name: 'Analytics',
      route: '/(dashboard)/analytics',
      icon: 'bar-chart',
      iconOutline: 'bar-chart-outline',
      show: hasAnalyticsViewPermission,
    },
    {
      name: 'Team',
      route: '/(dashboard)/team',
      icon: 'people',
      iconOutline: 'people-outline',
      show: hasTeamViewPermission,
      badge: teamCount > 0 ? teamCount : undefined,
    },
    {
      name: 'Audit',
      route: '/(dashboard)/audit',
      icon: 'shield-checkmark',
      iconOutline: 'shield-checkmark-outline',
      show: hasAuditViewPermission,
    },
  ].filter(item => item.show);

  const isActive = (route: string) => {
    if (route === '/(dashboard)') {
      return pathname === '/(dashboard)' || pathname === '/(dashboard)/';
    }
    return pathname.startsWith(route);
  };

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      {navItems.map((item) => {
        const active = isActive(item.route);
        return (
          <TouchableOpacity
            key={item.name}
            style={styles.navItem}
            onPress={() => handleNavigate(item.route)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={active ? (item.icon as any) : (item.iconOutline as any)}
                size={24}
                color={active ? Colors[colorScheme ?? 'light'].primary : Colors[colorScheme ?? 'light'].tabIconDefault}
              />
              {item.badge && item.badge > 0 && (
                <View style={[styles.badge, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}>
                  <Text style={styles.badgeText}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: active
                    ? Colors[colorScheme ?? 'light'].primary
                    : Colors[colorScheme ?? 'light'].tabIconDefault,
                },
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: BOTTOM_NAV_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    paddingTop: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export const BOTTOM_NAV_HEIGHT_CONSTANT = BOTTOM_NAV_HEIGHT;

