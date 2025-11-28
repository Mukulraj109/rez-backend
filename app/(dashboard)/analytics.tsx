import { Redirect } from 'expo-router';

/**
 * Analytics tab redirect
 * Redirects to the analytics index screen
 */
export default function AnalyticsTab() {
  return <Redirect href="/analytics" />;
}
