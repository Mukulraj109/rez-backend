/**
 * Dashboard Audit Tab Entry Point
 * Redirects to the audit logs screen
 */

import { Redirect } from 'expo-router';

export default function DashboardAuditTab() {
  return <Redirect href="/audit" />;
}
