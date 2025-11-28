import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Colors } from '../../constants/Colors';

interface BarData {
  label: string;
  value: number;
  color?: string;
  groupValues?: number[]; // For grouped bars
}

interface BarChartProps {
  data: BarData[];
  width?: number;
  height?: number;
  orientation?: 'vertical' | 'horizontal';
  type?: 'single' | 'grouped' | 'stacked';
  showValues?: boolean;
  showGrid?: boolean;
  formatValue?: (value: number) => string;
  barColors?: string[];
  groupLabels?: string[];
  maxValue?: number;
  onBarPress?: (bar: BarData, index: number) => void;
}

const CHART_PADDING = 40;
const BAR_SPACING = 8;
const GROUP_SPACING = 20;

export const BarChart: React.FC<BarChartProps> = ({
  data,
  width = Dimensions.get('window').width - 32,
  height = 300,
  orientation = 'vertical',
  type = 'single',
  showValues = true,
  showGrid = true,
  formatValue = (value) => value.toFixed(0),
  barColors,
  groupLabels,
  maxValue: providedMaxValue,
  onBarPress,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  // Calculate max value
  const maxValue =
    providedMaxValue ||
    Math.max(
      ...data.map((d) =>
        type === 'stacked' && d.groupValues
          ? d.groupValues.reduce((sum, val) => sum + val, 0)
          : type === 'grouped' && d.groupValues
          ? Math.max(...d.groupValues)
          : d.value
      )
    ) * 1.1;

  // Colors
  const defaultColors = [
    theme.primary,
    theme.secondary,
    theme.tertiary,
    theme.info,
    theme.warning,
  ];
  const colors = barColors || defaultColors;

  // Chart dimensions
  const chartWidth = orientation === 'vertical' ? width - CHART_PADDING * 2 : width - 150;
  const chartHeight = orientation === 'vertical' ? height - 80 : height - CHART_PADDING * 2;

  // Bar dimensions
  const barWidth =
    orientation === 'vertical'
      ? (chartWidth - (data.length - 1) * GROUP_SPACING) / data.length - BAR_SPACING
      : 30;
  const barHeight =
    orientation === 'horizontal'
      ? (chartHeight - (data.length - 1) * GROUP_SPACING) / data.length - BAR_SPACING
      : 0;

  // Scale functions
  const scaleValue = (value: number) => {
    return orientation === 'vertical'
      ? (value / maxValue) * chartHeight
      : (value / maxValue) * chartWidth;
  };

  // Render grid lines
  const renderGridLines = () => {
    if (!showGrid) return null;

    const gridLines = [];
    const steps = 5;

    for (let i = 0; i <= steps; i++) {
      const value = (maxValue / steps) * i;
      const position = scaleValue(value);

      if (orientation === 'vertical') {
        gridLines.push(
          <View
            key={`grid-${i}`}
            style={[
              styles.gridLineHorizontal,
              {
                bottom: position,
                width: chartWidth,
                backgroundColor: theme.borderLight,
              },
            ]}
          >
            <Text
              style={[
                styles.gridLabel,
                {
                  left: -CHART_PADDING + 5,
                  color: theme.textSecondary,
                },
              ]}
            >
              {formatValue(value)}
            </Text>
          </View>
        );
      } else {
        gridLines.push(
          <View
            key={`grid-${i}`}
            style={[
              styles.gridLineVertical,
              {
                left: position,
                height: chartHeight,
                backgroundColor: theme.borderLight,
              },
            ]}
          >
            <Text
              style={[
                styles.gridLabelHorizontal,
                {
                  top: chartHeight + 5,
                  color: theme.textSecondary,
                },
              ]}
            >
              {formatValue(value)}
            </Text>
          </View>
        );
      }
    }

    return gridLines;
  };

  // Render single bar
  const renderSingleBar = (bar: BarData, index: number) => {
    const barValue = scaleValue(bar.value);
    const color = bar.color || colors[index % colors.length];
    const isSelected = selectedBar === index;

    if (orientation === 'vertical') {
      const left = index * (barWidth + BAR_SPACING + GROUP_SPACING);

      return (
        <View key={index} style={[styles.barContainer, { left }]}>
          <TouchableOpacity
            style={[
              styles.barVertical,
              {
                width: barWidth,
                height: barValue,
                backgroundColor: color,
                opacity: isSelected ? 1 : 0.9,
              },
            ]}
            onPress={() => {
              setSelectedBar(index);
              onBarPress?.(bar, index);
            }}
          >
            {showValues && (
              <Text style={[styles.barValueTop, { color: theme.background }]}>
                {formatValue(bar.value)}
              </Text>
            )}
          </TouchableOpacity>
          <Text
            style={[
              styles.barLabel,
              {
                width: barWidth + GROUP_SPACING,
                color: theme.textSecondary,
              },
            ]}
            numberOfLines={2}
          >
            {bar.label}
          </Text>
        </View>
      );
    } else {
      const top = index * (barHeight + BAR_SPACING + GROUP_SPACING);

      return (
        <View key={index} style={[styles.barContainerHorizontal, { top }]}>
          <Text
            style={[
              styles.barLabelHorizontal,
              {
                color: theme.textSecondary,
              },
            ]}
            numberOfLines={1}
          >
            {bar.label}
          </Text>
          <TouchableOpacity
            style={[
              styles.barHorizontal,
              {
                width: barValue,
                height: barHeight,
                backgroundColor: color,
                opacity: isSelected ? 1 : 0.9,
              },
            ]}
            onPress={() => {
              setSelectedBar(index);
              onBarPress?.(bar, index);
            }}
          >
            {showValues && (
              <Text style={[styles.barValueRight, { color: theme.background }]}>
                {formatValue(bar.value)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }
  };

  // Render grouped bars
  const renderGroupedBars = (bar: BarData, index: number) => {
    if (!bar.groupValues) return null;

    const groupWidth = barWidth / bar.groupValues.length;
    const left = index * (barWidth + BAR_SPACING + GROUP_SPACING);

    return (
      <View key={index} style={[styles.barGroupContainer, { left }]}>
        <View style={styles.barGroup}>
          {bar.groupValues.map((value, groupIndex) => {
            const barValue = scaleValue(value);
            const color = colors[groupIndex % colors.length];

            return (
              <TouchableOpacity
                key={groupIndex}
                style={[
                  styles.barVertical,
                  {
                    width: groupWidth - 2,
                    height: barValue,
                    backgroundColor: color,
                    marginHorizontal: 1,
                  },
                ]}
                onPress={() => {
                  setSelectedBar(index);
                  onBarPress?.(bar, index);
                }}
              >
                {showValues && (
                  <Text
                    style={[styles.barValueTop, { color: theme.background, fontSize: 9 }]}
                  >
                    {formatValue(value)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text
          style={[
            styles.barLabel,
            {
              width: barWidth + GROUP_SPACING,
              color: theme.textSecondary,
            },
          ]}
          numberOfLines={2}
        >
          {bar.label}
        </Text>
      </View>
    );
  };

  // Render stacked bars
  const renderStackedBars = (bar: BarData, index: number) => {
    if (!bar.groupValues) return null;

    const left = index * (barWidth + BAR_SPACING + GROUP_SPACING);
    const totalValue = bar.groupValues.reduce((sum, val) => sum + val, 0);
    const totalHeight = scaleValue(totalValue);

    let currentBottom = 0;

    return (
      <View key={index} style={[styles.barContainer, { left }]}>
        <View style={[styles.barVertical, { width: barWidth, height: totalHeight }]}>
          {bar.groupValues.map((value, groupIndex) => {
            const segmentHeight = scaleValue(value);
            const color = colors[groupIndex % colors.length];
            const segment = (
              <View
                key={groupIndex}
                style={[
                  styles.barSegment,
                  {
                    width: barWidth,
                    height: segmentHeight,
                    backgroundColor: color,
                    bottom: currentBottom,
                  },
                ]}
              >
                {showValues && segmentHeight > 20 && (
                  <Text
                    style={[styles.barValueTop, { color: theme.background, fontSize: 10 }]}
                  >
                    {formatValue(value)}
                  </Text>
                )}
              </View>
            );

            currentBottom += segmentHeight;
            return segment;
          })}
        </View>
        <Text
          style={[
            styles.barLabel,
            {
              width: barWidth + GROUP_SPACING,
              color: theme.textSecondary,
            },
          ]}
          numberOfLines={2}
        >
          {bar.label}
        </Text>
      </View>
    );
  };

  // Render legend for grouped/stacked charts
  const renderLegend = () => {
    if (type === 'single' || !groupLabels) return null;

    return (
      <View style={styles.legend}>
        {groupLabels.map((label, index) => (
          <View key={index} style={styles.legendItem}>
            <View
              style={[
                styles.legendColor,
                { backgroundColor: colors[index % colors.length] },
              ]}
            />
            <Text style={[styles.legendText, { color: theme.text }]}>{label}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      horizontal={orientation === 'vertical'}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.container, { width, height }]}>
        <View
          style={[
            styles.chartContainer,
            {
              marginLeft: orientation === 'vertical' ? CHART_PADDING : 120,
              marginBottom: orientation === 'vertical' ? 60 : CHART_PADDING,
              marginTop: 20,
            },
          ]}
        >
          {/* Grid lines */}
          <View
            style={[
              styles.gridContainer,
              {
                width: chartWidth,
                height: chartHeight,
              },
            ]}
          >
            {renderGridLines()}
          </View>

          {/* Bars */}
          <View
            style={[
              styles.barsContainer,
              {
                width: chartWidth,
                height: chartHeight,
              },
            ]}
          >
            {data.map((bar, index) => {
              if (type === 'grouped') {
                return renderGroupedBars(bar, index);
              } else if (type === 'stacked') {
                return renderStackedBars(bar, index);
              } else {
                return renderSingleBar(bar, index);
              }
            })}
          </View>
        </View>

        {/* Legend */}
        {renderLegend()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  chartContainer: {
    position: 'relative',
  },
  gridContainer: {
    position: 'absolute',
  },
  gridLineHorizontal: {
    position: 'absolute',
    height: 1,
  },
  gridLineVertical: {
    position: 'absolute',
    width: 1,
  },
  gridLabel: {
    position: 'absolute',
    fontSize: 10,
    textAlign: 'right',
    width: 35,
  },
  gridLabelHorizontal: {
    position: 'absolute',
    fontSize: 10,
    textAlign: 'center',
    width: 40,
  },
  barsContainer: {
    position: 'relative',
  },
  barContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  barContainerHorizontal: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  barGroupContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barVertical: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
  },
  barHorizontal: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  barSegment: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barLabel: {
    marginTop: 8,
    fontSize: 11,
    textAlign: 'center',
  },
  barLabelHorizontal: {
    fontSize: 11,
    width: 100,
    textAlign: 'right',
    marginRight: 10,
  },
  barValueTop: {
    fontSize: 11,
    fontWeight: '600',
  },
  barValueRight: {
    fontSize: 11,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 15,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
  },
});
