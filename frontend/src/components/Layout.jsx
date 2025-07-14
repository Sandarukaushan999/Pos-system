import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  CheckCircle, 
  BarChart3, 
  DollarSign, 
  Settings, 
  LogOut, 
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const Layout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Billing', href: '/billing', icon: ShoppingCart },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Stock Approval', href: '/approval', icon: CheckCircle, adminOnly: true },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Expenses', href: '/expenses', icon: DollarSign },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || user?.role === 'admin'
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-row">
      {/* Sidebar always visible */}
      <div className={`flex flex-col h-screen bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <span className={`text-xl font-bold text-blue-700 flex items-center gap-2 transition-all duration-300 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <LayoutDashboard className="text-blue-500" />
            {!sidebarCollapsed && 'POS System'}
          </span>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-gray-400 hover:text-blue-500 ml-2"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center ${sidebarCollapsed ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-100 text-blue-900 shadow'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-900'
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon
                  className={`h-5 w-5 ${
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'
                  }`}
                />
                {!sidebarCollapsed && <span className="ml-3">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="px-2 pb-4">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md w-full ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={18} />
            {!sidebarCollapsed && 'Logout'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* User menu */}
              <div className="relative">
                <div className="flex items-center gap-x-2">
                  <User size={20} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {user?.username}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    ({user?.role})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Page content */}
        <main className="py-6 flex-1">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout; 