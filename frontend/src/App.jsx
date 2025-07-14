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

  // Protected Route component
  const ProtectedRoute = ({ children, requireAdmin = false }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (requireAdmin && user?.role !== 'admin') {
      return <Navigate to="/" replace />;
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
              isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
            } 
          />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/billing" element={
            <ProtectedRoute>
              <Layout>
                <BillingScreen />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/inventory" element={
            <ProtectedRoute>
              <Layout>
                <InventoryManager />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/approval" element={
            <ProtectedRoute requireAdmin>
              <Layout>
                <StockApproval />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute>
              <Layout>
                <ReportsPage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/expenses" element={
            <ProtectedRoute>
              <Layout>
                <ExpenseManager />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
