import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Maintenance from '../pages/Maintenance';
import { getUserAccessSettings } from '../lib/userAccessService';
import { useAuth } from '../contexts/AuthContext';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    async function check() {
      try {
        const s = await getUserAccessSettings();
        setMaintenance(s.maintenance_enabled);
      } finally {
        setLoading(false);
      }
    }
    check();
  }, []);

  if (loading) return null; // Or a loading spinner

  // Always allow admin access to everything
  if (isAdmin) return <>{children}</>;

  // If maintenance is enabled, redirect non-admins to maintenance page
  if (maintenance) {
    return <Maintenance />;
  }

  return <>{children}</>;
}
