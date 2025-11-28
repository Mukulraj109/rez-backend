/**
 * Pending Approval Screen
 * Shown after successful onboarding submission
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

interface TimelineStep {
  title: string;
  description: string;
  duration: string;
  icon: string;
  status: 'completed' | 'current' | 'upcoming';
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    title: 'Application Submitted',
    description: 'Your onboarding application has been received',
    duration: 'Completed',
    icon: 'checkmark-circle',
    status: 'completed',
  },
  {
    title: 'Document Verification',
    description: 'Our team is verifying your documents',
    duration: '1-2 business days',
    icon: 'document-text',
    status: 'current',
  },
  {
    title: 'Business Verification',
    description: 'Verifying your business information',
    duration: '2-3 business days',
    icon: 'business',
    status: 'upcoming',
  },
  {
    title: 'Account Setup',
    description: 'Setting up your merchant account',
    duration: '1 business day',
    icon: 'settings',
    status: 'upcoming',
  },
  {
    title: 'Approval & Activation',
    description: 'Your account will be activated',
    duration: 'Instant',
    icon: 'rocket',
    status: 'upcoming',
  },
];

const SUPPORT_OPTIONS = [
  {
    title: 'Email Support',
    description: 'support@rezapp.com',
    icon: 'mail-outline',
    action: 'email',
    value: 'support@rezapp.com',
  },
  {
    title: 'Phone Support',
    description: '+91 1800-123-4567',
    icon: 'call-outline',
    action: 'phone',
    value: '+911800123456',
  },
  {
    title: 'Help Center',
    description: 'Browse FAQs and guides',
    icon: 'help-circle-outline',
    action: 'help',
    value: 'https://help.rezapp.com',
  },
];

export default function PendingApprovalScreen() {
  const router = useRouter();
  const [estimatedDate, setEstimatedDate] = useState<string>('');

  useEffect(() => {
    // Calculate estimated approval date (5-7 business days from now)
    const today = new Date();
    const approvalDate = new Date(today);
    approvalDate.setDate(today.getDate() + 7);
    setEstimatedDate(approvalDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }));
  }, []);

  const handleContactSupport = (option: typeof SUPPORT_OPTIONS[0]) => {
    switch (option.action) {
      case 'email':
        Linking.openURL(`mailto:${option.value}`);
        break;
      case 'phone':
        Linking.openURL(`tel:${option.value}`);
        break;
      case 'help':
        Linking.openURL(option.value);
        break;
    }
  };

  const handleReturnToLogin = () => {
    Alert.alert(
      'Return to Login',
      'You will be redirected to the login screen. You can check your application status after logging in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const renderTimelineStep = (step: TimelineStep, index: number) => {
    const isCompleted = step.status === 'completed';
    const isCurrent = step.status === 'current';

    return (
      <Animatable.View
        key={index}
        animation="fadeInUp"
        delay={index * 100}
        style={styles.timelineItem}
      >
        <View style={styles.timelineIconContainer}>
          <View
            style={[
              styles.timelineIcon,
              isCompleted && styles.timelineIconCompleted,
              isCurrent && styles.timelineIconCurrent,
            ]}
          >
            <Ionicons
              name={step.icon as any}
              size={24}
              color={
                isCompleted ? '#10B981' : isCurrent ? '#3B82F6' : '#D1D5DB'
              }
            />
          </View>
          {index < TIMELINE_STEPS.length - 1 && (
            <View
              style={[
                styles.timelineLine,
                isCompleted && styles.timelineLineCompleted,
              ]}
            />
          )}
        </View>

        <View style={styles.timelineContent}>
          <View style={styles.timelineHeader}>
            <Text
              style={[
                styles.timelineTitle,
                (isCompleted || isCurrent) && styles.timelineTitleActive,
              ]}
            >
              {step.title}
            </Text>
            <Text
              style={[
                styles.timelineDuration,
                isCompleted && styles.timelineDurationCompleted,
                isCurrent && styles.timelineDurationCurrent,
              ]}
            >
              {step.duration}
            </Text>
          </View>
          <Text style={styles.timelineDescription}>{step.description}</Text>
        </View>
      </Animatable.View>
    );
  };

  const renderSupportOption = (option: typeof SUPPORT_OPTIONS[0], index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.supportCard}
      onPress={() => handleContactSupport(option)}
      activeOpacity={0.7}
    >
      <View style={styles.supportIcon}>
        <Ionicons name={option.icon as any} size={24} color="#3B82F6" />
      </View>
      <View style={styles.supportContent}>
        <Text style={styles.supportTitle}>{option.title}</Text>
        <Text style={styles.supportDescription}>{option.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Header */}
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          style={styles.successHeader}
        >
          <Animatable.View
            animation="bounceIn"
            duration={1000}
            style={styles.successIconContainer}
          >
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons name="checkmark" size={48} color="#FFFFFF" />
              </View>
            </View>
          </Animatable.View>

          <Animatable.Text
            animation="fadeInUp"
            delay={300}
            style={styles.successTitle}
          >
            Application Submitted!
          </Animatable.Text>

          <Animatable.Text
            animation="fadeInUp"
            delay={500}
            style={styles.successSubtitle}
          >
            Thank you for completing your merchant onboarding
          </Animatable.Text>

          <Animatable.View
            animation="fadeInUp"
            delay={700}
            style={styles.applicationIdCard}
          >
            <Text style={styles.applicationIdLabel}>Application ID</Text>
            <Text style={styles.applicationIdValue}>
              #{Math.random().toString(36).substring(2, 10).toUpperCase()}
            </Text>
          </Animatable.View>
        </LinearGradient>

        <View style={styles.content}>
          {/* What's Next Section */}
          <Animatable.View animation="fadeInUp" delay={900} style={styles.section}>
            <Text style={styles.sectionTitle}>What Happens Next?</Text>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <Text style={styles.infoCardText}>
                Our team will review your application and verify your documents. You will
                receive email updates at each stage.
              </Text>
            </View>
          </Animatable.View>

          {/* Timeline Section */}
          <Animatable.View animation="fadeInUp" delay={1100} style={styles.section}>
            <Text style={styles.sectionTitle}>Verification Timeline</Text>
            <Text style={styles.sectionSubtitle}>
              Expected completion by {estimatedDate}
            </Text>
            <View style={styles.timelineContainer}>
              {TIMELINE_STEPS.map((step, index) => renderTimelineStep(step, index))}
            </View>
          </Animatable.View>

          {/* Important Notes */}
          <Animatable.View animation="fadeInUp" delay={1300} style={styles.section}>
            <Text style={styles.sectionTitle}>Important Notes</Text>
            <View style={styles.notesList}>
              <View style={styles.noteItem}>
                <View style={styles.noteBullet}>
                  <View style={styles.noteBulletInner} />
                </View>
                <Text style={styles.noteText}>
                  You will receive email notifications for each verification step
                </Text>
              </View>
              <View style={styles.noteItem}>
                <View style={styles.noteBullet}>
                  <View style={styles.noteBulletInner} />
                </View>
                <Text style={styles.noteText}>
                  Verification typically takes 5-7 business days
                </Text>
              </View>
              <View style={styles.noteItem}>
                <View style={styles.noteBullet}>
                  <View style={styles.noteBulletInner} />
                </View>
                <Text style={styles.noteText}>
                  Our team may contact you if additional information is needed
                </Text>
              </View>
              <View style={styles.noteItem}>
                <View style={styles.noteBullet}>
                  <View style={styles.noteBulletInner} />
                </View>
                <Text style={styles.noteText}>
                  You can check your application status anytime after logging in
                </Text>
              </View>
            </View>
          </Animatable.View>

          {/* Contact Support Section */}
          <Animatable.View animation="fadeInUp" delay={1500} style={styles.section}>
            <Text style={styles.sectionTitle}>Need Help?</Text>
            <Text style={styles.sectionSubtitle}>
              Our support team is here to assist you
            </Text>
            <View style={styles.supportContainer}>
              {SUPPORT_OPTIONS.map((option, index) => renderSupportOption(option, index))}
            </View>
          </Animatable.View>

          {/* Tips Section */}
          <Animatable.View animation="fadeInUp" delay={1700} style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={24} color="#F59E0B" />
              <Text style={styles.tipsTitle}>Pro Tips</Text>
            </View>
            <View style={styles.tipsList}>
              <Text style={styles.tipText}>
                Check your email regularly for updates on your application
              </Text>
              <Text style={styles.tipText}>
                Keep your phone accessible in case we need to reach you
              </Text>
              <Text style={styles.tipText}>
                Save your Application ID for future reference
              </Text>
            </View>
          </Animatable.View>
        </View>
      </ScrollView>

      {/* Footer */}
      <Animatable.View
        animation="fadeInUp"
        delay={1900}
        style={styles.footer}
      >
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleReturnToLogin}
        >
          <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
          <Text style={styles.loginButtonText}>Return to Login</Text>
        </TouchableOpacity>
      </Animatable.View>
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
  successHeader: {
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
  },
  applicationIdCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  applicationIdLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  applicationIdValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoCardText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconCompleted: {
    backgroundColor: '#D1FAE5',
  },
  timelineIconCurrent: {
    backgroundColor: '#DBEAFE',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  timelineLineCompleted: {
    backgroundColor: '#10B981',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 24,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  timelineTitleActive: {
    color: '#111827',
  },
  timelineDuration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  timelineDurationCompleted: {
    color: '#10B981',
  },
  timelineDurationCurrent: {
    color: '#3B82F6',
  },
  timelineDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  notesList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  noteBulletInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  supportContainer: {
    gap: 12,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  supportDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  tipsSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  tipsList: {
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    paddingLeft: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  loginButton: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
