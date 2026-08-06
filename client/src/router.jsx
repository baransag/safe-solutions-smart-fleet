import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import VehiclesPage from './pages/vehicles/VehiclesPage';
import AssignmentsPage from './pages/vehicles/AssignmentsPage';
import QRCodesPage from './pages/vehicles/QRCodesPage';
import CheckInPage from './pages/vehicles/CheckInPage';
import CheckOutPage from './pages/vehicles/CheckOutPage';
import FuelPage from './pages/vehicles/FuelPage';
import AttendancePage from './pages/attendance/AttendancePage';
import EmployeeQRCodesPage from './pages/attendance/EmployeeQRCodesPage';
import ReportsPage from './pages/attendance/ReportsPage';
import AlertsPage from './pages/vehicles/AlertsPage';
import ServicesPage from './pages/vehicles/ServicesPage';
import AnalyticsPage from './pages/vehicles/AnalyticsPage';
import ApprovalCenterPage from './pages/approvals/ApprovalCenterPage';
import HeroManagementPage from './pages/dashboard/HeroManagementPage';
import SystemSettingsPage from './pages/dashboard/SystemSettingsPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader loader-lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function AppRouter() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="loader loader-lg" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />

        <Route element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/hero-management" element={<AdminRoute><HeroManagementPage /></AdminRoute>} />

          {/* Vehicle Management (admin only for CRUD) */}
          <Route path="/vehicles" element={<AdminRoute><VehiclesPage /></AdminRoute>} />
          <Route path="/assignments" element={<AdminRoute><AssignmentsPage /></AdminRoute>} />
          <Route path="/qr-codes" element={<AdminRoute><QRCodesPage /></AdminRoute>} />

          {/* Daily Operations (all users) */}
          <Route path="/check-in" element={<CheckInPage />} />
          <Route path="/check-out" element={<CheckOutPage />} />
          <Route path="/fuel" element={<FuelPage />} />

          {/* Employee Attendance, QR Management & Approvals */}
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/employee-qr-codes" element={<AdminRoute><EmployeeQRCodesPage /></AdminRoute>} />
          <Route path="/approvals" element={<ApprovalCenterPage />} />

          {/* Reports & Analytics (admin) */}
          <Route path="/analytics" element={<AdminRoute><AnalyticsPage /></AdminRoute>} />
          <Route path="/alerts" element={<AdminRoute><AlertsPage /></AdminRoute>} />
          <Route path="/services" element={<AdminRoute><ServicesPage /></AdminRoute>} />
          <Route path="/reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
          <Route path="/settings" element={<AdminRoute><SystemSettingsPage /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
