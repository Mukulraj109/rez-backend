/**
 * DocumentCard Component
 * Display uploaded document with preview and actions
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { DocumentUpload } from '@/types/onboarding';

export interface DocumentCardProps {
  document: DocumentUpload;
  onDelete: () => void;
  onPreview?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onDelete,
  onPreview,
  showActions = true,
  compact = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDocumentIcon = (type: string): string => {
    switch (type) {
      case 'pan_card':
        return 'card-outline';
      case 'aadhar':
        return 'finger-print';
      case 'gst_certificate':
        return 'document-text-outline';
      case 'bank_statement':
        return 'wallet-outline';
      case 'business_license':
        return 'ribbon-outline';
      case 'utility_bill':
        return 'receipt-outline';
      default:
        return 'document-outline';
    }
  };

  const getDocumentLabel = (type: string): string => {
    switch (type) {
      case 'pan_card':
        return 'PAN Card';
      case 'aadhar':
        return 'Aadhar Card';
      case 'gst_certificate':
        return 'GST Certificate';
      case 'bank_statement':
        return 'Bank Statement';
      case 'business_license':
        return 'Business License';
      case 'utility_bill':
        return 'Utility Bill';
      default:
        return 'Document';
    }
  };

  const getVerificationColor = (status?: string) => {
    switch (status) {
      case 'verified':
        return colors.success;
      case 'rejected':
        return colors.danger;
      default:
        return colors.warning;
    }
  };

  const getVerificationIcon = (status?: string) => {
    switch (status) {
      case 'verified':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      default:
        return 'time';
    }
  };

  const getVerificationLabel = (status?: string) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending Review';
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete this ${getDocumentLabel(document.type).toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  const isImage = document.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  if (compact) {
    return (
      <View
        style={[
          styles.compactContainer,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderMedium },
        ]}
      >
        <View style={styles.compactContent}>
          <Ionicons
            name={getDocumentIcon(document.type)}
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.compactLabel, { color: colors.text }]} numberOfLines={1}>
            {getDocumentLabel(document.type)}
          </Text>
          <Ionicons
            name={getVerificationIcon(document.verificationStatus)}
            size={16}
            color={getVerificationColor(document.verificationStatus)}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.borderMedium },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={onPreview}
        disabled={!onPreview}
        activeOpacity={0.7}
      >
        {/* Preview/Icon */}
        <View
          style={[
            styles.previewContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          {isImage && document.fileUrl ? (
            <Image source={{ uri: document.fileUrl }} style={styles.previewImage} />
          ) : (
            <Ionicons
              name={getDocumentIcon(document.type)}
              size={32}
              color={colors.primary}
            />
          )}
        </View>

        {/* Document Info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.documentType, { color: colors.text }]} numberOfLines={1}>
            {getDocumentLabel(document.type)}
          </Text>

          {document.fileName && (
            <Text style={[styles.fileName, { color: colors.textSecondary }]} numberOfLines={1}>
              {document.fileName}
            </Text>
          )}

          <View style={styles.metaContainer}>
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {formatFileSize(document.fileSize)}
            </Text>
            <Text style={[styles.metaText, { color: colors.textMuted }]}>•</Text>
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {formatDate(document.uploadedAt)}
            </Text>
          </View>

          {/* Verification Status */}
          <View style={styles.statusContainer}>
            <Ionicons
              name={getVerificationIcon(document.verificationStatus)}
              size={14}
              color={getVerificationColor(document.verificationStatus)}
            />
            <Text
              style={[
                styles.statusText,
                { color: getVerificationColor(document.verificationStatus) },
              ]}
            >
              {getVerificationLabel(document.verificationStatus)}
            </Text>
          </View>

          {document.verificationNotes && document.verificationStatus === 'rejected' && (
            <Text style={[styles.notesText, { color: colors.danger }]}>
              {document.verificationNotes}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Actions */}
      {showActions && (
        <View style={styles.actionsContainer}>
          {onPreview && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={onPreview}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="eye-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
  },
  previewContainer: {
    width: 72,
    height: 72,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileName: {
    fontSize: 12,
    marginBottom: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaText: {
    fontSize: 11,
    marginRight: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  notesText: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  compactLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});

export default DocumentCard;
