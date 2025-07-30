import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  DollarSign,
  Calendar,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Download,
  Filter,
  X,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Info
} from 'lucide-react';
import { expensesAPI } from '../services/api';

const ExpenseManager = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Add expense form state
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    notes: ''
  });

  // Form validation errors
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await expensesAPI.getAll();
      if (response.data.success) {
        setExpenses(response.data.expenses);
      } else {
        setError('Failed to fetch expenses');
      }
    } catch (error) {
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = [
    'Rent', 'Utilities', 'Salaries', 'Inventory', 'Marketing', 
    'Maintenance', 'Insurance', 'Taxes', 'Other'
  ];

  // Enhanced validation function
  const validateExpense = (expense) => {
    const errors = {};
    
    if (!expense.date) errors.date = 'Date is required';
    if (!expense.category) errors.category = 'Category is required';
    if (!expense.amount || parseFloat(expense.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    
    return errors;
  };

  // Enhanced filtering and sorting
  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = expenses.filter(expense => {
      const matchesSearch = expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           expense.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !categoryFilter || expense.category === categoryFilter;
      
      const matchesDateRange = (!dateRange.start || expense.date >= dateRange.start) &&
                              (!dateRange.end || expense.date <= dateRange.end);
      
      return matchesSearch && matchesCategory && matchesDateRange;
    });

    // Sort expenses
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'amount') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [expenses, searchTerm, categoryFilter, dateRange, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedExpenses.length / itemsPerPage);
  const paginatedExpenses = filteredAndSortedExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalExpenses = filteredAndSortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate stats
  const stats = {
    total: expenses.length,
    totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    thisMonth: expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const now = new Date();
      return expenseDate.getMonth() === now.getMonth() && 
             expenseDate.getFullYear() === now.getFullYear();
    }).reduce((sum, expense) => sum + expense.amount, 0),
    avgPerExpense: expenses.length > 0 ? expenses.reduce((sum, expense) => sum + expense.amount, 0) / expenses.length : 0
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    
    const errors = validateExpense(newExpense);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setValidationErrors({});
      const response = await expensesAPI.create({
        ...newExpense,
        amount: parseFloat(newExpense.amount)
      });
      if (response.data.success) {
        setSuccess('Expense added successfully');
        setShowAddModal(false);
        setNewExpense({
          date: new Date().toISOString().split('T')[0],
          category: '',
          amount: '',
          notes: ''
        });
        fetchExpenses();
        
        // Trigger dashboard refresh
        localStorage.setItem('dashboard-refresh', Date.now().toString());
        
        // Also dispatch a custom event for immediate refresh
        window.dispatchEvent(new CustomEvent('dashboard-refresh', {
          detail: {
            timestamp: Date.now(),
            type: 'expense',
            amount: parseFloat(newExpense.amount)
          }
        }));
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to add expense');
      }
    } catch (error) {
      setError('Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const handleEditExpense = async (e) => {
    e.preventDefault();
    
    const errors = validateExpense(selectedExpense);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setValidationErrors({});
      const response = await expensesAPI.update(selectedExpense.id, {
        ...selectedExpense,
        amount: parseFloat(selectedExpense.amount)
      });
      if (response.data.success) {
        setSuccess('Expense updated successfully');
        setShowEditModal(false);
        setSelectedExpense(null);
        fetchExpenses();
        
        // Trigger dashboard refresh
        localStorage.setItem('dashboard-refresh', Date.now().toString());
        
        // Also dispatch a custom event for immediate refresh
        window.dispatchEvent(new CustomEvent('dashboard-refresh', {
          detail: {
            timestamp: Date.now(),
            type: 'expense-update',
            amount: parseFloat(selectedExpense.amount)
          }
        }));
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to update expense');
      }
    } catch (error) {
      setError('Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      setLoading(true);
      const response = await expensesAPI.delete(id);
      if (response.data.success) {
        setSuccess('Expense deleted successfully');
        fetchExpenses();
        
        // Trigger dashboard refresh
        localStorage.setItem('dashboard-refresh', Date.now().toString());
        
        // Also dispatch a custom event for immediate refresh
        window.dispatchEvent(new CustomEvent('dashboard-refresh', {
          detail: {
            timestamp: Date.now(),
            type: 'expense-delete'
          }
        }));
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete expense');
      }
    } catch (error) {
      setError('Failed to delete expense');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Category', 'Amount', 'Notes', 'Created By'],
      ...filteredAndSortedExpenses.map(expense => [
        expense.date,
        expense.category,
        expense.amount,
        expense.notes || '',
        expense.created_by_name || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  const openEditModal = (expense) => {
    setSelectedExpense({ ...expense });
    setShowEditModal(true);
    setValidationErrors({});
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className="h-screen bg-[#202020] p-6 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#F8F8F8]">Expense Management</h1>
              <p className="text-sm text-[#A5BF13]">Track and manage business expenses</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="bg-[#F79824] text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#E88A1A] focus:outline-none focus:ring-2 focus:ring-[#F79824] transition-all flex items-center gap-2 hover:shadow-xl hover:shadow-[#F79824]/30 hover:-translate-y-1 group ripple relative overflow-hidden"
              >
                {/* Ripple effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                
                <Download className="h-4 w-4 relative z-10 group-hover:animate-pulse" />
                <span className="relative z-10">Export CSV</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-[#A5BF13] text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#94A90F] focus:outline-none focus:ring-2 focus:ring-[#A5BF13] transition-all duration-300 flex items-center gap-2 hover:shadow-xl hover:shadow-[#A5BF13]/30 hover:-translate-y-1 group ripple relative overflow-hidden"
              >
                {/* Ripple effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                
                <Plus className="h-4 w-4 relative z-10 group-hover:animate-pulse" />
                <span className="relative z-10">Add Expense</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#A5BF13]/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#A5BF13] mb-1">Total Expenses</p>
                <p className="text-xl font-bold text-[#F8F8F8]">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#A5BF13] flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <DollarSign className="h-5 w-5 text-black" />
              </div>
            </div>
          </div>
          <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#B4182D]/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#A5BF13] mb-1">Total Amount</p>
                <p className="text-xl font-bold text-[#B4182D]">Rs {stats.totalAmount.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#B4182D] flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#F79824]/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#A5BF13] mb-1">This Month</p>
                <p className="text-xl font-bold text-[#F79824]">Rs {stats.thisMonth.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#F79824] flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <Calendar className="h-5 w-5 text-black" />
              </div>
            </div>
          </div>
          <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#C1E8FF]/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#A5BF13] mb-1">Avg Per Expense</p>
                <p className="text-xl font-bold text-[#C1E8FF]">Rs {stats.avgPerExpense.toFixed(0)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#C1E8FF] flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <TrendingDown className="h-5 w-5 text-black" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters - Compact Design */}
        <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg p-3 mb-4 hover:shadow-xl hover:shadow-[#A5BF13]/20 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#A5BF13] rounded-lg flex items-center justify-center hover:scale-110 transition-all duration-300">
                <Filter className="h-3 w-3 text-black" />
              </div>
              <h3 className="text-sm font-semibold text-[#F8F8F8]">Filters</h3>
            </div>
            <div className="text-xs text-[#A5BF13]">
              Filter expenses by criteria
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-[#A5BF13]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-3 py-1 bg-[#202020] border border-[#3A3A3A] rounded-lg text-xs text-[#F8F8F8] placeholder-[#A5BF13] focus:outline-none focus:ring-1 focus:ring-[#A5BF13] focus:border-transparent hover:border-[#A5BF13] transition-all duration-300"
                  placeholder="Search by category or notes..."
                />
              </div>
            </div>
            <div className="flex-1">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2 py-1 bg-[#202020] border border-[#3A3A3A] rounded-lg text-xs text-[#F8F8F8] focus:outline-none focus:ring-1 focus:ring-[#A5BF13] focus:border-transparent hover:border-[#A5BF13] transition-all duration-300"
              >
                <option value="">All Categories</option>
                {expenseCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-32 px-2 py-1 bg-[#202020] border border-[#3A3A3A] rounded-lg text-xs text-[#F8F8F8] focus:outline-none focus:ring-1 focus:ring-[#A5BF13] focus:border-transparent hover:border-[#A5BF13] transition-all duration-300"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-32 px-2 py-1 bg-[#202020] border border-[#3A3A3A] rounded-lg text-xs text-[#F8F8F8] focus:outline-none focus:ring-1 focus:ring-[#A5BF13] focus:border-transparent hover:border-[#A5BF13] transition-all duration-300"
              />
            </div>
            <div>
              <button
                onClick={clearFilters}
                className="px-3 py-1 bg-[#202020] border border-[#3A3A3A] rounded-lg text-xs text-[#F8F8F8] font-medium hover:bg-[#3A3A3A] transition-all flex items-center justify-center gap-1 hover:shadow-lg hover:shadow-[#A5BF13]/20"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="mb-4 bg-[#2A2A2A] border border-[#B4182D] rounded-lg p-3 hover:shadow-lg hover:shadow-[#B4182D]/20 transition-all duration-300">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-[#B4182D] mr-2 animate-pulse" />
              <p className="text-[#F8F8F8] text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-[#2A2A2A] border border-[#A5BF13] rounded-lg p-3 hover:shadow-lg hover:shadow-[#A5BF13]/20 transition-all duration-300">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-[#A5BF13] mr-2 animate-pulse" />
              <p className="text-[#F8F8F8] text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Expenses Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A5BF13]"></div>
            </div>
          ) : paginatedExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#2A2A2A] rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-all duration-300">
                <DollarSign className="h-8 w-8 text-[#A5BF13]" />
              </div>
              <h3 className="text-lg font-semibold text-[#F8F8F8] mb-2">No expenses found</h3>
              <p className="text-[#A5BF13]">
                {searchTerm || categoryFilter || dateRange.start || dateRange.end 
                  ? 'Try adjusting your filters.' 
                  : 'Get started by adding your first expense.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedExpenses.map((expense) => (
                <div key={expense.id} className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#A5BF13]/20 hover:-translate-y-2 transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#F8F8F8] text-sm group-hover:text-[#A5BF13] transition-colors duration-300">{expense.category}</h3>
                      <p className="text-xs text-[#A5BF13] flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#B4182D]">Rs {expense.amount.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A5BF13]">Notes:</span>
                      <span className="text-xs text-[#F8F8F8] max-w-xs truncate">
                        {expense.notes || 'No notes'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A5BF13]">Created by:</span>
                      <span className="text-xs text-[#F8F8F8]">
                        {expense.created_by_name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-3 border-t border-[#3A3A3A]">
                    <button
                      onClick={() => openEditModal(expense)}
                      className="w-20 px-2 py-1.5 bg-[#A5BF13] text-black rounded-lg text-xs font-medium hover:bg-[#94A90F] hover:scale-105 transition-all flex items-center justify-center gap-1 ripple relative overflow-hidden group"
                    >
                      {/* Ripple effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      
                      <Edit className="h-3 w-3 relative z-10 group-hover:animate-pulse" />
                      <span className="relative z-10">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="w-20 px-2 py-1.5 bg-[#B4182D] text-white rounded-lg text-xs font-medium hover:bg-[#A31528] hover:scale-105 transition-all flex items-center justify-center gap-1 ripple relative overflow-hidden group"
                    >
                      {/* Ripple effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      
                      <Trash2 className="h-3 w-3 relative z-10 group-hover:animate-pulse" />
                      <span className="relative z-10">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#A5BF13]/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="text-sm text-[#A5BF13]">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedExpenses.length)} of {filteredAndSortedExpenses.length} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-[#202020] border border-[#3A3A3A] rounded-lg text-[#F8F8F8] hover:bg-[#3A3A3A] disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all hover:shadow-lg hover:shadow-[#A5BF13]/20"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-[#A5BF13]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-[#202020] border border-[#3A3A3A] rounded-lg text-[#F8F8F8] hover:bg-[#3A3A3A] disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all hover:shadow-lg hover:shadow-[#A5BF13]/20"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#3A3A3A]">
              <h3 className="text-lg font-semibold text-[#F8F8F8]">Add New Expense</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setValidationErrors({});
                }}
                className="w-8 h-8 rounded-lg bg-[#202020] hover:bg-[#3A3A3A] flex items-center justify-center transition-all hover:scale-110"
              >
                <X className="h-4 w-4 text-[#F8F8F8]" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <form onSubmit={handleAddExpense}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#A5BF13] mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                      className={`block w-full px-3 py-2 bg-[#202020] border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm text-[#F8F8F8] hover:border-[#A5BF13] transition-all duration-300 ${
                        validationErrors.date ? 'border-[#B4182D]' : 'border-[#3A3A3A]'
                      }`}
                    />
                    {validationErrors.date && (
                      <p className="mt-1 text-sm text-[#B4182D]">{validationErrors.date}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A5BF13] mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                      className={`block w-full px-3 py-2 bg-[#202020] border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm text-[#F8F8F8] hover:border-[#A5BF13] transition-all duration-300 ${
                        validationErrors.category ? 'border-[#B4182D]' : 'border-[#3A3A3A]'
                      }`}
                    >
                      <option value="">Select Category</option>
                      {expenseCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {validationErrors.category && (
                      <p className="mt-1 text-sm text-[#B4182D]">{validationErrors.category}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A5BF13] mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                      className={`block w-full px-3 py-2 bg-[#202020] border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm text-[#F8F8F8] hover:border-[#A5BF13] transition-all duration-300 ${
                        validationErrors.amount ? 'border-[#B4182D]' : 'border-[#3A3A3A]'
                      }`}
                      placeholder="0.00"
                    />
                    {validationErrors.amount && (
                      <p className="mt-1 text-sm text-[#B4182D]">{validationErrors.amount}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A5BF13] mb-1">
                      Notes
                    </label>
                    <textarea
                      value={newExpense.notes}
                      onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                      rows={3}
                      className="block w-full px-3 py-2 bg-[#202020] border border-[#3A3A3A] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm text-[#F8F8F8] hover:border-[#A5BF13] transition-all duration-300"
                      placeholder="Optional notes about this expense"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setValidationErrors({});
                    }}
                    className="flex-1 px-4 py-2 bg-[#202020] border border-[#3A3A3A] rounded-lg text-[#F8F8F8] font-medium hover:bg-[#3A3A3A] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-[#A5BF13] text-black rounded-lg font-semibold hover:bg-[#94A90F] disabled:opacity-50 transition-all ripple relative overflow-hidden group"
                  >
                    {/* Ripple effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    
                    <span className="relative z-10">{loading ? 'Adding...' : 'Add Expense'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#3A3A3A]">
              <h3 className="text-lg font-semibold text-[#F8F8F8]">Edit Expense</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setValidationErrors({});
                }}
                className="w-8 h-8 rounded-lg bg-[#202020] hover:bg-[#3A3A3A] flex items-center justify-center transition-all hover:scale-110"
              >
                <X className="h-4 w-4 text-[#F8F8F8]" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <form onSubmit={handleEditExpense}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#A5BF13] mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={selectedExpense.date}
                      onChange={(e) => setSelectedExpense({...selectedExpense, date: e.target.value})}
                      className={`block w-full px-3 py-2 bg-[#202020] border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm text-[#F8F8F8] hover:border-[#A5BF13] transition-all duration-300 ${
                        validationErrors.date ? 'border-[#B4182D]' : 'border-[#3A3A3A]'
                      }`}
                    />
                    {validationErrors.date && (
                      <p className="mt-1 text-sm text-[#B4182D]">{validationErrors.date}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A5BF13] mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={selectedExpense.category}
                      onChange={(e) => setSelectedExpense({...selectedExpense, category: e.target.value})}
                      className={`block w-full px-3 py-2 bg-[#202020] border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm text-[#F8F8F8] hover:border-[#A5BF13] transition-all duration-300 ${
                        validationErrors.category ? 'border-[#B4182D]' : 'border-[#3A3A3A]'
                      }`}
                    >
                      {expenseCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {validationErrors.category && (
                      <p className="mt-1 text-sm text-[#B4182D]">{validationErrors.category}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A5BF13] mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={selectedExpense.amount}
                      onChange={(e) => setSelectedExpense({...selectedExpense, amount: e.target.value})}
                      className={`block w-full px-3 py-2 bg-[#202020] border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm text-[#F8F8F8] hover:border-[#A5BF13] transition-all duration-300 ${
                        validationErrors.amount ? 'border-[#B4182D]' : 'border-[#3A3A3A]'
                      }`}
                    />
                    {validationErrors.amount && (
                      <p className="mt-1 text-sm text-[#B4182D]">{validationErrors.amount}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A5BF13] mb-1">
                      Notes
                    </label>
                    <textarea
                      value={selectedExpense.notes || ''}
                      onChange={(e) => setSelectedExpense({...selectedExpense, notes: e.target.value})}
                      rows={3}
                      className="block w-full px-3 py-2 bg-[#202020] border border-[#3A3A3A] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm text-[#F8F8F8] hover:border-[#A5BF13] transition-all duration-300"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setValidationErrors({});
                    }}
                    className="flex-1 px-4 py-2 bg-[#202020] border border-[#3A3A3A] rounded-lg text-[#F8F8F8] font-medium hover:bg-[#3A3A3A] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-[#A5BF13] text-black rounded-lg font-semibold hover:bg-[#94A90F] disabled:opacity-50 transition-all ripple relative overflow-hidden group"
                  >
                    {/* Ripple effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    
                    <span className="relative z-10">{loading ? 'Updating...' : 'Update Expense'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;