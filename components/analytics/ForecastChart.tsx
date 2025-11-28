import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';
import { LineChart } from './LineChart';

interface ForecastData {
  date: string;
  actual?: number;
  predicted?: number;
  confidenceUpper?: number;
  confidenceLower?: number;
}

interface KeyDate {
  date: string;
  label: string;
  color?: string;
}

interface ForecastChartProps {
  data: ForecastData[];
  title?: string;
  width?: number;
  height?: number;
  keyDates?: KeyDate[];
  showConfidenceInterval?: boolean;
  formatValue?: (value: number) => string;
  onZoom?: (scale: number) => void;
  onPan?: (offset: number) => void;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  data,
  title,
  width,
  height = 300,
  keyDates = [],
  showConfidenceInterval = true,
  formatValue,
  onZoom,
  onPan,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Split data into historical and forecast
  const splitIndex = data.findIndex((d) => d.actual === undefined && d.predicted !== undefined);
  const hasHistorical = splitIndex > 0;

  // Prepare series data
  const series = [];

  // Historical data (solid line)
  if (hasHistorical) {
    const historicalData = data
      .slice(0, splitIndex + 1)
      .filter((d) => d.actual !== undefined)
      .map((d, i) => ({
        x: d.date,
        y: d.actual!,
      }));

    series.push({
      id: 'historical',
      name: 'Historical',
      data: historicalData,
      color: theme.primary,
      showConfidenceInterval: false,
    });
  }

  // Forecast data (dashed line)
  const forecastData = data
    .slice(Math.max(0, splitIndex))
    .filter((d) => d.predicted !== undefined)
    .map((d, i) => ({
      x: d.date,
      y: d.predicted!,
    }));

  if (forecastData.length > 0) {
    // Add confidence interval data
    const confidenceUpper = data
      .slice(Math.max(0, splitIndex))
      .filter((d) => d.predicted !== undefined)
      .map((d) => d.confidenceUpper ?? d.predicted! * 1.1);

    const confidenceLower = data
      .slice(Math.max(0, splitIndex))
      .filter((d) => d.predicted !== undefined)
      .map((d) => d.confidenceLower ?? d.predicted! * 0.9);

    series.push({
      id: 'forecast',
      name: 'Forecast',
      data: forecastData,
      color: theme.info,
      dashed: true,
      showConfidenceInterval,
      confidenceUpper,
      confidenceLower,
    });
  }

  return (
    <View style={styles.container}>
      {/* Title */}
      {title && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        </View>
      )}

      {/* Chart */}
      <LineChart
        series={series}
        width={width}
        height={height}
        showLegend={true}
        showGrid={true}
        showTooltip={true}
        xAxisLabel="Date"
        yAxisLabel="Value"
        formatYValue={formatValue}
        formatXValue={(value) => {
          const date = new Date(value.toString());
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }}
      />

      {/* Key dates markers */}
      {keyDates.length > 0 && (
        <View style={styles.keyDatesContainer}>
          <Text style={[styles.keyDatesTitle, { color: theme.textSecondary }]}>
            Key Dates:
          </Text>
          {keyDates.map((keyDate, index) => (
            <View key={index} style={styles.keyDateItem}>
              <View
                style={[
                  styles.keyDateMarker,
                  {
                    backgroundColor: keyDate.color || theme.warning,
                  },
                ]}
              />
              <Text style={[styles.keyDateLabel, { color: theme.text }]}>
                {keyDate.label}
              </Text>
              <Text style={[styles.keyDateDate, { color: theme.textSecondary }]}>
                {new Date(keyDate.date).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Confidence interval info */}
      {showConfidenceInterval && (
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor: theme.info + '20',
                },
              ]}
            />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              95% Confidence Interval
            </Text>
          </View>
        </View>
      )}

      {/* Interpretation guide */}
      <View style={[styles.guide, { backgroundColor: theme.backgroundSecondary }]}>
        <Text style={[styles.guideTitle, { color: theme.text }]}>
          How to Read This Chart:
        </Text>
        <Text style={[styles.guideText, { color: theme.textSecondary }]}>
          • Solid line shows actual historical data
        </Text>
        <Text style={[styles.guideText, { color: theme.textSecondary }]}>
          • Dashed line shows predicted future values
        </Text>
        {showConfidenceInterval && (
          <Text style={[styles.guideText, { color: theme.textSecondary }]}>
            • Shaded area represents 95% confidence interval
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  keyDatesContainer: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  keyDatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  keyDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyDateMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  keyDateLabel: {
    fontSize: 13,
    flex: 1,
  },
  keyDateDate: {
    fontSize: 12,
  },
  infoContainer: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoBox: {
    width: 20,
    height: 12,
    borderRadius: 2,
  },
  infoText: {
    fontSize: 12,
  },
  guide: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  guideText: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 18,
  },
});
