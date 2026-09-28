import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ClientDashboard from './pages/ClientDashboard';
import DriverDashboard from './pages/DriverDashboard';
import DriverTourPage from './pages/DriverTourPage';
import DriverProfilePage from './pages/DriverProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import CreateOrderPage from './pages/CreateOrderPage';
import MyShipmentsPage from './pages/MyShipmentsPage';
import TrackingPage from './pages/TrackingPage';

const DashboardRouter = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'driver':
      return <DriverDashboard />;
    case 'client':
    default:
      return <ClientDashboard />;
  }
};

function AppContent() {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main className={user ? 'main-content' : ''}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/track" element={<TrackingPage />} />
          <Route path="/create-order" element={<CreateOrderPage />} />
          
          <Route
            path="/"
            element={
              user ? (
                <DashboardRouter />
              ) : (
                <CreateOrderPage />
              )
            }
          />

          <Route
            path="/driver-tour"
            element={
              <ProtectedRoute allowedRoles={['driver', 'admin']}>
                <DriverTourPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/driver-profile"
            element={
              <ProtectedRoute allowedRoles={['driver', 'admin']}>
                <DriverProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-shipments"
            element={
              <ProtectedRoute allowedRoles={['client', 'admin']}>
                <MyShipmentsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
