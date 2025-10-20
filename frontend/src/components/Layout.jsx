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
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import VoxoLogo from '../assets/voxo V.png';

const Layout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
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
    // Let React Router handle the navigation
    window.location.reload();
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const getColorClasses = (color, isActive) => {
    const colorMap = {
      blue: isActive ? 'bg-[#A5BF13] text-black' : 'text-[#F8F8F8] hover:bg-[#2A2A2A]',
      green: isActive ? 'bg-[#A5BF13] text-black' : 'text-[#F8F8F8] hover:bg-[#2A2A2A]',
      orange: isActive ? 'bg-[#A5BF13] text-black' : 'text-[#F8F8F8] hover:bg-[#2A2A2A]',
      purple: isActive ? 'bg-[#A5BF13] text-black' : 'text-[#F8F8F8] hover:bg-[#2A2A2A]',
      indigo: isActive ? 'bg-[#A5BF13] text-black' : 'text-[#F8F8F8] hover:bg-[#2A2A2A]',
      red: isActive ? 'bg-[#A5BF13] text-black' : 'text-[#F8F8F8] hover:bg-[#2A2A2A]',
      gray: isActive ? 'bg-[#A5BF13] text-black' : 'text-[#F8F8F8] hover:bg-[#2A2A2A]'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className={`min-h-screen flex flex-row transition-all duration-500 ${isDarkMode ? 'bg-[#202020]' : 'bg-white'}`}>
      {/* Sidebar */}
      <div className={`flex flex-col h-screen shadow-2xl border-r transition-all duration-500 ${sidebarCollapsed ? 'w-20' : 'w-64'} ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-gray-100 border-gray-200'}`}>
        {/* Sidebar Header */}
        <div className={`flex items-center justify-between h-16 px-4 border-b transition-all duration-500 ${isDarkMode ? 'border-[#3A3A3A] bg-[#202020]' : 'border-gray-200 bg-gray-50'}`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`flex items-center gap-3 transition-all duration-300 hover:scale-105 group relative overflow-hidden ripple ${sidebarCollapsed ? 'justify-center w-full' : ''}`}
          >
            {/* Ripple effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#A5BF13]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
            
            <div className="w-8 h-8 rounded-lg bg-[#A5BF13] flex items-center justify-center transition-all duration-300 relative z-10">
              <img src={VoxoLogo} alt="Voxo Software Solutions" className="h-full w-full object-contain" />
            </div>
            {!sidebarCollapsed && (
              <span className={`text-lg font-bold transition-colors duration-200 relative z-10 ${isDarkMode ? 'text-[#F8F8F8] group-hover:text-[#A5BF13]' : 'text-gray-800 group-hover:text-[#A5BF13]'}`}>VOXO Solutions</span>
            )}
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
                className={`group flex items-center ${sidebarCollapsed ? 'justify-center' : ''} px-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden hover:shadow-xl hover:shadow-[#A5BF13]/10 hover:-translate-y-1 ripple ${
                  isActive
                    ? `bg-[#A5BF13] text-black shadow-lg border hover:scale-105 ${isDarkMode ? 'border-[#3A3A3A]' : 'border-gray-200'}`
                    : `${isDarkMode ? 'text-[#F8F8F8] hover:bg-[#3A3A3A]' : 'text-gray-700 hover:bg-gray-200'} hover:text-[#A5BF13] hover:shadow-md`
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                {/* Ripple effect for navigation items */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#A5BF13]/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 relative z-10 ${
                  isActive 
                    ? `${isDarkMode ? 'bg-[#202020]' : 'bg-white'} group-hover:scale-110 group-hover:rotate-3` 
                    : `${isDarkMode ? 'bg-[#3A3A3A] text-[#F8F8F8]' : 'bg-gray-200 text-gray-700'} group-hover:scale-110 group-hover:rotate-3`
                }`}>
                  <item.icon className={`h-4 w-4 ${isActive ? `${isDarkMode ? 'text-white' : 'text-black'} group-hover:animate-bounce group-active:icon-glow` : `${isDarkMode ? 'text-[#F8F8F8]' : 'text-black'} group-hover:animate-pulse group-active:icon-glow`}`} />
                </div>
                {!sidebarCollapsed && (
                  <span className="ml-3 font-semibold group-hover:scale-105 transition-transform duration-200 group-active:text-highlight">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="px-3 pb-6">
          {/* User Info */}
          <div className={`mb-4 p-3 rounded-xl border hover:shadow-xl hover:shadow-[#A5BF13]/10 hover:-translate-y-1 transition-all duration-300 group ${sidebarCollapsed ? 'text-center' : ''} ${isDarkMode ? 'bg-[#202020] border-[#3A3A3A]' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-[#A5BF13] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <User className="h-4 w-4 text-black group-hover:animate-pulse" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate group-hover:text-[#A5BF13] transition-colors duration-200 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>
                    {user?.username}
                  </p>
                  <p className="text-xs text-[#A5BF13] capitalize group-hover:scale-105 transition-transform duration-200">
                    {user?.role}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-3 text-sm font-medium text-[#B4182D] hover:bg-[#3A3A3A] hover:text-[#F8F8F8] rounded-xl transition-all duration-300 w-full group hover:shadow-xl hover:shadow-[#B4182D]/10 hover:-translate-y-1 relative overflow-hidden ripple ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            {/* Ripple effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#B4182D]/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            
            <div className="w-8 h-8 rounded-lg bg-[#B4182D] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative z-10">
              <LogOut className="h-4 w-4 text-white group-hover:animate-pulse group-active:icon-glow" />
            </div>
            {!sidebarCollapsed && <span className="font-semibold group-hover:scale-105 transition-transform duration-200 group-active:text-highlight relative z-10">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className={`sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b backdrop-blur-sm px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 transition-all duration-500 ${isDarkMode ? 'border-[#3A3A3A] bg-[#2A2A2A]/80' : 'border-gray-200 bg-white/80'}`}>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="relative p-2 rounded-lg hover:bg-opacity-80 transition-all duration-300 group overflow-hidden"
                style={{
                  backgroundColor: isDarkMode ? '#3A3A3A' : '#F3F4F6',
                  color: isDarkMode ? '#F8F8F8' : '#374151'
                }}
              >
                {/* Ripple effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#A5BF13]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                
                <div className="relative z-10 flex items-center justify-center w-8 h-8">
                  {isDarkMode ? (
                    <Sun className="h-5 w-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 group-hover:animate-pulse" />
                  ) : (
                    <Moon className="h-5 w-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 group-hover:animate-pulse" />
                  )}
                </div>
                
                {/* Animated background circle */}
                <div 
                  className={`absolute inset-0 rounded-lg transition-all duration-500 ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20' 
                      : 'bg-gradient-to-br from-blue-400/20 to-purple-500/20'
                  }`}
                  style={{
                    transform: isDarkMode ? 'scale(0)' : 'scale(1)',
                    opacity: isDarkMode ? 0 : 1
                  }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1">
          {React.cloneElement(children, { isDarkMode })}
        </main>

        {/* Footer with Copyright */}
        <footer className={`py-4 px-6 border-t transition-all duration-500 ${isDarkMode ? 'border-[#3A3A3A] bg-[#2A2A2A]' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-center">
            <p className={`text-sm transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]/70' : 'text-gray-600'}`}>
              © 2024 VOXO Solutions. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout; 