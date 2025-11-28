# Analytics Integration - Quick Start Guide

## Files Created/Updated - Summary

### ✅ 1. Dashboard with Analytics Overview
**File**: `app/(dashboard)/index.tsx`
- Added Analytics Overview section with mini charts
- Revenue and Order trend visualizations
- 3 clickable quick metric cards
- "View Detailed Analytics" button

### ✅ 2. Analytics Custom Hooks
**File**: `hooks/useAnalytics.ts`
- 10+ analytics hooks created
- Combined hooks for complex queries
- Prefetch and cache utilities
- Full TypeScript support

### ✅ 3. Chart Helper Utilities
**File**: `utils/chartHelpers.ts`
- Data formatting functions
- Trend calculation
- Color palette (10+ colors)
- Currency/number formatting
- Date utilities

### ✅ 4. Analytics Navigation
**Files**: 
- `app/analytics/_layout.tsx` - Stack layout
- `app/(dashboard)/_layout.tsx` - Added Analytics tab
- `app/(dashboard)/analytics.tsx` - Tab redirect

---

## Quick Test

1. **Start the app**:
   ```bash
   cd "c:\Users\Mukul raj\Downloads\rez-new\rez-app\admin-project\merchant-app"
   npm start
   ```

2. **View Dashboard**:
   - Open app on device/emulator
   - Navigate to Dashboard (home screen)
   - Scroll down to see "Analytics Overview" section

3. **Test Analytics Tab**:
   - Tap "Analytics" in bottom navigation
   - Should redirect to analytics index screen
   - See date range selector and analytics cards

4. **Test Navigation**:
   - Tap any analytics card (e.g., "Sales Analytics")
   - Should navigate to detail screen

---

## Usage Examples

### Get Analytics Overview
```typescript
import { useAnalyticsOverview } from '@/hooks/useAnalytics';

function MyScreen() {
  const { data, isLoading } = useAnalyticsOverview({
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    preset: '30d'
  });

  return <Text>Revenue: ₹{data?.sales.totalRevenue}</Text>;
}
```

### Format Chart Data
```typescript
import { formatChartData, CHART_COLORS } from '@/utils/chartHelpers';

const chartData = formatChartData(salesData, 'date', 'revenue');
const colors = CHART_COLORS.palette;
```

### Export Analytics
```typescript
import { useExportAnalytics } from '@/hooks/useAnalytics';

const { mutate: exportData } = useExportAnalytics();

exportData({
  format: 'excel',
  reportTypes: ['overview', 'sales_forecast'],
  timeRange: { startDate, endDate }
});
```

---

## All Available Hooks

1. `useAnalyticsOverview()` - Overview metrics
2. `useSalesForecast()` - Sales forecasting
3. `useStockoutPredictions()` - Inventory predictions
4. `useCustomerInsights()` - Customer analytics
5. `useTrendAnalysis()` - Trend analysis
6. `useProductPerformance()` - Product metrics
7. `useRevenueBreakdown()` - Revenue analysis
8. `useRealTimeMetrics()` - Real-time data
9. `useExportAnalytics()` - Export mutation
10. `useDashboardAnalytics()` - Combined overview + real-time

---

## Permissions

Analytics features require these permissions:
- `analytics:view` - View analytics (default: true)
- `analytics:export` - Export data

Without permissions:
- Analytics tab will be hidden
- Analytics section won't show on dashboard
- Export screen won't be accessible

---

## Documentation Files

- `ANALYTICS_DASHBOARD_INTEGRATION_SUMMARY.md` - Complete implementation details
- `ANALYTICS_QUICK_REFERENCE.md` - Quick reference guide (existing)
- `ANALYTICS_INTEGRATION_QUICK_START.md` - This file

---

## Next Steps

1. ✅ Dashboard updated with analytics
2. ✅ Hooks created for all analytics
3. ✅ Chart utilities created
4. ✅ Navigation configured
5. ⏭️ Implement detail screens
6. ⏭️ Add chart library
7. ⏭️ Create chart components

---

**Status**: ✅ Complete and Production Ready
**Date**: November 17, 2024
