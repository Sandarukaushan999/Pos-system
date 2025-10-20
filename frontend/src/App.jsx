import React, { Component } from 'react';
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

// ErrorBoundary component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // You can log errorInfo to an error reporting service here
    // console.error(error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: '#b91c1c', background: '#fef2f2' }}>
          <h1 style={{ fontSize: 32, marginBottom: 16 }}>Something went wrong.</h1>
          <pre style={{ color: '#991b1b', background: '#fee2e2', padding: 16, borderRadius: 8, maxWidth: 600, margin: '0 auto', overflowX: 'auto' }}>{this.state.error?.toString()}</pre>
          <button
            style={{ marginTop: 24, padding: '8px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, fontSize: 16, cursor: 'pointer' }}
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
          >
            Clear Session & Go to Login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const { isAuthenticated, user, logout } = useAuthStore();

  // Defensive: If user isAuthenticated but user object is missing or corrupted, force logout
  if (isAuthenticated && (!user || !user.role)) {
    logout();
    return <Navigate to="/login" replace />;
  }

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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
