import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useColorScheme,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

type RiskLevel = 'high' | 'medium' | 'low';

interface StockoutAlertProps {
  productId: string;
  productName: string;
  productImage?: string;
  currentStock: number;
  riskLevel: RiskLevel;
  daysUntilStockout: number;
  recommendedReorderQty: number;
  predictedDate: string;
  onReorder?: () => void;
  onDismiss?: () => void;
  onViewDetails?: () => void;
}

export const StockoutAlertCard: React.FC<StockoutAlertProps> = ({
  productId,
  productName,
  productImage,
  currentStock,
  riskLevel,
  daysUntilStockout,
  recommendedReorderQty,
  predictedDate,
  onReorder,
  onDismiss,
  onViewDetails,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Get risk level styling
  const getRiskConfig = () => {
    switch (riskLevel) {
      case 'high':
        return {
          color: theme.danger,
          icon: 'alert-circle' as const,
          label: 'High Risk',
          bgColor: theme.danger + '15',
        };
      case 'medium':
        return {
          color: theme.warning,
          icon: 'warning' as const,
          label: 'Medium Risk',
          bgColor: theme.warning + '15',
        };
      case 'low':
        return {
          color: theme.info,
          icon: 'information-circle' as const,
          label: 'Low Risk',
          bgColor: theme.info + '15',
        };
    }
  };

  const riskConfig = getRiskConfig();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderLeftColor: riskConfig.color,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.riskBadge,
            {
              backgroundColor: riskConfig.bgColor,
            },
          ]}
        >
          <Ionicons name={riskConfig.icon} size={16} color={riskConfig.color} />
          <Text style={[styles.riskLabel, { color: riskConfig.color }]}>
            {riskConfig.label}
          </Text>
        </View>

        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        {productImage && (
          <Image source={{ uri: productImage }} style={styles.productImage} />
        )}
        <View style={styles.productDetails}>
          <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
            {productName}
          </Text>
          <Text style={[styles.productId, { color: theme.textSecondary }]}>
            ID: {productId}
          </Text>
        </View>
      </View>

      {/* Stock Info */}
      <View style={styles.stockInfo}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="cube-outline" size={18} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Current Stock
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {currentStock} units
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Days Until Stockout
            </Text>
            <Text
              style={[
                styles.infoValue,
                {
                  color:
                    daysUntilStockout <= 7
                      ? theme.danger
                      : daysUntilStockout <= 14
                      ? theme.warning
                      : theme.text,
                },
              ]}
            >
              {daysUntilStockout} days
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Predicted Date
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {new Date(predictedDate).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="cart-outline" size={18} color={theme.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Recommended Reorder
            </Text>
            <Text style={[styles.infoValue, { color: theme.primary }]}>
              {recommendedReorderQty} units
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: theme.borderLight,
            },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.max(0, Math.min(100, (currentStock / recommendedReorderQty) * 100))}%`,
                backgroundColor: riskConfig.color,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {Math.round((currentStock / recommendedReorderQty) * 100)}% of recommended level
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {onViewDetails && (
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSecondary,
              {
                borderColor: theme.border,
              },
            ]}
            onPress={onViewDetails}
          >
            <Text style={[styles.buttonTextSecondary, { color: theme.text }]}>
              View Details
            </Text>
          </TouchableOpacity>
        )}

        {onReorder && (
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonPrimary,
              {
                backgroundColor: theme.primary,
              },
            ]}
            onPress={onReorder}
          >
            <Ionicons name="cart" size={18} color="#fff" />
            <Text style={styles.buttonTextPrimary}>Reorder Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  riskLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
  productInfo: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productId: {
    fontSize: 12,
  },
  stockInfo: {
    gap: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  buttonPrimary: {},
  buttonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
