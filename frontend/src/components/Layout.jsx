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
import ZentroPOSLogo from '../assets/ZentroPOS.png';

const Layout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Role-based navigation
  let navigation = [];
  if (user?.role === 'admin') {
    navigation = [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard, color: 'blue' },
      { name: 'Billing', href: '/billing', icon: ShoppingCart, color: 'green' },
      { name: 'Inventory', href: '/inventory', icon: Package, color: 'orange' },
      { name: 'Stock Approval', href: '/approval', icon: CheckCircle, color: 'purple' },
      { name: 'Reports', href: '/reports', icon: BarChart3, color: 'indigo' },
      { name: 'Expenses', href: '/expenses', icon: DollarSign, color: 'red' },
      { name: 'Settings', href: '/settings', icon: Settings, color: 'gray' },
    ];
  } else if (user?.role === 'salesman') {
    navigation = [
      { name: 'Billing', href: '/billing', icon: ShoppingCart, color: 'green' },
      { name: 'Inventory', href: '/inventory', icon: Package, color: 'orange' },
    ];
  } else if (user?.role === 'dataentry') {
    navigation = [
      { name: 'Inventory', href: '/inventory', icon: Package, color: 'orange' },
      { name: 'Stock Approval', href: '/approval', icon: CheckCircle, color: 'purple' },
    ];
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getColorClasses = (color, isActive) => {
    const colorMap = {
      blue: isActive ? 'from-blue-500 to-blue-600 bg-blue-600 text-white' : 'from-blue-500 to-blue-600 text-blue-600',
      green: isActive ? 'from-green-500 to-green-600 bg-green-600 text-white' : 'from-green-500 to-green-600 text-green-600',
      orange: isActive ? 'from-orange-500 to-orange-600 bg-orange-600 text-white' : 'from-orange-500 to-orange-600 text-orange-600',
      purple: isActive ? 'from-purple-500 to-purple-600 bg-purple-600 text-white' : 'from-purple-500 to-purple-600 text-purple-600',
      indigo: isActive ? 'from-indigo-500 to-indigo-600 bg-indigo-600 text-white' : 'from-indigo-500 to-indigo-600 text-indigo-600',
      red: isActive ? 'from-red-500 to-red-600 bg-red-600 text-white' : 'from-red-500 to-red-600 text-red-600',
      gray: isActive ? 'from-gray-500 to-gray-600 bg-gray-600 text-white' : 'from-gray-500 to-gray-600 text-gray-600'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-row">
      {/* Sidebar */}
      <div className={`flex flex-col h-screen bg-white shadow-2xl border-r border-slate-200 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
          <div className={`flex items-center gap-3 transition-all duration-300 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <img src={ZentroPOSLogo} alt="ZentroPOS" className="h-6 w-6 object-contain" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg font-bold text-slate-900">ZentroPOS</span>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-3 py-6">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const colorClasses = getColorClasses(item.color, isActive);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center ${sidebarCollapsed ? 'justify-center' : ''} px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-r ${colorClasses} shadow-lg border border-slate-200`
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md'
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  isActive 
                    ? 'bg-white/20' 
                    : `bg-gradient-to-r ${colorClasses.split(' ')[2]} ${colorClasses.split(' ')[3]}`
                }`}>
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : ''}`} />
                </div>
                {!sidebarCollapsed && (
                  <span className="ml-3 font-semibold">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="px-3 pb-6">
          {/* User Info */}
          <div className={`mb-4 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 ${sidebarCollapsed ? 'text-center' : ''}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user?.username}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">
                    {user?.role}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-200 w-full ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
              <LogOut className="h-4 w-4 text-white" />
            </div>
            {!sidebarCollapsed && <span className="font-semibold">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* User Menu */}
              <div className="relative">
                <div className="flex items-center gap-x-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900">
                      {user?.username}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {user?.role}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 