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
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [salesmanStats, setSalesmanStats] = useState([]);
  const [salesmanLoading, setSalesmanLoading] = useState(false);
  const [userActivity, setUserActivity] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await reportsAPI.getDashboard();
      console.log('Dashboard API Response:', response.data); // Debug log
      
      if (response.data.success) {
        setDashboardData(response.data.dashboard);
        
        // Debug log for data structure
        console.log('Dashboard Data:', {
          today: response.data.dashboard?.today,
          month: response.data.dashboard?.month,
          alerts: response.data.dashboard?.alerts,
          dailySales: response.data.dashboard?.month?.dailySales
        });
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

  // Initial data fetch
  useEffect(() => {
    fetchDashboard();
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
      <div className="h-screen bg-[#202020] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#A5BF13] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#F8F8F8] text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="h-screen bg-[#202020] flex items-center justify-center">
        <div className="text-center p-8 bg-[#2A2A2A] rounded-2xl shadow-lg border border-[#3A3A3A]">
          <AlertTriangle className="h-12 w-12 text-[#A5BF13] mx-auto mb-4" />
          <p className="text-[#F8F8F8] text-lg mb-4">{error || 'Failed to load dashboard data'}</p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-[#A5BF13] text-black rounded-lg hover:bg-[#94A90F] transition-all font-medium"
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

  // Process chart data to show day-by-day data with proper formatting
  const chartData = month?.dailySales || [];
  console.log('Chart Data:', chartData); // Debug log for chart data
  console.log('Today Revenue:', today?.revenue); // Debug log for today's revenue
  console.log('Today Expenses:', today?.expensesAmount); // Debug log for today's expenses

  // Create a complete month of data with proper day labels
  const processedChartData = (() => {
    if (chartData.length === 0) {
      // Create sample data for the current month
      const currentDate = new Date();
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      const sampleData = [];
      
      for (let day = 1; day <= Math.min(daysInMonth, currentDate.getDate()); day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        sampleData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          total: 0
        });
      }
      return sampleData;
    }
    
    // Process existing data and fill gaps
    const processedData = chartData.map(sale => ({
      date: sale.date,
      total: sale.total || 0
    }));
    
    return processedData;
  })();

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue', trend }) => {
    const colorClasses = {
      blue: 'bg-[#2A2A2A] text-[#A5BF13] border-[#3A3A3A]',
      red: 'bg-[#2A2A2A] text-[#A5BF13] border-[#3A3A3A]',
      green: 'bg-[#2A2A2A] text-[#A5BF13] border-[#3A3A3A]',
      purple: 'bg-[#2A2A2A] text-[#A5BF13] border-[#3A3A3A]',
      amber: 'bg-[#2A2A2A] text-[#A5BF13] border-[#3A3A3A]'
    };

    return (
      <div className="bg-[#2A2A2A] rounded-xl shadow-lg hover:shadow-2xl hover:shadow-[#A5BF13]/20 hover:-translate-y-1 transition-all duration-300 p-4 border border-[#3A3A3A] group cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-[#F8F8F8] mb-1 group-hover:text-[#A5BF13] transition-colors duration-200">{title}</p>
            <p className="text-xl font-bold text-[#A5BF13] group-hover:scale-105 transition-transform duration-200">{value}</p>
            {change && (
              <div className="flex items-center mt-1">
                {change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-[#A5BF13] mr-1 group-hover:animate-pulse" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-[#A5BF13] mr-1 group-hover:animate-pulse" />
                )}
                <span className={`text-xs font-medium text-[#A5BF13] group-hover:scale-110 transition-transform duration-200`}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
              </div>
            )}
          </div>
          <div className={`w-10 h-10 rounded-lg bg-[#A5BF13] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
            <Icon className="h-5 w-5 text-black group-hover:animate-bounce" />
          </div>
        </div>
      </div>
    );
  };

  const AlertActionCard = ({ title, count, icon: Icon, color = 'red', onClick }) => {
    const getColorClasses = (color) => {
      const colorMap = {
        yellow: 'bg-[#F79824] text-black',
        red: 'bg-[#B4182D] text-white',
        blue: 'bg-[#C1E8FF] text-black'
      };
      return colorMap[color] || colorMap.red;
    };

    return (
      <button 
        onClick={onClick}
        className="bg-[#2A2A2A] rounded-xl border border-[#3A3A3A] p-3 hover:shadow-xl hover:shadow-[#A5BF13]/10 hover:-translate-y-1 transition-all duration-300 w-full text-left group hover:bg-[#3A3A3A] relative overflow-hidden"
      >
        {/* Ripple effect background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#A5BF13]/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-lg ${getColorClasses(color)} flex items-center justify-center mr-2 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
              <Icon className="h-4 w-4 group-hover:animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F8F8F8] group-hover:text-[#A5BF13] transition-colors duration-200">{title}</h3>
              <p className="text-lg font-bold text-[#A5BF13] group-hover:scale-105 transition-transform duration-200">{count}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[#F8F8F8] group-hover:text-[#A5BF13] group-hover:translate-x-1 transition-all duration-300" />
        </div>
      </button>
    );
  };

  const total = month?.salesByPayment?.reduce((sum, item) => sum + item.total, 0) || 0;

  return (
    <div className="h-screen bg-[#202020] p-6 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header with Refresh Button */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#F8F8F8]">Dashboard</h1>
            <div className="flex items-center gap-2 text-[#A5BF13] text-sm">
              <span>Business overview</span>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[#A5BF13] text-black rounded-lg shadow-lg hover:shadow-xl hover:shadow-[#A5BF13]/30 hover:-translate-y-1 transition-all duration-300 font-medium relative overflow-hidden group"
          >
            {/* Ripple effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : 'group-hover:animate-pulse'} relative z-10`} />
            <span className="text-sm font-medium relative z-10">
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
                title="Today's Profit"
                value={`Rs ${(today?.profit || 0).toLocaleString()}`}
                change={today?.profitChange}
                icon={TrendingUp}
                color="green"
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
            <div className="bg-[#2A2A2A] rounded-xl shadow-lg p-4 border border-[#3A3A3A]">
              <h3 className="text-sm font-semibold text-[#F8F8F8] mb-3">Quick Actions</h3>
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
            <div className="bg-[#2A2A2A] rounded-xl shadow-lg hover:shadow-2xl hover:shadow-[#A5BF13]/10 hover:-translate-y-1 transition-all duration-300 p-4 border border-[#3A3A3A] group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#F8F8F8] group-hover:text-[#A5BF13] transition-colors duration-200">Sales Trend</h3>
                <div className="w-8 h-8 rounded-lg bg-[#A5BF13] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Activity className="h-4 w-4 text-black group-hover:animate-pulse" />
                </div>
              </div>
              <div className="h-70">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processedChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3A3A3A" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#F8F8F8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#F8F8F8' }} />
                    <Tooltip 
                      formatter={(value) => [`Rs ${value.toLocaleString()}`, 'Revenue']}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid #3A3A3A', color: '#F8F8F8' }}
                    />
                    <Line type="monotone" dataKey="total" stroke="#F79824" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-[#2A2A2A] rounded-xl shadow-lg hover:shadow-2xl hover:shadow-[#A5BF13]/10 hover:-translate-y-1 transition-all duration-300 p-4 border border-[#3A3A3A] group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#F8F8F8] group-hover:text-[#A5BF13] transition-colors duration-200">Payment Methods</h3>
                <div className="w-8 h-8 rounded-lg bg-[#A5BF13] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <CreditCard className="h-4 w-4 text-black group-hover:animate-pulse" />
                </div>
              </div>
              <div className="space-y-3">
                {month?.salesByPayment?.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#202020] rounded-lg border border-[#3A3A3A] hover:bg-[#2A2A2A] hover:border-[#A5BF13]/30 hover:scale-105 transition-all duration-200 group cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#A5BF13] group-hover:scale-125 group-hover:animate-pulse transition-all duration-200"></div>
                      <span className="text-sm font-medium text-[#F8F8F8] capitalize group-hover:text-[#A5BF13] transition-colors duration-200">{payment.payment_type}</span>
                    </div>
                    <span className="text-sm font-semibold text-[#A5BF13] group-hover:scale-110 transition-transform duration-200">Rs {payment.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Recent Sales & Top Items */}
          <div className="col-span-3 flex flex-col gap-4">
            
            {/* Recent Sales */}
            <div className="bg-[#2A2A2A] rounded-xl shadow-lg hover:shadow-2xl hover:shadow-[#A5BF13]/10 hover:-translate-y-1 transition-all duration-300 p-4 border border-[#3A3A3A] group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#F8F8F8] group-hover:text-[#A5BF13] transition-colors duration-200">Recent Sales</h3>
                <div className="w-8 h-8 rounded-lg bg-[#A5BF13] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Receipt className="h-4 w-4 text-black group-hover:animate-pulse" />
                </div>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {recentSales?.slice(0, 6).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-2 bg-[#202020] rounded-lg border border-[#3A3A3A] hover:bg-[#2A2A2A] hover:border-[#A5BF13]/30 hover:scale-105 transition-all duration-200 group cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#F8F8F8] truncate group-hover:text-[#A5BF13] transition-colors duration-200">{sale.invoice_number}</p>
                      <p className="text-xs text-[#A5BF13] group-hover:scale-105 transition-transform duration-200">{sale.cashier_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-[#A5BF13] group-hover:scale-110 transition-transform duration-200">Rs {sale.total_amount.toLocaleString()}</p>
                      <p className="text-xs text-[#F8F8F8] capitalize group-hover:text-[#A5BF13] transition-colors duration-200">{sale.payment_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Items */}
            <div className="bg-[#2A2A2A] rounded-xl shadow-lg hover:shadow-2xl hover:shadow-[#A5BF13]/10 hover:-translate-y-1 transition-all duration-300 p-4 border border-[#3A3A3A] group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#F8F8F8] group-hover:text-[#A5BF13] transition-colors duration-200">Top Items</h3>
                <div className="w-8 h-8 rounded-lg bg-[#A5BF13] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Package className="h-4 w-4 text-black group-hover:animate-pulse" />
                </div>
              </div>
              <div className="space-y-3">
                {topItems?.slice(0, 4).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-[#202020] rounded-lg border border-[#3A3A3A] hover:bg-[#2A2A2A] hover:border-[#A5BF13]/30 hover:scale-105 transition-all duration-200 group cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#A5BF13] flex items-center justify-center group-hover:scale-125 group-hover:animate-pulse transition-all duration-200">
                        <span className="text-xs font-bold text-black group-hover:scale-110 transition-transform duration-200">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#F8F8F8] truncate group-hover:text-[#A5BF13] transition-colors duration-200">{item.name}</p>
                        <p className="text-xs text-[#A5BF13] group-hover:scale-105 transition-transform duration-200">Qty: {item.total_quantity}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#A5BF13] group-hover:scale-110 transition-transform duration-200">Rs {item.total_quantity * 100}</span>
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