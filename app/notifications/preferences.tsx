import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/queries/useNotifications';
import { NotificationType } from '@/types/notifications';

const NOTIFICATION_CATEGORIES = [
  { type: NotificationType.ORDER, label: 'Order Notifications', icon: 'cart' },
  { type: NotificationType.PRODUCT, label: 'Product Notifications', icon: 'cube' },
  { type: NotificationType.TEAM, label: 'Team Notifications', icon: 'people' },
  { type: NotificationType.SYSTEM, label: 'System Notifications', icon: 'settings' },
  { type: NotificationType.CASHBACK, label: 'Cashback Notifications', icon: 'cash' },
  { type: NotificationType.PAYMENT, label: 'Payment Notifications', icon: 'card' },
];

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

export default function NotificationPreferencesScreen() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const handleTogglePush = (value: boolean) => {
    updateMutation.mutate({ globalMute: !value });
  };

  const handleToggleCategory = (type: NotificationType, channel: string, value: boolean) => {
    const categoryPrefs = preferences?.categories?.[type];
    if (!categoryPrefs) return;

    updateMutation.mutate({
      categories: {
        ...preferences?.categories,
        [type]: {
          ...categoryPrefs,
          channels: {
            ...categoryPrefs.channels,
            [channel]: {
              ...categoryPrefs.channels[channel as keyof typeof categoryPrefs.channels],
              enabled: value,
            },
          },
        },
      },
    });
  };

  const handleToggleEmail = (field: string, value: boolean) => {
    updateMutation.mutate({
      email: {
        ...preferences?.email,
        [field]: value,
      },
    });
  };

  const handleToggleQuietHours = (value: boolean) => {
    updateMutation.mutate({
      doNotDisturb: {
        ...preferences?.doNotDisturb,
        enabled: value,
      },
    });
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const timeString = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`;
      updateMutation.mutate({
        doNotDisturb: {
          ...preferences?.doNotDisturb,
          startTime: timeString,
        },
      });
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const timeString = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`;
      updateMutation.mutate({
        doNotDisturb: {
          ...preferences?.doNotDisturb,
          endTime: timeString,
        },
      });
    }
  };

  const handleSave = () => {
    Alert.alert('Success', 'Notification preferences saved successfully!');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  const pushEnabled = !preferences?.globalMute;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Push Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications" size={24} color="#3B82F6" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Enable Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications in the app
                </Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={pushEnabled ? '#3B82F6' : '#F3F4F6'}
            />
          </View>

          {pushEnabled && (
            <>
              {NOTIFICATION_CATEGORIES.map((category) => {
                const categoryPref = preferences?.categories?.[category.type];
                const isEnabled = categoryPref?.channels?.push?.enabled ?? true;

                return (
                  <View key={category.type} style={styles.categoryRow}>
                    <View style={styles.settingLeft}>
                      <Ionicons name={category.icon as any} size={20} color="#6B7280" />
                      <Text style={styles.categoryLabel}>{category.label}</Text>
                    </View>
                    <Switch
                      value={isEnabled}
                      onValueChange={(value) => handleToggleCategory(category.type, 'push', value)}
                      trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                      thumbColor={isEnabled ? '#3B82F6' : '#F3F4F6'}
                    />
                  </View>
                );
              })}
            </>
          )}
        </View>

        {/* Email Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Notifications</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="mail" size={24} color="#3B82F6" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Daily Digest</Text>
                <Text style={styles.settingDescription}>
                  Receive a daily summary of notifications
                </Text>
              </View>
            </View>
            <Switch
              value={preferences?.dailyDigest?.enabled ?? false}
              onValueChange={(value) =>
                updateMutation.mutate({
                  dailyDigest: { ...preferences?.dailyDigest, enabled: value },
                })
              }
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences?.dailyDigest?.enabled ? '#3B82F6' : '#F3F4F6'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="calendar" size={24} color="#3B82F6" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Weekly Summary</Text>
                <Text style={styles.settingDescription}>
                  Receive a weekly summary of activity
                </Text>
              </View>
            </View>
            <Switch
              value={preferences?.weeklyDigest?.enabled ?? false}
              onValueChange={(value) =>
                updateMutation.mutate({
                  weeklyDigest: { ...preferences?.weeklyDigest, enabled: value },
                })
              }
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences?.weeklyDigest?.enabled ? '#3B82F6' : '#F3F4F6'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="megaphone" size={24} color="#3B82F6" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Marketing Emails</Text>
                <Text style={styles.settingDescription}>
                  Receive promotional emails and updates
                </Text>
              </View>
            </View>
            <Switch
              value={preferences?.email?.marketingEmails ?? false}
              onValueChange={(value) => handleToggleEmail('marketingEmails', value)}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences?.email?.marketingEmails ? '#3B82F6' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* In-App Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In-App Notifications</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high" size={24} color="#3B82F6" />
              <Text style={styles.settingLabel}>Sound</Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor="#3B82F6"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="phone-portrait" size={24} color="#3B82F6" />
              <Text style={styles.settingLabel}>Vibration</Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor="#3B82F6"
            />
          </View>
        </View>

        {/* Quiet Hours Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={24} color="#3B82F6" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
                <Text style={styles.settingDescription}>
                  Pause notifications during specific hours
                </Text>
              </View>
            </View>
            <Switch
              value={preferences?.doNotDisturb?.enabled ?? false}
              onValueChange={handleToggleQuietHours}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences?.doNotDisturb?.enabled ? '#3B82F6' : '#F3F4F6'}
            />
          </View>

          {preferences?.doNotDisturb?.enabled && (
            <>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={styles.timeLabel}>Start Time</Text>
                <Text style={styles.timeValue}>
                  {preferences?.doNotDisturb?.startTime || '22:00'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {showStartTimePicker && (
                <DateTimePicker
                  value={new Date(`2000-01-01T${preferences?.doNotDisturb?.startTime || '22:00'}:00`)}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={handleStartTimeChange}
                />
              )}

              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.timeLabel}>End Time</Text>
                <Text style={styles.timeValue}>
                  {preferences?.doNotDisturb?.endTime || '08:00'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {showEndTimePicker && (
                <DateTimePicker
                  value={new Date(`2000-01-01T${preferences?.doNotDisturb?.endTime || '08:00'}:00`)}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={handleEndTimeChange}
                />
              )}

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                  <Text style={styles.settingLabel}>Allow Urgent Notifications</Text>
                </View>
                <Switch
                  value={preferences?.doNotDisturb?.allowUrgent ?? true}
                  onValueChange={(value) =>
                    updateMutation.mutate({
                      doNotDisturb: {
                        ...preferences?.doNotDisturb,
                        allowUrgent: value,
                      },
                    })
                  }
                  trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                  thumbColor={preferences?.doNotDisturb?.allowUrgent ? '#3B82F6' : '#F3F4F6'}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, updateMutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 12,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingLeft: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryLabel: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeLabel: {
    fontSize: 15,
    color: '#6B7280',
    flex: 1,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
