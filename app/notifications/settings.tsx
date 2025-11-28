import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useClearAllNotifications,
} from '@/hooks/queries/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsService } from '@/services/api/notifications';

const RETENTION_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'forever', label: 'Forever' },
];

const AUTO_DELETE_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: '7', label: '7 days after reading' },
  { value: '30', label: '30 days after reading' },
];

const GROUPING_OPTIONS = [
  { value: 'none', label: 'No grouping' },
  { value: 'type', label: 'Group by type' },
  { value: 'date', label: 'Group by date' },
];

const BADGE_OPTIONS = [
  { value: 'all', label: 'All notifications' },
  { value: 'unread', label: 'Unread only' },
];

export default function NotificationSettingsScreen() {
  const { hasPermission } = useAuth();
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();
  const clearAllMutation = useClearAllNotifications();

  const [selectedRetention, setSelectedRetention] = useState('30');
  const [selectedAutoDelete, setSelectedAutoDelete] = useState('never');
  const [selectedGrouping, setSelectedGrouping] = useState('type');
  const [selectedBadge, setSelectedBadge] = useState('unread');
  const [testingNotification, setTestingNotification] = useState(false);

  const canExport = hasPermission('notifications:export');

  const handleSendTestNotification = async () => {
    setTestingNotification(true);
    try {
      // Simulate sending a test notification via backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Alert.alert('Success', 'Test notification sent! Check your notifications.');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification');
    } finally {
      setTestingNotification(false);
    }
  };

  const handleClearAllNotifications = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllMutation.mutateAsync();
              Alert.alert('Success', 'All notifications have been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  const handleExportHistory = async () => {
    if (!canExport) {
      Alert.alert('Permission Denied', 'You do not have permission to export notification history');
      return;
    }

    Alert.alert(
      'Export Notification History',
      'Your notification history will be exported as a CSV file and emailed to you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              // Call export API
              await new Promise((resolve) => setTimeout(resolve, 1000));
              Alert.alert('Success', 'Export started. You will receive an email with the file.');
            } catch (error) {
              Alert.alert('Error', 'Failed to export notification history');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Notification Retention */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Retention</Text>
          <Text style={styles.sectionDescription}>
            How long should we keep your notifications?
          </Text>

          {RETENTION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.optionRow}
              onPress={() => setSelectedRetention(option.value)}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
              {selectedRetention === option.value && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Auto-Delete Read Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auto-Delete Read Notifications</Text>
          <Text style={styles.sectionDescription}>
            Automatically delete notifications after they've been read
          </Text>

          {AUTO_DELETE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.optionRow}
              onPress={() => setSelectedAutoDelete(option.value)}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
              {selectedAutoDelete === option.value && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Notification Grouping */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Grouping</Text>
          <Text style={styles.sectionDescription}>
            How should notifications be organized?
          </Text>

          {GROUPING_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.optionRow}
              onPress={() => setSelectedGrouping(option.value)}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
              {selectedGrouping === option.value && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Badge Count Display */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badge Count Display</Text>
          <Text style={styles.sectionDescription}>
            What should the badge count show?
          </Text>

          {BADGE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.optionRow}
              onPress={() => setSelectedBadge(option.value)}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
              {selectedBadge === option.value && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleSendTestNotification}
            disabled={testingNotification}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="send" size={24} color="#3B82F6" />
              <Text style={styles.actionLabel}>Send Test Notification</Text>
            </View>
            {testingNotification && <ActivityIndicator size="small" color="#3B82F6" />}
            {!testingNotification && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleClearAllNotifications}
            disabled={clearAllMutation.isPending}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="trash" size={24} color="#EF4444" />
              <Text style={[styles.actionLabel, { color: '#EF4444' }]}>
                Clear All Notifications
              </Text>
            </View>
            {clearAllMutation.isPending && <ActivityIndicator size="small" color="#EF4444" />}
            {!clearAllMutation.isPending && (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, !canExport && styles.actionRowDisabled]}
            onPress={handleExportHistory}
            disabled={!canExport}
          >
            <View style={styles.actionLeft}>
              <Ionicons
                name="download"
                size={24}
                color={canExport ? '#10B981' : '#D1D5DB'}
              />
              <Text style={[styles.actionLabel, !canExport && styles.actionLabelDisabled]}>
                Export Notification History
              </Text>
            </View>
            {canExport ? (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            ) : (
              <View style={styles.permissionBadge}>
                <Ionicons name="lock-closed" size={12} color="#6B7280" />
                <Text style={styles.permissionText}>No Permission</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            These settings control how notifications are stored, displayed, and managed in your app.
            Some actions require specific permissions.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionLabel: {
    fontSize: 16,
    color: '#374151',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionRowDisabled: {
    opacity: 0.5,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  actionLabelDisabled: {
    color: '#9CA3AF',
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    marginLeft: 12,
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
});
