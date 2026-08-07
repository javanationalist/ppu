import React from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { DashboardLayout } from './DashboardLayout';

export default function UserDashboard() {
  const dashboardData = useDashboardData();
  return <DashboardLayout data={dashboardData} />;
}
