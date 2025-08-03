import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { 
  ShoppingCart, 
  User, 
  Lock, 
  Eye, 
  EyeOff,
  AlertTriangle,
  Sun,
  Moon
} from 'lucide-react';
import VoxoLogo from '../assets/voxo V.png';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const navigate = useNavigate();
  const { login, error, clearError, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 transition-all duration-500 ${isDarkMode ? 'bg-[#202020]' : 'bg-gradient-to-br from-gray-50 to-blue-50'}`}>
      <div className="w-full max-w-md">
        {/* Theme Toggle */}
        <div className="flex justify-end mb-6">
          <button
            onClick={toggleTheme}
            className={`relative p-3 rounded-xl hover:scale-105 transition-all duration-300 group overflow-hidden ${
              isDarkMode ? 'bg-[#3A3A3A] hover:bg-[#A5BF13] hover:text-black' : 'bg-white hover:bg-[#A5BF13] hover:text-black'
            } shadow-lg`}
          >
            {/* Ripple effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            
            <div className="relative z-10 flex items-center justify-center w-8 h-8">
              {isDarkMode ? (
                <Sun className="h-5 w-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 group-hover:animate-pulse" />
              ) : (
                <Moon className="h-5 w-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 group-hover:animate-pulse" />
              )}
            </div>
          </button>
        </div>

        {/* Login Card */}
        <div className={`rounded-xl shadow-2xl p-8 hover:shadow-3xl hover:shadow-[#A5BF13]/20 transition-all duration-500 border ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-white border-gray-200'}`}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-[#A5BF13] rounded-xl flex items-center justify-center mb-6 transition-all duration-300 shadow-lg">
              <img src={VoxoLogo} alt="VOXO Solutions" className="h-full w-full object-contain" />
            </div>
            <h2 className={`text-3xl font-bold mb-2 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>
              VOXO Solutions
            </h2>
            <p className={`text-sm transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]/70' : 'text-gray-600'}`}>
              Sign in to your account
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className={`block text-sm font-medium mb-2 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>
                Username
              </label>
              <div className="relative">
                <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-[#F8F8F8]/50' : 'text-gray-400'}`} />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className={`block w-full pl-10 pr-4 py-3 border rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent transition-all duration-300 hover:border-[#A5BF13] ${
                    isDarkMode 
                      ? 'border-[#3A3A3A] bg-[#202020] text-[#F8F8F8] placeholder-[#F8F8F8]/50' 
                      : 'border-gray-300 bg-white text-gray-800 placeholder-gray-500'
                  }`}
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className={`block text-sm font-medium mb-2 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>
                Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-[#F8F8F8]/50' : 'text-gray-400'}`} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent transition-all duration-300 hover:border-[#A5BF13] ${
                    isDarkMode 
                      ? 'border-[#3A3A3A] bg-[#202020] text-[#F8F8F8] placeholder-[#F8F8F8]/50' 
                      : 'border-gray-300 bg-white text-gray-800 placeholder-gray-500'
                  }`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors hover:text-[#A5BF13] ${isDarkMode ? 'text-[#F8F8F8]/50' : 'text-gray-400'}`}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`border border-[#B4182D] rounded-lg p-4 transition-all duration-500 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-red-50'}`}>
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-[#B4182D] mr-2 animate-pulse" />
                  <div>
                    <h3 className={`text-sm font-medium transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-red-800'}`}>
                      Login Error
                    </h3>
                    <p className={`text-sm mt-1 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-red-700'}`}>
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#A5BF13] text-black py-3 px-4 rounded-lg font-semibold hover:bg-[#94A90F] focus:outline-none focus:ring-2 focus:ring-[#A5BF13] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl hover:shadow-[#A5BF13]/30 hover:-translate-y-1 relative overflow-hidden group ripple"
            >
              {/* Ripple effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              
              {isLoading ? (
                <div className="flex items-center justify-center relative z-10">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <span className="relative z-10 group-hover:animate-pulse">Sign In</span>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className={`mt-6 p-4 rounded-lg border transition-all duration-500 ${isDarkMode ? 'bg-[#202020] border-[#3A3A3A]' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-xs text-center transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]/70' : 'text-gray-600'}`}>
              Demo: <span className={`font-mono px-1 rounded ${isDarkMode ? 'bg-[#3A3A3A] text-[#A5BF13]' : 'bg-gray-200 text-gray-800'}`}>admin</span> / 
              <span className={`font-mono px-1 rounded ${isDarkMode ? 'bg-[#3A3A3A] text-[#A5BF13]' : 'bg-gray-200 text-gray-800'}`}>admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 