/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import MaintenanceGuard from './components/MaintenanceGuard';
import NotFound from './pages/NotFound';
import LogoutOverlay from './components/LogoutOverlay';
import PortalLayout from './components/PortalLayout';

import Landing from './pages/Landing';
import Informasi from './pages/Informasi';
import Tentang from './pages/Tentang';
import CaraMenggunakan from './pages/CaraMenggunakan';
import Login from './pages/Login';
import Signup from './pages/Signup';
import HasilPemilihan from './pages/HasilPemilihan';
import UserDashboard from './pages/user/Dashboard';
import { PlaceholderPage } from './pages/admin/PlaceholderPage';
import HelpdeskManager from './pages/admin/HelpdeskManager';
import VotePage from './pages/Vote';
import KonfirmasiPemilih from './pages/admin/KonfirmasiPemilih';
import ScannerPro from './pages/admin/ScannerPro';
import KelolaPemilih from './pages/admin/KelolaPemilih';
import AuditLog from './pages/admin/AuditLog';
import DashboardOverview from './pages/admin/DashboardOverview';
import KelolaKandidat from './pages/admin/KelolaKandidat';
import KelolaKategori from './pages/admin/KelolaKategori';
import PengaturanVoting from './pages/admin/PengaturanVoting';
import HasilAdmin from './pages/admin/HasilAdmin';
import ExportData from './pages/admin/ExportData';
import Maintenance from './pages/admin/Maintenance';
import WafoManager from './pages/admin/WafoManager';
import GelombangVoting from './pages/admin/GelombangVoting';
import AksesPro from './pages/admin/AksesPro';
import NetworkStatus from './components/NetworkStatus';

function AppContent() {
  return (
    <MaintenanceGuard>
      <NetworkStatus />
      <Routes>
        <Route element={<PortalLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/informasi" element={<Informasi />} />
          <Route path="/tentang" element={<Tentang />} />
          <Route path="/cara-menggunakan" element={<CaraMenggunakan />} />
        </Route>
        
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/hasil" element={<HasilPemilihan />} />
        <Route path="/vote" element={<VotePage />} />

        {/* User Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route path="gelombang" element={<GelombangVoting />} />
          <Route path="kandidat" element={<KelolaKandidat />} />
          <Route path="kategori" element={<KelolaKategori />} />
          <Route path="konfirmasi" element={<KonfirmasiPemilih />} />
          <Route path="scanner-pro" element={<ScannerPro />} />
          <Route path="pemilih" element={<KelolaPemilih />} />
          <Route path="wafo" element={<WafoManager />} />
          <Route path="helpdesk" element={<HelpdeskManager />} />
          <Route path="pengaturan" element={<PengaturanVoting />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="hasil" element={<HasilAdmin />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="export" element={<ExportData />} />
          <Route path="akses-pro" element={<AksesPro />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <LogoutOverlay />
    </MaintenanceGuard>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
