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

interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
}

interface DataSeries {
  id: string;
  name: string;
  data: DataPoint[];
  color: string;
  showConfidenceInterval?: boolean;
  confidenceUpper?: number[];
  confidenceLower?: number[];
  dashed?: boolean;
}

interface LineChartProps {
  series: DataSeries[];
  width?: number;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  formatYValue?: (value: number) => string;
  formatXValue?: (value: number | string) => string;
}

const CHART_PADDING = 40;
const LEGEND_HEIGHT = 40;

export const LineChart: React.FC<LineChartProps> = ({
  series,
  width = Dimensions.get('window').width - 32,
  height = 250,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  xAxisLabel,
  yAxisLabel,
  formatYValue = (value) => value.toFixed(0),
  formatXValue = (value) => value.toString(),
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [selectedPoint, setSelectedPoint] = useState<{
    seriesId: string;
    pointIndex: number;
    x: number;
    y: number;
  } | null>(null);

  // Calculate chart dimensions
  const chartWidth = width - CHART_PADDING * 2;
  const chartHeight = height - CHART_PADDING * 2 - (showLegend ? LEGEND_HEIGHT : 0);

  // Find min/max values across all series
  const allYValues = series.flatMap((s) => s.data.map((d) => d.y));
  const minY = Math.min(...allYValues, 0);
  const maxY = Math.max(...allYValues);
  const yRange = maxY - minY || 1;

  const allXValues = series[0]?.data.map((d, i) => i) || [];
  const maxX = allXValues.length - 1 || 1;

  // Scale functions
  const scaleX = (index: number) => (index / maxX) * chartWidth;
  const scaleY = (value: number) => chartHeight - ((value - minY) / yRange) * chartHeight;

  // Generate path for line
  const generatePath = (data: DataPoint[], dashed = false) => {
    if (data.length === 0) return '';

    let path = `M ${scaleX(0)} ${scaleY(data[0].y)}`;

    for (let i = 1; i < data.length; i++) {
      const x = scaleX(i);
      const y = scaleY(data[i].y);
      path += ` L ${x} ${y}`;
    }

    return path;
  };

  // Generate path for confidence interval
  const generateConfidencePath = (
    data: DataPoint[],
    upper?: number[],
    lower?: number[]
  ) => {
    if (!upper || !lower || data.length === 0) return '';

    let path = `M ${scaleX(0)} ${scaleY(upper[0])}`;

    // Draw upper line
    for (let i = 1; i < data.length; i++) {
      path += ` L ${scaleX(i)} ${scaleY(upper[i])}`;
    }

    // Draw lower line in reverse
    for (let i = data.length - 1; i >= 0; i--) {
      path += ` L ${scaleX(i)} ${scaleY(lower[i])}`;
    }

    path += ' Z';
    return path;
  };

  // Render grid lines
  const renderGridLines = () => {
    if (!showGrid) return null;

    const gridLines = [];
    const ySteps = 5;

    for (let i = 0; i <= ySteps; i++) {
      const y = (chartHeight / ySteps) * i;
      gridLines.push(
        <View
          key={`grid-${i}`}
          style={[
            styles.gridLine,
            {
              top: y,
              backgroundColor: theme.borderLight,
            },
          ]}
        />
      );
    }

    return gridLines;
  };

  // Render Y-axis labels
  const renderYAxisLabels = () => {
    const labels = [];
    const ySteps = 5;

    for (let i = 0; i <= ySteps; i++) {
      const value = minY + (yRange / ySteps) * (ySteps - i);
      const y = (chartHeight / ySteps) * i;

      labels.push(
        <Text
          key={`y-label-${i}`}
          style={[
            styles.axisLabel,
            {
              top: y - 8,
              left: 0,
              color: theme.textSecondary,
            },
          ]}
        >
          {formatYValue(value)}
        </Text>
      );
    }

    return labels;
  };

  // Render X-axis labels
  const renderXAxisLabels = () => {
    const data = series[0]?.data || [];
    const maxLabels = 6;
    const step = Math.max(1, Math.floor(data.length / maxLabels));

    return data.map((point, index) => {
      if (index % step !== 0 && index !== data.length - 1) return null;

      return (
        <Text
          key={`x-label-${index}`}
          style={[
            styles.xAxisLabel,
            {
              left: scaleX(index) - 20,
              color: theme.textSecondary,
            },
          ]}
        >
          {formatXValue(point.x)}
        </Text>
      );
    });
  };

  // Render legend
  const renderLegend = () => {
    if (!showLegend) return null;

    return (
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.id} style={styles.legendItem}>
            <View
              style={[
                styles.legendColor,
                { backgroundColor: s.color },
                s.dashed && styles.legendDashed,
              ]}
            />
            <Text style={[styles.legendText, { color: theme.text }]}>{s.name}</Text>
          </View>
        ))}
      </View>
    );
  };

  // Render tooltip
  const renderTooltip = () => {
    if (!showTooltip || !selectedPoint) return null;

    const seriesData = series.find((s) => s.id === selectedPoint.seriesId);
    if (!seriesData) return null;

    const point = seriesData.data[selectedPoint.pointIndex];

    return (
      <View
        style={[
          styles.tooltip,
          {
            left: selectedPoint.x - 50,
            top: selectedPoint.y - 60,
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.tooltipLabel, { color: theme.textSecondary }]}>
          {formatXValue(point.x)}
        </Text>
        <Text style={[styles.tooltipValue, { color: theme.text }]}>
          {formatYValue(point.y)}
        </Text>
        <Text style={[styles.tooltipSeries, { color: seriesData.color }]}>
          {seriesData.name}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.container, { width: Math.max(width, 400) }]}>
        {/* Y-axis label */}
        {yAxisLabel && (
          <Text
            style={[
              styles.yAxisTitle,
              {
                color: theme.textSecondary,
                left: 5,
                top: height / 2,
              },
            ]}
          >
            {yAxisLabel}
          </Text>
        )}

        {/* Chart area */}
        <View
          style={[
            styles.chartContainer,
            {
              marginLeft: CHART_PADDING,
              marginTop: CHART_PADDING,
              marginBottom: showLegend ? LEGEND_HEIGHT : CHART_PADDING,
            },
          ]}
        >
          {/* Grid lines */}
          <View style={[styles.gridContainer, { width: chartWidth, height: chartHeight }]}>
            {renderGridLines()}
          </View>

          {/* Y-axis labels */}
          <View style={[styles.yAxisLabels, { height: chartHeight }]}>
            {renderYAxisLabels()}
          </View>

          {/* SVG-like rendering using Views (simplified for React Native) */}
          <View style={[styles.linesContainer, { width: chartWidth, height: chartHeight }]}>
            {series.map((s) => (
              <View key={s.id} style={StyleSheet.absoluteFill}>
                {/* Confidence interval */}
                {s.showConfidenceInterval && s.confidenceUpper && s.confidenceLower && (
                  <View
                    style={[
                      styles.confidenceArea,
                      {
                        backgroundColor: s.color + '20',
                      },
                    ]}
                  />
                )}

                {/* Data points */}
                {s.data.map((point, index) => {
                  const x = scaleX(index);
                  const y = scaleY(point.y);

                  return (
                    <React.Fragment key={`${s.id}-${index}`}>
                      {/* Line segment */}
                      {index > 0 && (
                        <View
                          style={[
                            styles.lineSegment,
                            {
                              position: 'absolute',
                              left: scaleX(index - 1),
                              top: scaleY(s.data[index - 1].y),
                              width: Math.sqrt(
                                Math.pow(x - scaleX(index - 1), 2) +
                                  Math.pow(y - scaleY(s.data[index - 1].y), 2)
                              ),
                              height: 2,
                              backgroundColor: s.color,
                              transform: [
                                {
                                  rotate: `${Math.atan2(
                                    y - scaleY(s.data[index - 1].y),
                                    x - scaleX(index - 1)
                                  )}rad`,
                                },
                              ],
                            },
                            s.dashed && styles.dashedLine,
                          ]}
                        />
                      )}

                      {/* Data point */}
                      <TouchableOpacity
                        style={[
                          styles.dataPoint,
                          {
                            left: x - 4,
                            top: y - 4,
                            backgroundColor: s.color,
                            borderColor: theme.background,
                          },
                        ]}
                        onPress={() => {
                          setSelectedPoint({
                            seriesId: s.id,
                            pointIndex: index,
                            x: x + CHART_PADDING,
                            y: y + CHART_PADDING,
                          });
                        }}
                      />
                    </React.Fragment>
                  );
                })}
              </View>
            ))}
          </View>

          {/* X-axis labels */}
          <View style={[styles.xAxisLabels, { width: chartWidth, top: chartHeight + 10 }]}>
            {renderXAxisLabels()}
          </View>

          {/* Tooltip */}
          {renderTooltip()}
        </View>

        {/* X-axis label */}
        {xAxisLabel && (
          <Text
            style={[
              styles.xAxisTitle,
              {
                color: theme.textSecondary,
                bottom: showLegend ? LEGEND_HEIGHT - 10 : 10,
              },
            ]}
          >
            {xAxisLabel}
          </Text>
        )}

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
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  yAxisLabels: {
    position: 'absolute',
    left: -40,
    top: 0,
  },
  xAxisLabels: {
    position: 'absolute',
    height: 30,
  },
  axisLabel: {
    position: 'absolute',
    fontSize: 10,
    textAlign: 'right',
    width: 35,
  },
  xAxisLabel: {
    position: 'absolute',
    fontSize: 10,
    width: 40,
    textAlign: 'center',
  },
  yAxisTitle: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '600',
    transform: [{ rotate: '-90deg' }],
  },
  xAxisTitle: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  linesContainer: {
    position: 'relative',
  },
  lineSegment: {
    position: 'absolute',
  },
  dashedLine: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  confidenceArea: {
    position: 'absolute',
    opacity: 0.3,
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  tooltip: {
    position: 'absolute',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  tooltipSeries: {
    fontSize: 11,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
  },
  legendDashed: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  legendText: {
    fontSize: 12,
  },
});
