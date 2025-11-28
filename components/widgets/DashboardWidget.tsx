import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

export interface WidgetConfig {
  id: string;
  type: 'metric' | 'chart' | 'list' | 'notification' | 'custom';
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: { x: number; y: number };
  isVisible: boolean;
  refreshInterval?: number; // in seconds
  data?: any;
}

export interface DashboardWidgetProps {
  config: WidgetConfig;
  onEdit?: (config: WidgetConfig) => void;
  onRemove?: (id: string) => void;
  onMove?: (id: string, position: { x: number; y: number }) => void;
  onResize?: (id: string, size: 'small' | 'medium' | 'large' | 'full') => void;
  children: React.ReactNode;
  isEditing?: boolean;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  config,
  onEdit,
  onRemove,
  onMove,
  onResize,
  children,
  isEditing = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getWidgetDimensions = () => {
    const padding = 16;
    const gap = 12;
    const availableWidth = width - (padding * 2);

    switch (config.size) {
      case 'small':
        return {
          width: (availableWidth - gap) / 2,
          height: 120,
        };
      case 'medium':
        return {
          width: availableWidth,
          height: 160,
        };
      case 'large':
        return {
          width: availableWidth,
          height: 240,
        };
      case 'full':
        return {
          width: availableWidth,
          height: 320,
        };
      default:
        return {
          width: availableWidth,
          height: 160,
        };
    }
  };

  const dimensions = getWidgetDimensions();

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleEdit = () => {
    setIsMenuOpen(false);
    onEdit?.(config);
  };

  const handleRemove = () => {
    setIsMenuOpen(false);
    onRemove?.(config.id);
  };

  const handleResize = (newSize: typeof config.size) => {
    setIsMenuOpen(false);
    onResize?.(config.id, newSize);
  };

