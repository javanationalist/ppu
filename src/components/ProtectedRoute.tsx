import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { M3ExpressiveLoadingIndicator } from './ui/M3ExpressiveLoadingIndicator';

export const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Role[];
}) => {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#1a1a1a]">
        <M3ExpressiveLoadingIndicator size="large" className="text-ppu-blue dark:text-sky-400" label="Memuat..." />
      </div>
    );
  }

  // Check if session has expired
  const sessionExpiresAt = localStorage.getItem('session_expires_at');
  const isSessionExpired = sessionExpiresAt ? Date.now() > parseInt(sessionExpiresAt) : false;

  if (!user || !profile || isSessionExpired) {
    if (isSessionExpired) {
      // Trigger logout cleanup asynchronously
      setTimeout(() => {
        signOut();
      }, 0);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isScanner = profile.role === 'scan' || profile.class === 'Petugas Scanner' || (profile as any).status === 'scan';

  const hasAccess = 
    !allowedRoles || 
    allowedRoles.includes(profile.role) || 
    (isScanner && allowedRoles.includes('scan')) ||
    (profile.role === 'creator' && allowedRoles.includes('admin')) ||
    (profile.role === 'bilik' && allowedRoles.includes('vote')) ||
    (profile.role === 'vote' && allowedRoles.includes('bilik'));

  if (!hasAccess) {
    // Redirect to their respective dashboard if they don't have access
    if (isScanner) {
      return <Navigate to="/scanner" replace />;
    }
    if (profile.role === 'admin' || profile.role === 'creator') {
      return <Navigate to="/admin" replace />;
    }
    if (profile.role === 'bilik' || profile.role === 'vote') {
      return <Navigate to="/bilik" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
