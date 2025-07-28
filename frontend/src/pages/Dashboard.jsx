import React, { useState, useEffect } from 'react';
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
  Receipt
} from 'lucide-react';
import { reportsAPI, salesAPI, usersAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Mock data for demo purposes
const mockDashboardData = {
  today: {
    sales: 15,
    revenue: 25000,
    expenses: 3,
    expensesAmount: 1500,
    revenueChange: 12.5,
    expensesChange: -5.2
  },
  month: {
    sales: 450,
    revenue: 750000,
    expenses: 25,
    expensesAmount: 25000,
    totalItems: 1250,
    totalUsers: 8,
    itemsChange: 8.3,
    usersChange: 0,
    salesByPayment: [
      { payment_type: 'cash', total: 450000 },
      { payment_type: 'card', total: 250000 },
      { payment_type: 'mobile', total: 50000 }
    ],
    dailySales: [
      { date: '2025-01-01', total: 25000 },
      { date: '2025-01-02', total: 28000 },
      { date: '2025-01-03', total: 32000 },
      { date: '2025-01-04', total: 29000 },
      { date: '2025-01-05', total: 35000 },
      { date: '2025-01-06', total: 31000 },
      { date: '2025-01-07', total: 27000 }
    ]
  },
  alerts: {
    lowStock: 12,
    expired: 3,
    pending: 5
  },
  recentSales: [
    {
      id: 1,
      invoice_number: 'INV-20250107-0001',
      cashier_name: 'admin',
      total_amount: 2500,
      payment_type: 'cash'
    },
    {
      id: 2,
      invoice_number: 'INV-20250107-0002',
      cashier_name: 'salesman1',
      total_amount: 1800,
      payment_type: 'card'
    },
    {
      id: 3,
      invoice_number: 'INV-20250107-0003',
      cashier_name: 'admin',
      total_amount: 3200,
      payment_type: 'mobile'
    },
    {
      id: 4,
      invoice_number: 'INV-20250107-0004',
      cashier_name: 'salesman1',
      total_amount: 1500,
      payment_type: 'cash'
    },
    {
      id: 5,
      invoice_number: 'INV-20250107-0005',
      cashier_name: 'admin',
      total_amount: 2800,
      payment_type: 'card'
    },
    {
      id: 6,
      invoice_number: 'INV-20250107-0006',
      cashier_name: 'salesman1',
      total_amount: 1900,
      payment_type: 'cash'
    }
  ],
  topItems: [
    { name: 'Product A', total_quantity: 150 },
    { name: 'Product B', total_quantity: 120 },
    { name: 'Product C', total_quantity: 95 }
  ]
};

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [salesmanStats, setSalesmanStats] = useState([]);
  const [salesmanLoading, setSalesmanLoading] = useState(false);
  const [userActivity, setUserActivity] = useState([]);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Try to fetch real data first, fallback to mock data
        try {
          const response = await reportsAPI.getDashboard();
          if (response.data.success) {
            setDashboardData(response.data.dashboard);
          } else {
            setDashboardData(mockDashboardData);
          }
        } catch (err) {
          console.log('Using mock dashboard data due to API error:', err.message);
          setDashboardData(mockDashboardData);
        }
      } catch (err) {
        setError('Failed to load dashboard data');
        setDashboardData(mockDashboardData);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

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
          <p className="text-slate-600 text-lg">{error || 'Failed to load dashboard data'}</p>
        </div>
      </div>
    );
  }

  const { today, month, alerts, recentSales, topItems } = dashboardData || mockDashboardData;

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