  const MenuButton = ({ icon, label, onPress, color }: {
    icon: string;
    label: string;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity style={styles.menuButton} onPress={onPress}>
      <Ionicons name={icon as any} size={16} color={color || Colors.light.textSecondary} />
      <ThemedText style={[styles.menuButtonText, color && { color }]}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

  if (!config.isVisible) {
    return null;
  }

  return (
    <ThemedView style={[
      styles.container,
      {
        width: dimensions.width,
        height: dimensions.height,
      },
      isEditing && styles.editingContainer,
    ]}>
      {/* Widget Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {config.title}
          </ThemedText>
          {config.refreshInterval && (
            <View style={styles.refreshIndicator}>
              <Ionicons name="refresh" size={12} color={Colors.light.textMuted} />
              <ThemedText style={styles.refreshText}>
                {config.refreshInterval}s
              </ThemedText>
            </View>
          )}
        </View>

        {isEditing && (
          <View style={styles.controls}>
            <TouchableOpacity onPress={handleMenuToggle} style={styles.menuToggle}>
              <Ionicons name="ellipsis-vertical" size={16} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Widget Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Widget Menu */}
      {isMenuOpen && (
        <View style={styles.menu}>
          <MenuButton
            icon="create"
            label="Edit"
            onPress={handleEdit}
          />
          <MenuButton
            icon="resize"
            label="Small"
            onPress={() => handleResize('small')}
            color={config.size === 'small' ? Colors.light.primary : undefined}
          />
          <MenuButton
            icon="resize"
            label="Medium"
            onPress={() => handleResize('medium')}
            color={config.size === 'medium' ? Colors.light.primary : undefined}
          />
          <MenuButton
            icon="resize"
            label="Large"
            onPress={() => handleResize('large')}
            color={config.size === 'large' ? Colors.light.primary : undefined}
          />
          <MenuButton
            icon="trash"
            label="Remove"
            onPress={handleRemove}
            color={Colors.light.error}
          />
        </View>
      )}

      {/* Size Indicator */}
      {isEditing && (
        <View style={styles.sizeIndicator}>
          <ThemedText style={styles.sizeText}>
            {config.size.charAt(0).toUpperCase() + config.size.slice(1)}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
};

// Pre-built widget components
export const MetricWidget: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ title, value, icon, color, change, trend }) => (
  <View style={styles.metricWidget}>
    <View style={styles.metricHeader}>
      <Ionicons name={icon as any} size={24} color={color} />
      <ThemedText type="caption" style={styles.metricTitle}>
        {title}
      </ThemedText>
    </View>
    <ThemedText type="title" style={styles.metricValue}>
      {typeof value === 'number' && title.toLowerCase().includes('revenue') 
        ? `₹${value.toLocaleString()}` 
        : value.toLocaleString()}
    </ThemedText>
    {change && (
      <View style={styles.metricChangeContainer}>
        {trend && trend !== 'neutral' && (
          <Ionicons 
            name={trend === 'up' ? 'arrow-up' : 'arrow-down'} 
            size={12} 
            color={trend === 'up' ? Colors.light.success : Colors.light.error} 
          />
        )}
        <ThemedText style={[
          styles.metricChange,
          { color: trend === 'up' ? Colors.light.success : trend === 'down' ? Colors.light.error : Colors.light.textSecondary }
        ]}>
          {change}
        </ThemedText>
      </View>
    )}
  </View>
);

export const ListWidget: React.FC<{
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    value?: string;
    icon?: string;
    color?: string;
  }>;
  emptyMessage?: string;
}> = ({ items, emptyMessage = 'No items to display' }) => (
  <View style={styles.listWidget}>
    {items.length === 0 ? (
      <View style={styles.emptyState}>
        <ThemedText style={styles.emptyMessage}>{emptyMessage}</ThemedText>
      </View>
    ) : (
      items.slice(0, 4).map((item) => (
        <View key={item.id} style={styles.listItem}>
          {item.icon && (
            <View style={[styles.listItemIcon, { backgroundColor: item.color || Colors.light.primary }]}>
              <Ionicons name={item.icon as any} size={16} color="white" />
            </View>
          )}
          <View style={styles.listItemContent}>
            <ThemedText style={styles.listItemTitle}>{item.title}</ThemedText>
            {item.subtitle && (
              <ThemedText style={styles.listItemSubtitle}>{item.subtitle}</ThemedText>
            )}
          </View>
          {item.value && (
            <ThemedText style={styles.listItemValue}>{item.value}</ThemedText>
          )}
        </View>
      ))
    )}
  </View>
);

export const ChartWidget: React.FC<{
  data: Array<{ label: string; value: number }>;
  type: 'bar' | 'line' | 'pie';
  color?: string;
  showValues?: boolean;
}> = ({ data, type, color = Colors.light.primary, showValues = false }) => {
  const maxValue = Math.max(...data.map(item => item.value));

  if (type === 'bar') {
    return (
      <View style={styles.chartWidget}>
        <View style={styles.barChart}>
          {data.slice(0, 6).map((item, index) => {
            const barHeight = maxValue > 0 ? (item.value / maxValue) * 60 : 0;
            
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barColumn}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: color,
                      }
                    ]}
                  />
                </View>
                <ThemedText style={styles.barLabel} numberOfLines={1}>
                  {item.label}
                </ThemedText>
                {showValues && (
                  <ThemedText style={styles.barValue}>
                    {item.value}
                  </ThemedText>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // Simplified line chart for small widgets
  return (
    <View style={styles.chartWidget}>
      <View style={styles.lineChart}>
        {data.map((item, index) => {
          const pointHeight = maxValue > 0 ? (item.value / maxValue) * 60 : 0;
          const x = (index / (data.length - 1)) * 100;
          
          return (
            <View
              key={index}
              style={[
                styles.dataPoint,
                {
                  left: `${x}%`,
                  bottom: pointHeight,
                  backgroundColor: color,
                }
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  editingContainer: {
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    color: Colors.light.text,
    fontSize: 14,
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 4,
  },
  refreshText: {
    fontSize: 10,
    color: Colors.light.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuToggle: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  content: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    top: 40,
    right: 16,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    zIndex: 1000,
    minWidth: 120,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  menuButtonText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  sizeIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sizeText: {
    fontSize: 8,
    color: 'white',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  // Metric Widget Styles
  metricWidget: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricTitle: {
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  metricChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  // List Widget Styles
  listWidget: {
    flex: 1,
    gap: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMessage: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 12,
    color: Colors.light.text,
    marginBottom: 1,
  },
  listItemSubtitle: {
    fontSize: 10,
    color: Colors.light.textSecondary,
  },
  listItemValue: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  // Chart Widget Styles
  chartWidget: {
    flex: 1,
    justifyContent: 'center',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 30,
  },
  barColumn: {
    height: 60,
    width: 12,
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  bar: {
    width: '100%',
    borderRadius: 2,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 8,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 1,
  },
  barValue: {
    fontSize: 7,
    color: Colors.light.textMuted,
    textAlign: 'center',
  },
  lineChart: {
    height: 60,
    position: 'relative',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 4,
  },
  dataPoint: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: -2,
    marginBottom: -2,
  },
});