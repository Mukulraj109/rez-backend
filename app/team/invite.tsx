/**
 * Team Management - Invite Team Member Screen
 * Form to invite new team members with role selection
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import FormInput from '@/components/forms/FormInput';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { teamService } from '@/services/api/team';
import { MerchantRole, InviteTeamMemberRequest } from '@/types/team';

interface InviteFormData {
  email: string;
  name: string;
  role: MerchantRole;
}

export default function InviteTeamMemberScreen() {
  const { token } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<MerchantRole>('staff');
  const [showRoleDescription, setShowRoleDescription] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteFormData>({
    defaultValues: {
      email: '',
      name: '',
      role: 'staff',
    },
  });

  const availableRoles = teamService.getAvailableRoles();

  const handleInvite = async (data: InviteFormData) => {
    try {
      setSubmitting(true);

      const inviteData: InviteTeamMemberRequest = {
        email: data.email.trim(),
        name: data.name.trim(),
        role: selectedRole as Exclude<MerchantRole, 'owner'>,
      };

      // Validate
      const validation = teamService.validateInviteData(inviteData);
      if (!validation.valid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      // Send invitation
      const response = await teamService.inviteTeamMember(inviteData);

      Alert.alert(
        'Invitation Sent',
        `An invitation has been sent to ${data.email}. They will receive an email with instructions to join your team.`,
        [
          {
            text: 'OK',
            onPress: () => {
              reset();
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeColor = (role: MerchantRole): string => {
    const colors: Record<MerchantRole, string> = {
      owner: Colors.light.primary,
      admin: '#3B82F6',
      manager: '#10B981',
      staff: '#6B7280',
    };
    return colors[role];
  };

  const renderRoleCard = (roleInfo: {
    role: MerchantRole;
    label: string;
    description: string;
  }) => {
    const isSelected = selectedRole === roleInfo.role;
    const capabilities = teamService.getRoleCapabilities(roleInfo.role);

    return (
      <TouchableOpacity
        key={roleInfo.role}
        style={[styles.roleCard, isSelected && styles.roleCardSelected]}
        onPress={() => {
          setSelectedRole(roleInfo.role);
          setShowRoleDescription(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.roleCardHeader}>
          <View style={styles.roleCardLeft}>
            <View
              style={[
                styles.radioButton,
                {
                  borderColor: isSelected
                    ? getRoleBadgeColor(roleInfo.role)
                    : Colors.light.border,
                },
              ]}
            >
              {isSelected && (
                <View
                  style={[
                    styles.radioButtonInner,
                    { backgroundColor: getRoleBadgeColor(roleInfo.role) },
                  ]}
                />
              )}
            </View>

            <View style={styles.roleCardInfo}>
              <ThemedText style={styles.roleCardTitle}>{roleInfo.label}</ThemedText>
              <ThemedText style={styles.roleCardSubtitle}>
                {capabilities.permissionCount} permissions
              </ThemedText>
            </View>
          </View>

          <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(roleInfo.role) }]}>
            <ThemedText style={styles.roleBadgeText}>{roleInfo.label}</ThemedText>
          </View>
        </View>

        {isSelected && showRoleDescription && (
          <View style={styles.roleDescription}>
            <ThemedText style={styles.roleDescriptionText}>{roleInfo.description}</ThemedText>

            <View style={styles.capabilitiesGrid}>
              {capabilities.canManageProducts && (
                <View style={styles.capabilityChip}>
                  <Ionicons name="cube-outline" size={14} color={Colors.light.primary} />
                  <ThemedText style={styles.capabilityText}>Products</ThemedText>
                </View>
              )}
              {capabilities.canManageOrders && (
                <View style={styles.capabilityChip}>
                  <Ionicons name="receipt-outline" size={14} color={Colors.light.primary} />
                  <ThemedText style={styles.capabilityText}>Orders</ThemedText>
                </View>
              )}
              {capabilities.canManageTeam && (
                <View style={styles.capabilityChip}>
                  <Ionicons name="people-outline" size={14} color={Colors.light.primary} />
                  <ThemedText style={styles.capabilityText}>Team</ThemedText>
                </View>
              )}
              {capabilities.canViewAnalytics && (
                <View style={styles.capabilityChip}>
                  <Ionicons name="analytics-outline" size={14} color={Colors.light.primary} />
                  <ThemedText style={styles.capabilityText}>Analytics</ThemedText>
                </View>
              )}
              {capabilities.canManageBilling && (
                <View style={styles.capabilityChip}>
                  <Ionicons name="card-outline" size={14} color={Colors.light.primary} />
                  <ThemedText style={styles.capabilityText}>Billing</ThemedText>
                </View>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            Invite Team Member
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={24} color={Colors.light.info} />
              <ThemedText style={styles.infoBannerText}>
                The team member will receive an email invitation with instructions to create their
                account and join your team.
              </ThemedText>
            </View>

            {/* Form */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Team Member Information</ThemedText>

              <FormInput
                name="name"
                control={control}
                label="Full Name"
                placeholder="John Doe"
                icon="person-outline"
                rules={{
                  required: 'Name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                }}
              />

              <FormInput
                name="email"
                control={control}
                label="Email Address"
                placeholder="john.doe@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email format',
                  },
                }}
              />
            </View>

            {/* Role Selection */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Select Role</ThemedText>
              <ThemedText style={styles.sectionSubtitle}>
                Choose the appropriate role based on the responsibilities you want to assign
              </ThemedText>

              <View style={styles.rolesContainer}>
                {availableRoles.map((roleInfo) => renderRoleCard(roleInfo))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit(handleInvite)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={20} color="white" />
                    <ThemedText style={styles.submitButtonText}>Send Invitation</ThemedText>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={submitting}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    color: Colors.light.text,
  },
  placeholder: {
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.light.info + '20',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.info,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  section: {
    backgroundColor: Colors.light.background,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  rolesContainer: {
    gap: 12,
  },
  roleCard: {
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  roleCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary + '05',
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  roleCardInfo: {
    flex: 1,
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  roleCardSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  roleDescription: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  roleDescriptionText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  capabilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  capabilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  capabilityText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '500',
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  bottomSpacing: {
    height: 40,
  },
});
