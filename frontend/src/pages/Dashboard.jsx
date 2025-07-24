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
  Activity
} from 'lucide-react';
import { reportsAPI, salesAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [salesmanStats, setSalesmanStats] = useState([]);
  const [salesmanLoading, setSalesmanLoading] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await reportsAPI.getDashboard();
        if (response.data.success) {
          setDashboardData(response.data.dashboard);
        } else {
          setError('Failed to load dashboard data');
        }
      } catch (err) {
        setError('Failed to load dashboard data');
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
          setSalesmanStats([]);
        } finally {
          setSalesmanLoading(false);
        }
      };
      fetchSalesmanStats();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center min-h-[300px]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">{error || 'Failed to load dashboard data'}</p>
        </div>
      </div>
    );
  }

  const { today, month, alerts, recentSales, topItems } = dashboardData;

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue', trend }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600',
      red: 'from-red-500 to-red-600 bg-red-50 text-red-600',
      green: 'from-green-500 to-green-600 bg-green-50 text-green-600',
      purple: 'from-purple-500 to-purple-600 bg-purple-50 text-purple-600',
      amber: 'from-amber-500 to-amber-600 bg-amber-50 text-amber-600'
    };

    return (
      <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
        
        <div className="p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
              {change && (
                <div className="flex items-center mt-2">
                  {change > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {change > 0 ? '+' : ''}{change}%
                  </span>
                  <span className="text-xs text-slate-500 ml-1">vs last month</span>
                </div>
              )}
            </div>
            <div className={`w-14 h-14 rounded-2xl ${colorClasses[color].split(' ')[2]} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`h-7 w-7 ${colorClasses[color].split(' ')[3]}`} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AlertCard = ({ title, count, icon: Icon, color = 'red' }) => {
    const colorClasses = {
      red: 'from-red-500 to-red-600 bg-red-50 text-red-600 border-red-200',
      yellow: 'from-amber-500 to-amber-600 bg-amber-50 text-amber-600 border-amber-200',
      blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600 border-blue-200'
    };

    return (
      <div className={`group relative bg-white rounded-2xl ${colorClasses[color].split(' ')[4]} border-2 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer`}>
        <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
        
        <div className="p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-xl ${colorClasses[color].split(' ')[2]} flex items-center justify-center mr-4`}>
                <Icon className={`h-6 w-6 ${colorClasses[color].split(' ')[3]}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <p className="text-3xl font-bold text-slate-900">{count}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
        </div>
      </div>
    );
  };

  const ChartCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-3">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          </div>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );

  const PaymentMethodCard = ({ method, amount, percentage, color }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full ${color} mr-3`}></div>
        <span className="font-medium text-slate-900">{method}</span>
      </div>
      <div className="text-right">
        <p className="font-bold text-slate-900">Rs {amount.toLocaleString()}</p>
        <p className="text-sm text-slate-500">{percentage}%</p>
      </div>
    </div>
  );

  const TopItemCard = ({ item, index }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-3">
          <span className="text-white font-bold text-sm">#{index + 1}</span>
        </div>
        <span className="font-medium text-slate-900">{item.name}</span>
      </div>
      <div className="text-right">
        <p className="font-bold text-slate-900">{item.total_quantity}</p>
        <p className="text-sm text-slate-500">sold</p>
      </div>
    </div>
  );

  const total = month.salesByPayment?.reduce((sum, item) => sum + item.total, 0) || 0;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
              <p className="text-xl text-slate-600">
                Welcome back! Here's what's happening with your business today.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Today</p>
              <p className="text-2xl font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Today's Revenue"
            value={`Rs ${today.revenue?.toLocaleString() || '0'}`}
            change={today.revenueChange}
            icon={ShoppingCart}
            color="blue"
          />
          <StatCard
            title="Today's Expenses"
            value={`Rs ${today.expensesAmount?.toLocaleString() || '0'}`}
            change={today.expensesChange}
            icon={DollarSign}
            color="red"
          />
          <StatCard
            title="Total Items"
            value={month.totalItems?.toLocaleString() || '0'}
            change={month.itemsChange}
            icon={Package}
            color="green"
          />
          <StatCard
            title="Active Users"
            value={month.totalUsers?.toLocaleString() || '0'}
            change={month.usersChange}
            icon={Users}
            color="purple"
          />
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <AlertCard
            title="Low Stock Alert"
            count={alerts.lowStock}
            icon={AlertTriangle}
            color="yellow"
          />
          <AlertCard
            title="Expired Items"
            count={alerts.expired}
            icon={Clock}
            color="red"
          />
          <AlertCard
            title="Pending Orders"
            count={alerts.pending}
            icon={Package}
            color="blue"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Trend */}
          <ChartCard title="Sales Trend" icon={Activity}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={month.dailySales || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `Rs ${value}`} />
                  <Bar dataKey="total" fill="#3b82f6" name="Total Sales" barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Payment Methods */}
          <ChartCard title="Payment Methods" icon={PieChart}>
            <div className="space-y-3">
              {month.salesByPayment?.map((payment, index) => {
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500'];
                const percentage = ((payment.total / total) * 100).toFixed(1);
                return (
                  <PaymentMethodCard
                    key={index}
                    method={payment.payment_type}
                    amount={payment.total}
                    percentage={percentage}
                    color={colors[index % colors.length]}
                  />
                );
              })}
            </div>
          </ChartCard>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Items */}
          <ChartCard title="Top Selling Items" icon={TrendingUp}>
            <div className="space-y-3">
              {topItems?.map((item, index) => (
                <TopItemCard key={index} item={item} index={index} />
              ))}
            </div>
          </ChartCard>

          {/* Recent Sales */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center mr-3">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">Recent Sales</h3>
                </div>
                <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">View All</button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentSales?.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-xs">{sale.invoice_number.slice(-3)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{sale.cashier_name}</p>
                        <p className="text-sm text-slate-500">{sale.invoice_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">Rs {sale.total_amount.toLocaleString()}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sale.payment_type === 'cash' 
                          ? 'bg-green-100 text-green-800'
                          : sale.payment_type === 'card'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {sale.payment_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Salesman Activity Section (Admin only) */}
        {user?.role === 'admin' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="text-blue-500" /> Salesman Activity
            </h2>
            {salesmanLoading ? (
              <div className="flex items-center justify-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : salesmanStats.length === 0 ? (
              <div className="text-gray-500 mb-8">No sales data available for salesmen.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesman</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales (Rs)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesmanStats.map((stat) => (
                      <React.Fragment key={stat.salesman}>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.salesman}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.totalSales?.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.transactionCount}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="px-6 pb-6 pt-2">
                            <div className="bg-slate-50 rounded-xl p-4 text-slate-500 text-sm text-center">
                              Product activity for <span className="font-semibold text-slate-700">{stat.salesman}</span> will be shown here in the future.
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;