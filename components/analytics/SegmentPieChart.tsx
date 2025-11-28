import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Colors } from '../../constants/Colors';

interface SegmentData {
  id: string;
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}

interface SegmentPieChartProps {
  data: SegmentData[];
  width?: number;
  height?: number;
  type?: 'pie' | 'donut';
  showLegend?: boolean;
  showPercentages?: boolean;
  onSegmentPress?: (segment: SegmentData) => void;
  centerLabel?: string;
  centerValue?: string;
}

const CHART_SIZE = 200;
const DONUT_HOLE_RATIO = 0.6;

export const SegmentPieChart: React.FC<SegmentPieChartProps> = ({
  data,
  width = Dimensions.get('window').width - 32,
  height = 320,
  type = 'donut',
  showLegend = true,
  showPercentages = true,
  onSegmentPress,
  centerLabel,
  centerValue,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  // Default colors
  const defaultColors = [
    theme.primary,
    theme.secondary,
    theme.tertiary,
    theme.info,
    theme.warning,
    '#EC4899',
    '#8B5CF6',
    '#14B8A6',
  ];

  // Calculate total and percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const segments = data.map((item, index) => ({
    ...item,
    color: item.color || defaultColors[index % defaultColors.length],
    percentage: (item.value / total) * 100,
  }));

  // Calculate pie slices
  const calculatePieSlices = () => {
    let currentAngle = -90; // Start from top

    return segments.map((segment) => {
      const angle = (segment.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      currentAngle = endAngle;

      return {
        ...segment,
        startAngle,
        endAngle,
        angle,
      };
    });
  };

  const pieSlices = calculatePieSlices();

  // Create SVG path for pie slice (simplified for React Native)
  const createSlicePath = (
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
      `M ${centerX} ${centerY}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      'Z',
    ].join(' ');
  };

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // Render chart segments (using approximation with View components)
  const renderSegments = () => {
    const centerX = CHART_SIZE / 2;
    const centerY = CHART_SIZE / 2;
    const radius = CHART_SIZE / 2;

    return pieSlices.map((slice, index) => {
      const isSelected = selectedSegment === slice.id;
      const midAngle = (slice.startAngle + slice.endAngle) / 2;
      const labelRadius = type === 'donut' ? radius * 0.8 : radius * 0.7;
      const labelPos = polarToCartesian(centerX, centerY, labelRadius, midAngle);

      return (
        <TouchableOpacity
          key={slice.id}
          style={[
            styles.segmentContainer,
            {
              transform: [
                { translateX: centerX },
                { translateY: centerY },
                { rotate: `${slice.startAngle}deg` },
              ],
            },
          ]}
          onPress={() => {
            setSelectedSegment(isSelected ? null : slice.id);
            onSegmentPress?.(slice);
          }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.segment,
              {
                width: radius * 2,
                height: radius * 2,
                backgroundColor: slice.color,
                opacity: isSelected || !selectedSegment ? 1 : 0.5,
              },
            ]}
          />

          {/* Percentage label */}
          {showPercentages && slice.percentage > 5 && (
            <View
              style={[
                styles.percentageLabel,
                {
                  left: labelPos.x - 20,
                  top: labelPos.y - 10,
                },
              ]}
            >
              <Text style={styles.percentageText}>
                {slice.percentage.toFixed(0)}%
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    });
  };

  // Render legend
  const renderLegend = () => {
    if (!showLegend) return null;

    return (
      <View style={styles.legend}>
        {segments.map((segment) => {
          const isSelected = selectedSegment === segment.id;

          return (
            <TouchableOpacity
              key={segment.id}
              style={[
                styles.legendItem,
                {
                  opacity: isSelected || !selectedSegment ? 1 : 0.5,
                },
              ]}
              onPress={() => {
                setSelectedSegment(isSelected ? null : segment.id);
                onSegmentPress?.(segment);
              }}
            >
              <View
                style={[
                  styles.legendColor,
                  {
                    backgroundColor: segment.color,
                  },
                ]}
              />
              <View style={styles.legendTextContainer}>
                <Text style={[styles.legendLabel, { color: theme.text }]}>
                  {segment.label}
                </Text>
                <Text style={[styles.legendValue, { color: theme.textSecondary }]}>
                  {segment.value.toLocaleString()} ({segment.percentage.toFixed(1)}%)
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Chart */}
      <View style={styles.chartContainer}>
        <View
          style={[
            styles.chart,
            {
              width: CHART_SIZE,
              height: CHART_SIZE,
            },
          ]}
        >
          {/* Simplified visualization using colored arcs */}
          {pieSlices.map((slice, index) => {
            const isSelected = selectedSegment === slice.id;
            const segmentAngle = slice.angle;
            const segmentRotation = slice.startAngle + 90;

            return (
              <TouchableOpacity
                key={slice.id}
                style={[
                  styles.pieSlice,
                  {
                    width: CHART_SIZE,
                    height: CHART_SIZE,
                    transform: [{ rotate: `${segmentRotation}deg` }],
                  },
                ]}
                onPress={() => {
                  setSelectedSegment(isSelected ? null : slice.id);
                  onSegmentPress?.(slice);
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.pieSegment,
                    {
                      backgroundColor: slice.color,
                      opacity: isSelected || !selectedSegment ? 1 : 0.6,
                      width: CHART_SIZE / 2,
                      height: CHART_SIZE / 2,
                      borderTopRightRadius: CHART_SIZE / 2,
                      transform: [
                        { rotate: `${Math.min(segmentAngle, 90)}deg` },
                        { translateX: CHART_SIZE / 4 },
                        { translateY: -CHART_SIZE / 4 },
                      ],
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}

          {/* Donut hole */}
          {type === 'donut' && (
            <View
              style={[
                styles.donutHole,
                {
                  width: CHART_SIZE * DONUT_HOLE_RATIO,
                  height: CHART_SIZE * DONUT_HOLE_RATIO,
                  backgroundColor: theme.background,
                },
              ]}
            >
              {centerLabel && (
                <Text style={[styles.centerLabel, { color: theme.textSecondary }]}>
                  {centerLabel}
                </Text>
              )}
              {centerValue && (
                <Text style={[styles.centerValue, { color: theme.text }]}>
                  {centerValue}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Legend */}
      {renderLegend()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  chart: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentContainer: {
    position: 'absolute',
  },
  segment: {
    borderRadius: 9999,
  },
  pieSlice: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieSegment: {
    position: 'absolute',
  },
  percentageLabel: {
    position: 'absolute',
    width: 40,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  donutHole: {
    position: 'absolute',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  centerValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  legend: {
    width: '100%',
    paddingHorizontal: 16,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  legendValue: {
    fontSize: 12,
  },
});
