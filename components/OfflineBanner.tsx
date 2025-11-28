import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const { width } = Dimensions.get('window');

interface OfflineBannerProps {
  showDetails?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ 
  showDetails = false 
}) => {
  const networkStatus = useNetworkStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  // Don't show banner if online and no pending actions
  if (networkStatus.isOnline && networkStatus.syncStatus.pendingActions === 0) {
    return null;
  }

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    
    Animated.timing(animation, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const getBannerColor = () => {
    if (networkStatus.isOffline) return Colors.light.error;
    if (networkStatus.isSyncing) return Colors.light.info;
    if (networkStatus.syncStatus.pendingActions > 0) return Colors.light.warning;
    return Colors.light.success;
  };

  const getBannerIcon = () => {
    if (networkStatus.isOffline) return 'cloud-offline';
    if (networkStatus.isSyncing) return 'sync';
    if (networkStatus.syncStatus.pendingActions > 0) return 'time';
    return 'cloud-done';
  };

  const getPrimaryMessage = () => {
    if (networkStatus.isOffline) return 'You\'re offline';
    if (networkStatus.isSyncing) return 'Syncing changes...';
    if (networkStatus.syncStatus.pendingActions > 0) {
      return `${networkStatus.syncStatus.pendingActions} pending changes`;
    }
    return 'All changes synced';
  };

  const getSecondaryMessage = () => {
    if (networkStatus.isOffline) {
      return 'Changes will sync when you\'re back online';
    }
    if (networkStatus.isSyncing) {
      return 'Please wait while we sync your changes';
    }
    if (networkStatus.syncStatus.pendingActions > 0) {
      return 'Tap to retry sync now';
    }
    return '';
  };

  const handleBannerPress = () => {
    if (networkStatus.canSync && networkStatus.syncStatus.pendingActions > 0) {
      networkStatus.triggerSync();
    } else if (showDetails) {
      toggleExpanded();
    }
  };

  const formatLastSync = () => {
    if (!networkStatus.syncStatus.lastSyncAt) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - networkStatus.syncStatus.lastSyncAt.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return networkStatus.syncStatus.lastSyncAt.toLocaleDateString();
  };

  const expandedHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  return (
    <View style={[styles.container, { borderLeftColor: getBannerColor() }]}>
      <TouchableOpacity
        style={styles.banner}
        onPress={handleBannerPress}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={getBannerIcon()}
              size={20}
              color={getBannerColor()}
              style={networkStatus.isSyncing ? styles.spinningIcon : undefined}
            />
          </View>
          
          <View style={styles.textContainer}>
            <ThemedText style={[styles.primaryText, { color: getBannerColor() }]}>
              {getPrimaryMessage()}
            </ThemedText>
            {getSecondaryMessage() && (
              <ThemedText style={styles.secondaryText}>
                {getSecondaryMessage()}
              </ThemedText>
            )}
          </View>

          {showDetails && (
            <TouchableOpacity
              style={styles.expandButton}
              onPress={toggleExpanded}
            >
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.light.textSecondary}
              />
            </TouchableOpacity>
          )}

          {networkStatus.canSync && networkStatus.syncStatus.pendingActions > 0 && (
            <TouchableOpacity
              style={styles.syncButton}
              onPress={() => networkStatus.triggerSync()}
            >
              <Ionicons name="refresh" size={16} color={Colors.light.background} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {showDetails && (
        <Animated.View style={[styles.expandedContent, { height: expandedHeight }]}>
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Connection:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {networkStatus.isOnline ? networkStatus.getConnectionTypeDisplay() : 'Offline'}
              </ThemedText>
            </View>
            
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Quality:</ThemedText>
              <ThemedText style={[
                styles.detailValue,
                { color: networkStatus.hasGoodConnection ? Colors.light.success : Colors.light.warning }
              ]}>
                {networkStatus.connectionQuality.charAt(0).toUpperCase() + networkStatus.connectionQuality.slice(1)}
              </ThemedText>
            </View>
            
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Last sync:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatLastSync()}
              </ThemedText>
            </View>
            
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Pending:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {networkStatus.syncStatus.pendingActions} actions
              </ThemedText>
            </View>

            {networkStatus.syncStatus.syncErrors.length > 0 && (
              <View style={styles.errorsContainer}>
                <ThemedText style={styles.errorTitle}>Sync Errors:</ThemedText>
                {networkStatus.syncStatus.syncErrors.map((error, index) => (
                  <ThemedText key={index} style={styles.errorText}>
                    • {error}
                  </ThemedText>
                ))}
                <TouchableOpacity
                  style={styles.clearErrorsButton}
                  onPress={networkStatus.clearSyncErrors}
                >
                  <ThemedText style={styles.clearErrorsText}>Clear</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderLeftWidth: 4,
    marginBottom: 1,
  },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
  },
  spinningIcon: {
    // Add rotation animation if needed
  },
  textContainer: {
    flex: 1,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  secondaryText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  expandButton: {
    padding: 4,
  },
  syncButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  expandedContent: {
    overflow: 'hidden',
    backgroundColor: Colors.light.background,
  },
  detailsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '600',
  },
  errorsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.error,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 11,
    color: Colors.light.error,
    marginBottom: 2,
  },
  clearErrorsButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 4,
  },
  clearErrorsText: {
    fontSize: 10,
    color: Colors.light.primary,
    fontWeight: '600',
  },
});