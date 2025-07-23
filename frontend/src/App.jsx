import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import BillingScreen from './pages/BillingScreen';
import InventoryManager from './pages/InventoryManager';
import StockApproval from './pages/StockApproval';
import ReportsPage from './pages/ReportsPage';
import ExpenseManager from './pages/ExpenseManager';
import SettingsPage from './pages/SettingsPage';
import Layout from './components/Layout';
import './App.css';

function App() {
  const { isAuthenticated, user } = useAuthStore();

  // Role-based home page
  const getHomeRoute = (role) => {
    switch (role) {
      case 'admin':
        return '/';
      case 'salesman':
        return '/billing';
      case 'dataentry':
        return '/inventory';
      default:
        return '/login';
    }
  };

  // Role-based protected route
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
      return <Navigate to={getHomeRoute(user?.role)} replace />;
    }
    return children;
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to={getHomeRoute(user?.role)} replace /> : <LoginPage />
            } 
          />

          {/* Admin-only routes */}
          <Route path="/" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <ReportsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/expenses" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <ExpenseManager />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/approval" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <StockApproval />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Salesman routes */}
          <Route path="/billing" element={
            <ProtectedRoute allowedRoles={['admin', 'salesman']}>
              <Layout>
                <BillingScreen />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Inventory: admin, salesman (read-only), dataentry (add/update) */}
          <Route path="/inventory" element={
            <ProtectedRoute allowedRoles={['admin', 'salesman', 'dataentry']}>
              <Layout>
                <InventoryManager />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to={isAuthenticated ? getHomeRoute(user?.role) : '/login'} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
