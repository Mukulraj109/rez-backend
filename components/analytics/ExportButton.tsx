import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

type ExportFormat = 'csv' | 'excel' | 'pdf';

interface ExportOptions {
  format: ExportFormat;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  includeCharts?: boolean;
}

interface ExportButtonProps {
  data: any;
  filename?: string;
  onExport: (options: ExportOptions) => Promise<string>;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename = 'analytics_export',
  onExport,
  disabled = false,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [showModal, setShowModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Export format configurations
  const formatConfigs: Record<
    ExportFormat,
    {
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      description: string;
      color: string;
    }
  > = {
    csv: {
      label: 'CSV',
      icon: 'document-text-outline',
      description: 'Spreadsheet format, compatible with Excel',
      color: theme.secondary,
    },
    excel: {
      label: 'Excel',
      icon: 'grid-outline',
      description: 'Native Excel format with formatting',
      color: '#217346',
    },
    pdf: {
      label: 'PDF',
      icon: 'document-outline',
      description: 'Portable document with charts',
      color: theme.danger,
    },
  };

  // Handle export
  const handleExport = async () => {
    try {
      setExporting(true);
      setExportProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const options: ExportOptions = {
        format: selectedFormat,
      };

      const url = await onExport(options);

      clearInterval(progressInterval);
      setExportProgress(100);
      setDownloadUrl(url);

      // Reset after 2 seconds
      setTimeout(() => {
        setExporting(false);
        setExportProgress(0);
        setDownloadUrl(null);
        setShowModal(false);
      }, 2000);
    } catch (error) {
      console.error('Export error:', error);
      setExporting(false);
      setExportProgress(0);
      // Show error message (you can add a toast notification here)
    }
  };

  return (
    <View>
      {/* Trigger Button */}
      <TouchableOpacity
        style={[
          styles.triggerButton,
          {
            backgroundColor: theme.primary,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={() => setShowModal(true)}
        disabled={disabled}
      >
        <Ionicons name="download-outline" size={20} color="#fff" />
        <Text style={styles.triggerButtonText}>Export</Text>
      </TouchableOpacity>

      {/* Export Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => !exporting && setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.card,
              },
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.modalHeader,
                {
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Export Analytics
              </Text>
              {!exporting && (
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {!exporting && !downloadUrl ? (
              <>
                {/* Format Selection */}
                <View style={styles.formatContainer}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    Select Format
                  </Text>

                  {(Object.keys(formatConfigs) as ExportFormat[]).map((format) => {
                    const config = formatConfigs[format];
                    const isSelected = selectedFormat === format;

                    return (
                      <TouchableOpacity
                        key={format}
                        style={[
                          styles.formatOption,
                          {
                            backgroundColor: isSelected
                              ? config.color + '15'
                              : theme.backgroundSecondary,
                            borderColor: isSelected ? config.color : theme.border,
                          },
                        ]}
                        onPress={() => setSelectedFormat(format)}
                      >
                        <View
                          style={[
                            styles.formatIconContainer,
                            {
                              backgroundColor: config.color + '20',
                            },
                          ]}
                        >
                          <Ionicons name={config.icon} size={24} color={config.color} />
                        </View>

                        <View style={styles.formatInfo}>
                          <Text
                            style={[
                              styles.formatLabel,
                              {
                                color: theme.text,
                              },
                            ]}
                          >
                            {config.label}
                          </Text>
                          <Text
                            style={[
                              styles.formatDescription,
                              {
                                color: theme.textSecondary,
                              },
                            ]}
                          >
                            {config.description}
                          </Text>
                        </View>

                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color={config.color}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Export Info */}
                <View
                  style={[
                    styles.exportInfo,
                    {
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Ionicons name="information-circle" size={20} color={theme.info} />
                  <Text style={[styles.exportInfoText, { color: theme.textSecondary }]}>
                    Export includes all visible data from your current view
                  </Text>
                </View>

                {/* Export Button */}
                <TouchableOpacity
                  style={[
                    styles.exportButton,
                    {
                      backgroundColor: formatConfigs[selectedFormat].color,
                    },
                  ]}
                  onPress={handleExport}
                >
                  <Ionicons name="download" size={20} color="#fff" />
                  <Text style={styles.exportButtonText}>
                    Export as {formatConfigs[selectedFormat].label}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Export Progress */}
                {exporting && (
                  <View style={styles.progressContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.progressText, { color: theme.text }]}>
                      Exporting your data...
                    </Text>

                    {/* Progress Bar */}
                    <View
                      style={[
                        styles.progressBarTrack,
                        {
                          backgroundColor: theme.borderLight,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${exportProgress}%`,
                            backgroundColor: theme.primary,
                          },
                        ]}
                      />
                    </View>

                    <Text style={[styles.progressPercentage, { color: theme.textSecondary }]}>
                      {exportProgress}%
                    </Text>
                  </View>
                )}

                {/* Download Success */}
                {downloadUrl && (
                  <View style={styles.successContainer}>
                    <View
                      style={[
                        styles.successIcon,
                        {
                          backgroundColor: theme.secondary + '20',
                        },
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={64}
                        color={theme.secondary}
                      />
                    </View>
                    <Text style={[styles.successTitle, { color: theme.text }]}>
                      Export Complete!
                    </Text>
                    <Text style={[styles.successMessage, { color: theme.textSecondary }]}>
                      Your file has been generated successfully
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.downloadButton,
                        {
                          backgroundColor: theme.primary,
                        },
                      ]}
                      onPress={() => {
                        // Handle download
                        console.log('Download:', downloadUrl);
                      }}
                    >
                      <Ionicons name="cloud-download" size={20} color="#fff" />
                      <Text style={styles.downloadButtonText}>Download File</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  triggerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formatContainer: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  formatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatInfo: {
    flex: 1,
  },
  formatLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  formatDescription: {
    fontSize: 13,
  },
  exportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  exportInfoText: {
    flex: 1,
    fontSize: 13,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 20,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
  },
  successContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  successIcon: {
    borderRadius: 64,
    padding: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  successMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
