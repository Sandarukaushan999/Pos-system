import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  ChevronRight,
  BarChart3,
  PieChart,
  Activity,
  Scan,
  Plus,
  CreditCard,
  Settings,
  FileText,
  Receipt,
  RefreshCw
} from 'lucide-react';
import { reportsAPI, salesAPI, usersAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [salesmanStats, setSalesmanStats] = useState([]);
  const [salesmanLoading, setSalesmanLoading] = useState(false);
  const [userActivity, setUserActivity] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { user } = useAuthStore();

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await reportsAPI.getDashboard();
      if (response.data.success) {
        setDashboardData(response.data.dashboard);
        setLastUpdated(new Date());
      } else {
        setError('Failed to load dashboard data');
        setDashboardData(null);
      }
    } catch (err) {
      console.error('Dashboard API error:', err.message);
      setError('Failed to load dashboard data');
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchDashboard();
    
    const interval = setInterval(() => {
      fetchDashboard();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Listen for storage events (when sales are completed from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'dashboard-refresh' && e.newValue) {
        // New sale detected, refresh dashboard
        fetchDashboard();
        // Clear the flag
        localStorage.removeItem('dashboard-refresh');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchDashboard]);

  // Fetch additional data for admin users
  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchSalesmanStats = async () => {
        setSalesmanLoading(true);
        try {
          const response = await salesAPI.getGrouped();
          if (response.data.success && response.data.salesmanStats) {
            setSalesmanStats(response.data.salesmanStats);
          } else {
            setSalesmanStats([]);
          }
        } catch (err) {
          console.log('Salesman stats not available:', err.message);
          setSalesmanStats([]);
        } finally {
          setSalesmanLoading(false);
        }
      };
      fetchSalesmanStats();
      
      // Fetch user activity
      const fetchUserActivity = async () => {
        try {
          const response = await usersAPI.getActivity();
          if (response.data.success) {
            setUserActivity(response.data.activity);
          }
        } catch (err) {
          console.log('User activity not available:', err.message);
        }
      };
      fetchUserActivity();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-slate-600 text-lg mb-4">{error || 'Failed to load dashboard data'}</p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <RefreshCw className="h-4 w-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Use real data or show empty states
  const { today, month, alerts, recentSales, topItems } = dashboardData || {
    today: { revenue: 0, expensesAmount: 0, revenueChange: 0, expensesChange: 0 },
    month: { totalItems: 0, totalUsers: 0, itemsChange: 0, usersChange: 0, salesByPayment: [], dailySales: [] },
    alerts: { lowStock: 0, expired: 0, pending: 0 },
    recentSales: [],
    topItems: []
  };

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue', trend }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600',
      red: 'from-red-500 to-red-600 bg-red-50 text-red-600',
      green: 'from-green-500 to-green-600 bg-green-50 text-green-600',
      purple: 'from-purple-500 to-purple-600 bg-purple-50 text-purple-600',
      amber: 'from-amber-500 to-amber-600 bg-amber-50 text-amber-600'
    };

    return (
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-600 mb-1">{title}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
            {change && (
              <div className="flex items-center mt-1">
                {change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={`text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
              </div>
            )}
          </div>
          <div className={`w-10 h-10 rounded-lg ${colorClasses[color].split(' ')[2]} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${colorClasses[color].split(' ')[3]}`} />
          </div>
        </div>
      </div>
    );
  };

  const AlertActionCard = ({ title, count, icon: Icon, color = 'red', onClick }) => {
    const colorClasses = {
      red: 'from-red-500 to-red-600 bg-red-50 text-red-600 border-red-200',
      yellow: 'from-amber-500 to-amber-600 bg-amber-50 text-amber-600 border-amber-200',
      blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600 border-blue-200'
    };

    return (
      <button 
        onClick={onClick}
        className={`bg-white rounded-xl border-2 ${colorClasses[color].split(' ')[4]} p-3 hover:shadow-lg transition-all duration-300 w-full text-left group`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-lg ${colorClasses[color].split(' ')[2]} flex items-center justify-center mr-2 group-hover:scale-110 transition-transform`}>
              <Icon className={`h-4 w-4 ${colorClasses[color].split(' ')[3]}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <p className="text-lg font-bold text-slate-900">{count}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </button>
    );
  };

  const total = month?.salesByPayment?.reduce((sum, item) => sum + item.total, 0) || 0;

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header with Refresh Button */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <span>Real-time business overview</span>
              {lastUpdated && (
                <>
                  <span>•</span>
                  <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 text-xs">Live</span>
                </>
              )}
              {refreshing && (
                <>
                  <span>•</span>
                  <span className="text-blue-600 text-xs">Updating...</span>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </>
              )}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all btn-press hover-glow"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>
        </div>

        {/* Main Content - Grid Layout */}
        <div className="h-full grid grid-cols-12 gap-4 overflow-hidden">
          
          {/* Left Column - Stats & Alert Actions */}
          <div className="col-span-4 flex flex-col gap-4">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                title="Today's Revenue"
                value={`Rs ${(today?.revenue || 0).toLocaleString()}`}
                change={today?.revenueChange}
                icon={ShoppingCart}
                color="blue"
              />
              <StatCard
                title="Today's Expenses"
                value={`Rs ${(today?.expensesAmount || 0).toLocaleString()}`}
                change={today?.expensesChange}
                icon={DollarSign}
                color="red"
              />
              <StatCard
                title="Total Items"
                value={(month?.totalItems || 0).toLocaleString()}
                change={month?.itemsChange}
                icon={Package}
                color="green"
              />
              <StatCard
                title="Active Users"
                value={(month?.totalUsers || 0).toLocaleString()}
                change={month?.usersChange}
                icon={Users}
                color="purple"
              />
            </div>

            {/* Alert Actions */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h3>
              <div className="space-y-3">
                <AlertActionCard
                  title="Low Stock"
                  count={alerts?.lowStock || 0}
                  icon={AlertTriangle}
                  color="yellow"
                  onClick={() => console.log('Navigate to Low Stock')}
                />
                <AlertActionCard
                  title="Expired Items"
                  count={alerts?.expired || 0}
                  icon={Clock}
                  color="red"
                  onClick={() => console.log('Navigate to Expired Items')}
                />
                <AlertActionCard
                  title="Pending Orders"
                  count={alerts?.pending || 0}
                  icon={Package}
                  color="blue"
                  onClick={() => console.log('Navigate to Pending Orders')}
                />
              </div>
            </div>
          </div>

          {/* Center Column - Charts */}
          <div className="col-span-5 flex flex-col gap-4">
            
            {/* Sales Chart - Reduced Space */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Sales Trend</h3>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={month?.dailySales || []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 8 }} />
                    <Tooltip formatter={(value) => `Rs ${value}`} />
                    <Bar dataKey="total" fill="#3b82f6" barSize={15} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Payment Methods</h3>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="space-y-3">
                {month?.salesByPayment?.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium text-slate-700 capitalize">{payment.payment_type}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">Rs {payment.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Recent Sales & Top Items */}
          <div className="col-span-3 flex flex-col gap-4">
            
            {/* Recent Sales */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Recent Sales</h3>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {recentSales?.slice(0, 6).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{sale.invoice_number}</p>
                      <p className="text-xs text-slate-500">{sale.cashier_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-900">Rs {sale.total_amount.toLocaleString()}</p>
                      <p className="text-xs text-slate-500 capitalize">{sale.payment_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Items */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Top Items</h3>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                  <Package className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="space-y-3">
                {topItems?.slice(0, 4).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-orange-600">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">Qty: {item.total_quantity}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-900">Rs {item.total_quantity * 100}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;