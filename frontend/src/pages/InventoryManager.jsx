import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Clock,
  Package,
  Scan,
  Loader2,
  Filter,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { inventoryAPI } from '../services/api';

const InventoryManager = ({ isDarkMode = true }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add item form state
  const [newItem, setNewItem] = useState({
    barcode: '',
    name: '',
    quantity: '',
    price: '',
    buying_price: '',
    expiry_date: '',
    reorder_level: '10'
  });

  // Auto-fill states
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');
  const [existingItems, setExistingItems] = useState([]);
  const [selectedExistingItem, setSelectedExistingItem] = useState(null);

  // Debounce function for barcode search
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Function to fetch items by barcode
  const fetchItemsByBarcode = useCallback(async (barcode) => {
    if (!barcode.trim()) {
      setExistingItems([]);
      setSelectedExistingItem(null);
      setBarcodeError('');
      return;
    }

    try {
      setBarcodeLoading(true);
      setBarcodeError('');
      const response = await inventoryAPI.getByBarcode(barcode.trim());
      if (response.data.success) {
        setExistingItems(response.data.items || []);
        setSelectedExistingItem(null);
        setBarcodeError('');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setExistingItems([]);
        setSelectedExistingItem(null);
        setBarcodeError('No existing items found with this barcode');
      } else {
        setBarcodeError('Failed to fetch item details');
      }
    } finally {
      setBarcodeLoading(false);
    }
  }, []);

  // Debounced version of fetchItemsByBarcode
  const debouncedFetchBarcode = useCallback(
    debounce(fetchItemsByBarcode, 500),
    [fetchItemsByBarcode]
  );

  // Handle barcode input change
  const handleBarcodeChange = (e) => {
    const barcode = e.target.value;
    setNewItem({ ...newItem, barcode });
    
    // Clear existing items if barcode is cleared
    if (!barcode.trim()) {
      setExistingItems([]);
      setSelectedExistingItem(null);
      setBarcodeError('');
      return;
    }

    // Fetch item details if barcode is long enough
    if (barcode.trim().length >= 3) {
      debouncedFetchBarcode(barcode);
    }
  };

  // Auto-fill form with selected existing item data
  const autoFillForm = () => {
    if (selectedExistingItem) {
      // Show brief loading state
      setLoading(true);
      setTimeout(() => {
        setNewItem({
          barcode: selectedExistingItem.barcode,
          name: selectedExistingItem.name,
          quantity: '',
          price: selectedExistingItem.price.toString(),
          buying_price: selectedExistingItem.buying_price ? selectedExistingItem.buying_price.toString() : selectedExistingItem.price.toString(),
          expiry_date: '',
          reorder_level: selectedExistingItem.reorder_level.toString()
        });
        setSuccess(`✅ Auto-filled details for existing item: ${selectedExistingItem.name}`);
        setLoading(false);
        setTimeout(() => setSuccess(''), 3000);
      }, 300); // Brief delay to show loading state
    }
  };

  // Clear auto-fill and allow new item with same barcode
  const clearAutoFill = () => {
    setExistingItems([]);
    setSelectedExistingItem(null);
    setBarcodeError('');
    setNewItem({
      ...newItem,
      name: '',
      price: '',
      buying_price: '',
      reorder_level: '10'
    });
  };

  useEffect(() => {
    fetchItems();
  }, [statusFilter]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await inventoryAPI.getAll(params);
      if (response.data.success) {
        setItems(response.data.items);
      }
    } catch (error) {
      setError('Failed to fetch inventory items');
    } finally {
      setLoading(false);
    }
  };

  // Handle updating stock quantity for existing item
  const handleUpdateStock = async (itemId, quantity, expiryDate) => {
    try {
      setLoading(true);
      setError('');
      const response = await inventoryAPI.updateStock(itemId, { quantity, expiry_date: expiryDate });
      if (response.data.success) {
        setSuccess(response.data.message);
        setShowAddModal(false);
        setNewItem({
          barcode: '',
          name: '',
          quantity: '',
          price: '',
          buying_price: '',
          expiry_date: '',
          reorder_level: '10'
        });
        setExistingItems([]);
        setSelectedExistingItem(null);
        setBarcodeError('');
        fetchItems();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update stock quantity');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    // Validate required fields
    if (!newItem.barcode.trim() || !newItem.name.trim() || !newItem.quantity || !newItem.price || !newItem.buying_price) {
      setError('Barcode, name, quantity, selling price, and buying price are required');
      return;
    }

    // Check if items with same barcode exist and show confirmation
    if (existingItems.length > 0 && existingItems[0].barcode === newItem.barcode) {
      const confirmed = window.confirm(
        `Items with barcode "${newItem.barcode}" already exist:\n\n` +
        `Found ${existingItems.length} existing item(s) with the same barcode.\n\n` +
        `Are you sure you want to add this as a new item? This might create a duplicate entry.`
      );
      if (!confirmed) return;
    }

    try {
      setLoading(true);
      setError('');
      // Convert quantity and price to numbers
      const payload = {
        ...newItem,
        quantity: Number(newItem.quantity),
        price: Number(newItem.price),
        buying_price: Number(newItem.buying_price),
        reorder_level: Number(newItem.reorder_level) || 10,
      };
      const response = await inventoryAPI.create(payload);
      if (response.data.success) {
        setSuccess('Item added successfully (pending approval)');
        setShowAddModal(false);
        setNewItem({
          barcode: '',
          name: '',
          quantity: '',
          price: '',
          buying_price: '',
          expiry_date: '',
          reorder_level: '10'
        });
        setExistingItems([]);
        setSelectedExistingItem(null);
        setBarcodeError('');
        fetchItems();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.error || 'Failed to add item');
      }
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        setError('An item with this barcode and expiry date already exists. Please update the existing item instead.');
      } else {
        setError(error.response?.data?.error || 'Failed to add item');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const response = await inventoryAPI.update(selectedItem.id, selectedItem);
      if (response.data.success) {
        setSuccess('Item updated successfully');
        setShowEditModal(false);
        setSelectedItem(null);
        fetchItems();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      setLoading(true);
      const response = await inventoryAPI.delete(id);
      if (response.data.success) {
        setSuccess('Item deleted successfully');
        fetchItems();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (item) => {
    setSelectedItem({ ...item });
    setShowEditModal(true);
  };

  // Helper function to calculate item status
  const calculateItemStatus = (item) => {
    const isLowStock = item.status === 'active' && 
      (parseInt(item.quantity) || 0) <= (parseInt(item.reorder_level) || 10);
    
    const isExpired = item.status === 'active' && 
      item.expiry_date && 
      (() => {
        try {
          const expiryDate = new Date(item.expiry_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          expiryDate.setHours(0, 0, 0, 0);
          return expiryDate < today;
        } catch (error) {
          console.error('Error parsing expiry date:', item.expiry_date, error);
          return false;
        }
      })();

    return { isLowStock, isExpired };
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: '#A5BF13', text: 'Active', icon: CheckCircle },
      pending: { color: '#F79824', text: 'Pending', icon: Clock },
      inactive: { color: '#B4182D', text: 'Inactive', icon: XCircle }
    };
    const config = statusConfig[status] || { color: '#A5BF13', text: status, icon: Package };
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-[${config.color}] text-black`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </span>
    );
  };

  // Enhanced filtering logic
  const filteredItems = items.filter(item => {
    // Text search filter
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.barcode.includes(searchTerm);
    
    // Status filter
    const matchesStatus = !statusFilter || item.status === statusFilter;
    
    // Category filter
    let matchesCategory = true;
    if (categoryFilter) {
      const { isLowStock, isExpired } = calculateItemStatus(item);
      const today = new Date();
      const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
      const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
      
      switch (categoryFilter) {
        case 'expired':
          matchesCategory = isExpired;
          break;
        case 'pending':
          matchesCategory = item.status === 'pending';
          break;
        case 'near-expire':
          matchesCategory = expiryDate && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && item.status === 'active';
          break;
        case 'low-stock':
          matchesCategory = isLowStock;
          break;
        default:
          matchesCategory = true;
      }
    }
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate stats with better error handling
  const stats = {
    total: items.length,
    active: items.filter(item => item.status === 'active').length,
    pending: items.filter(item => item.status === 'pending').length,
    lowStock: items.filter(item => {
      const { isLowStock } = calculateItemStatus(item);
      return isLowStock;
    }).length,
    expired: items.filter(item => {
      const { isExpired } = calculateItemStatus(item);
      return isExpired;
    }).length,
    nearExpire: items.filter(item => {
      const today = new Date();
      const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
      const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
      return expiryDate && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && item.status === 'active';
    }).length
  };

  // Debug logging to help understand the data
  console.log('Inventory Stats Debug:', {
    totalItems: items.length,
    activeItems: items.filter(item => item.status === 'active').length,
    pendingItems: items.filter(item => item.status === 'pending').length,
    lowStockItems: items.filter(item => {
      const { isLowStock } = calculateItemStatus(item);
      return isLowStock;
    }).map(item => ({
      name: item.name,
      quantity: item.quantity,
      reorder_level: item.reorder_level,
      status: item.status
    })),
    expiredItems: items.filter(item => {
      const { isExpired } = calculateItemStatus(item);
      return isExpired;
    }).map(item => ({
      name: item.name,
      expiry_date: item.expiry_date,
      status: item.status
    })),
    nearExpireItems: items.filter(item => {
      const today = new Date();
      const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
      const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
      return expiryDate && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && item.status === 'active';
    }).map(item => ({
      name: item.name,
      expiry_date: item.expiry_date,
      status: item.status
    })),
    allItems: items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      reorder_level: item.reorder_level,
      status: item.status,
      expiry_date: item.expiry_date,
      ...calculateItemStatus(item)
    }))
  });

  return (
    <div className={`h-screen p-6 overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-[#202020]' : 'bg-white'}`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>Inventory Management</h1>
              <p className="text-sm text-[#A5BF13]">Manage your stock items and track inventory</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#A5BF13] text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#94A90F] focus:outline-none focus:ring-2 focus:ring-[#A5BF13] transition-all duration-300 flex items-center gap-2 hover:shadow-xl hover:shadow-[#A5BF13]/30 hover:-translate-y-1 group ripple relative overflow-hidden"
            >
              {/* Ripple effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              
              <Plus className="h-4 w-4 relative z-10 group-hover:animate-pulse" />
              <span className="relative z-10">Add Item</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className={`rounded-xl shadow-lg hover:shadow-2xl hover:shadow-[#A5BF13]/20 hover:-translate-y-1 transition-all duration-300 p-4 border group cursor-pointer ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium mb-1 group-hover:text-[#A5BF13] transition-colors duration-200 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>Total Items</p>
                <p className="text-xl font-bold text-[#A5BF13] group-hover:scale-105 transition-transform duration-200">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#A5BF13] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Package className="h-5 w-5 text-black group-hover:animate-bounce" />
              </div>
            </div>
          </div>
          <div className={`rounded-xl shadow-lg hover:shadow-2xl hover:shadow-[#A5BF13]/20 hover:-translate-y-1 transition-all duration-300 p-4 border group cursor-pointer ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium mb-1 group-hover:text-[#A5BF13] transition-colors duration-200 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>Active</p>
                <p className="text-xl font-bold text-[#A5BF13] group-hover:scale-105 transition-transform duration-200">{stats.active}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#A5BF13] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <CheckCircle className="h-5 w-5 text-black group-hover:animate-bounce" />
              </div>
            </div>
          </div>
          <div className={`rounded-xl shadow-lg hover:shadow-2xl hover:shadow-[#F79824]/20 hover:-translate-y-1 transition-all duration-300 p-4 border group cursor-pointer ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium mb-1 group-hover:text-[#F79824] transition-colors duration-200 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>Pending</p>
                <p className="text-xl font-bold text-[#F79824] group-hover:scale-105 transition-transform duration-200">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#F79824] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Clock className="h-5 w-5 text-black group-hover:animate-bounce" />
              </div>
            </div>
          </div>
          <div className={`rounded-xl shadow-lg hover:shadow-2xl hover:shadow-[#B4182D]/20 hover:-translate-y-1 transition-all duration-300 p-4 border group cursor-pointer ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-gray-50 border-gray-200'} ${stats.lowStock > 0 ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium mb-1 group-hover:text-[#B4182D] transition-colors duration-200 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>Low Stock</p>
                <p className="text-xl font-bold text-[#B4182D] group-hover:scale-105 transition-transform duration-200">{stats.lowStock}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#B4182D] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <AlertTriangle className="h-5 w-5 text-white group-hover:animate-bounce" />
              </div>
            </div>
          </div>
          <div className={`rounded-xl shadow-lg hover:shadow-2xl hover:shadow-[#B4182D]/20 hover:-translate-y-1 transition-all duration-300 p-4 border group cursor-pointer ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-gray-50 border-gray-200'} ${stats.expired > 0 ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium mb-1 group-hover:text-[#B4182D] transition-colors duration-200 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>Expired</p>
                <p className="text-xl font-bold text-[#B4182D] group-hover:scale-105 transition-transform duration-200">{stats.expired}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#B4182D] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <XCircle className="h-5 w-5 text-white group-hover:animate-bounce" />
              </div>
            </div>
          </div>
          <div className={`rounded-xl shadow-lg hover:shadow-2xl hover:shadow-[#F79824]/20 hover:-translate-y-1 transition-all duration-300 p-4 border group cursor-pointer ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-gray-50 border-gray-200'} ${stats.nearExpire > 0 ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium mb-1 group-hover:text-[#F79824] transition-colors duration-200 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>Near Expire</p>
                <p className="text-xl font-bold text-[#F79824] group-hover:scale-105 transition-transform duration-200">{stats.nearExpire}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#F79824] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Clock className="h-5 w-5 text-black group-hover:animate-bounce" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className={`rounded-xl shadow-lg p-4 mb-6 border transition-all duration-500 ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-gray-50 border-gray-200'}`}>
          {/* Active Filters Display */}
          {(searchTerm || statusFilter || categoryFilter) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#A5BF13] text-black">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 hover:bg-[#94A90F] rounded-full p-0.5 transition-colors duration-200"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </span>
              )}
              {statusFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#A5BF13] text-black">
                  Status: {statusFilter}
                  <button
                    onClick={() => setStatusFilter('')}
                    className="ml-1 hover:bg-[#94A90F] rounded-full p-0.5 transition-colors duration-200"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </span>
              )}
              {categoryFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#F79824] text-black">
                  Category: {categoryFilter.replace('-', ' ')}
                  <button
                    onClick={() => setCategoryFilter('')}
                    className="ml-1 hover:bg-[#E88A1A] rounded-full p-0.5 transition-colors duration-200"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent transition-all duration-300 ${isDarkMode ? 'border-[#3A3A3A] bg-[#202020] placeholder-[#F8F8F8]/50 text-[#F8F8F8]' : 'border-gray-300 bg-white placeholder-gray-500 text-gray-800'}`}
                placeholder="Search by name or barcode..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className={`h-4 w-4 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent transition-all duration-300 ${isDarkMode ? 'border-[#3A3A3A] bg-[#202020] text-[#F8F8F8]' : 'border-gray-300 bg-white text-gray-800'}`}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className={`h-4 w-4 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent transition-all duration-300 ${isDarkMode ? 'border-[#3A3A3A] bg-[#202020] text-[#F8F8F8]' : 'border-gray-300 bg-white text-gray-800'}`}
              >
                <option value="">All Categories</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
                <option value="near-expire">Near Expire</option>
                <option value="low-stock">Low Stock</option>
              </select>
            </div>
            {(searchTerm || statusFilter || categoryFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setCategoryFilter('');
                }}
                className={`px-3 py-2 text-sm rounded-lg transition-all duration-300 flex items-center gap-1 group ${isDarkMode ? 'text-[#F8F8F8] hover:text-[#A5BF13] hover:bg-[#202020]' : 'text-gray-700 hover:text-[#A5BF13] hover:bg-gray-100'}`}
              >
                <XCircle className="h-4 w-4 group-hover:animate-pulse" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className={`mb-4 border border-[#B4182D] rounded-lg p-3 transition-all duration-500 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-red-50'}`}>
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-[#B4182D] mr-2 animate-pulse" />
              <p className={`text-sm transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-red-800'}`}>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className={`mb-4 border border-[#A5BF13] rounded-lg p-3 transition-all duration-500 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-green-50'}`}>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-[#A5BF13] mr-2 animate-pulse" />
              <p className={`text-sm transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-green-800'}`}>{success}</p>
            </div>
          </div>
        )}

        {/* Inventory Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A5BF13]"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-gray-100'}`}>
                <Package className="h-8 w-8 text-[#A5BF13] group-hover:animate-pulse" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>No items found</h3>
              <p className="text-[#A5BF13]">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first item.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                // Calculate item status with improved logic
                const { isLowStock, isExpired } = calculateItemStatus(item);

                return (
                  <div key={item.id} className={`rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#A5BF13]/10 hover:-translate-y-1 transition-all duration-300 border group cursor-pointer ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-white border-gray-200'} ${
                    isLowStock ? 'border-2 border-[#F79824] animate-pulse' : ''
                  } ${
                    isExpired ? 'border-2 border-[#B4182D] animate-pulse' : ''
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className={`font-semibold text-sm group-hover:text-[#A5BF13] transition-colors duration-200 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>{item.name}</h3>
                        <p className="text-xs text-[#A5BF13] flex items-center gap-1 mt-1">
                          <Scan className="h-3 w-3 group-hover:animate-pulse" />
                          {item.barcode}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`}>Quantity:</span>
                        <span className={`text-sm font-semibold ${
                          isLowStock ? 'text-[#F79824]' : 'text-[#A5BF13]'
                        } group-hover:scale-110 transition-transform duration-200`}>
                          {item.quantity}
                          {isLowStock && (
                            <AlertTriangle className="inline h-3 w-3 ml-1 text-[#F79824] animate-pulse" />
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`}>Selling Price:</span>
                        <span className="text-sm font-semibold text-[#A5BF13] group-hover:scale-110 transition-transform duration-200">Rs {item.price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`}>Buying Price:</span>
                        <span className="text-sm text-[#A5BF13]">Rs {(item.buying_price || item.price).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`}>Profit Margin:</span>
                        <span className="text-xs font-medium text-[#A5BF13] group-hover:scale-110 transition-transform duration-200">
                          Rs {(item.price - (item.buying_price || item.price)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`}>Reorder Level:</span>
                        <span className="text-xs text-[#A5BF13]">{item.reorder_level}</span>
                      </div>
                      {item.expiry_date && (
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`}>Expiry:</span>
                          <span className={`text-xs ${
                            isExpired 
                              ? 'text-[#B4182D]' 
                              : new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                              ? 'text-[#F79824]'
                              : 'text-[#A5BF13]'
                          } group-hover:scale-110 transition-transform duration-200`}>
                            {new Date(item.expiry_date).toLocaleDateString()}
                            {isExpired && (
                              <AlertTriangle className="inline h-3 w-3 ml-1 animate-pulse" />
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center gap-2 pt-3 border-t transition-all duration-500 ${isDarkMode ? 'border-[#3A3A3A]' : 'border-gray-200'}`}>
                      <button
                        onClick={() => openEditModal(item)}
                        className="w-20 px-2 py-1.5 bg-[#A5BF13] text-black rounded-lg text-xs font-medium hover:bg-[#94A90F] transition-all duration-300 flex items-center justify-center gap-1 group hover:scale-105 ripple relative overflow-hidden"
                      >
                        {/* Ripple effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        
                        <Edit className="h-3 w-3 group-hover:animate-pulse relative z-10" />
                        <span className="relative z-10">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-20 px-2 py-1.5 bg-[#B4182D] text-white rounded-lg text-xs font-medium hover:bg-[#A31528] transition-all duration-300 flex items-center justify-center gap-1 group hover:scale-105 ripple relative overflow-hidden"
                      >
                        {/* Ripple effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        
                        <Trash2 className="h-3 w-3 group-hover:animate-pulse relative z-10" />
                        <span className="relative z-10">Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden border transition-all duration-500 ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between p-4 border-b transition-all duration-500 ${isDarkMode ? 'border-[#3A3A3A]' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>Add New Item</h3>
                              <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewItem({
                      barcode: '',
                      name: '',
                      quantity: '',
                      price: '',
                      buying_price: '',
                      expiry_date: '',
                      reorder_level: '10'
                    });
                    setExistingItems([]);
                    setSelectedExistingItem(null);
                    setBarcodeError('');
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group ripple ${isDarkMode ? 'bg-[#202020] hover:bg-[#A5BF13] hover:text-black' : 'bg-gray-100 hover:bg-[#A5BF13] hover:text-black'}`}
                >
                  <XCircle className={`h-4 w-4 group-hover:animate-pulse ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`} />
                </button>
            </div>
            <div className={`p-4 overflow-y-auto max-h-[60vh] transition-all duration-500 ${isDarkMode ? 'bg-[#202020]' : 'bg-gray-50'}`}>
              <p className="text-sm text-[#A5BF13] mb-4">
                💡 <strong>Tip:</strong> When you scan or enter a barcode, the system will automatically detect if the item already exists and offer to fill in the details for you.
              </p>
              <form onSubmit={handleAddItem}>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>
                      Barcode *
                    </label>
                    <div className="relative">
                      <Scan className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`} />
                      <input
                        type="text"
                        required
                        value={newItem.barcode}
                        onChange={handleBarcodeChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && selectedExistingItem) {
                            e.preventDefault();
                            autoFillForm();
                          }
                        }}
                        className={`block w-full pl-10 pr-12 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm transition-all duration-300 ${isDarkMode ? 'border-[#3A3A3A] bg-[#202020] text-[#F8F8F8] placeholder-[#F8F8F8]/50' : 'border-gray-300 bg-white text-gray-800 placeholder-gray-500'}`}
                        placeholder="Scan or enter barcode (press Enter to auto-fill)"
                      />
                      {barcodeLoading && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#A5BF13] animate-spin" />
                      )}
                      {!barcodeLoading && selectedExistingItem && (
                        <button
                          type="button"
                          onClick={autoFillForm}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#A5BF13] hover:text-[#94A90F] transition-colors duration-200"
                          title="Auto-fill form with existing item details"
                        >
                          <Package className="h-4 w-4" />
                        </button>
                      )}
                      {!barcodeLoading && barcodeError && (
                        <AlertTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#B4182D]" />
                      )}
                    </div>
                    {existingItems.length > 0 && (
                      <div className={`mt-2 p-3 border border-[#A5BF13] rounded-lg transition-all duration-500 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-green-50'}`}>
                        <div className={`text-sm mb-2 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-green-800'}`}>
                          <strong>Existing items found ({existingItems.length}):</strong>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {existingItems.map((item, index) => (
                            <div 
                              key={item.id} 
                              className={`p-2 rounded border cursor-pointer transition-all duration-200 ${
                                selectedExistingItem?.id === item.id 
                                  ? `border-[#A5BF13] ${isDarkMode ? 'bg-[#3A3A3A]' : 'bg-green-100'}` 
                                  : `${isDarkMode ? 'border-[#3A3A3A]' : 'border-gray-300'} hover:border-[#A5BF13]`
                              }`}
                              onClick={() => setSelectedExistingItem(item)}
                            >
                              <div className={`text-xs font-medium transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>
                                {item.name}
                              </div>
                              <div className="text-xs text-[#A5BF13] mt-1">
                                Stock: {item.quantity} | Price: Rs {item.price.toLocaleString()} | 
                                Status: {item.status}
                                {item.expiry_date && ` | Expiry: ${new Date(item.expiry_date).toLocaleDateString()}`}
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedExistingItem && (
                          <div className={`mt-3 p-2 rounded border border-[#A5BF13] transition-all duration-500 ${isDarkMode ? 'bg-[#3A3A3A]' : 'bg-green-100'}`}>
                            <div className={`text-xs mb-2 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>
                              <strong>Selected:</strong> {selectedExistingItem.name}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={autoFillForm}
                                className="text-xs bg-[#A5BF13] text-black px-2 py-1 rounded hover:bg-[#94A90F] transition-all duration-300"
                              >
                                Auto-fill form
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const quantity = prompt(`Enter quantity to add to "${selectedExistingItem.name}":`);
                                  if (quantity && !isNaN(quantity)) {
                                    const expiryDate = prompt(`Enter new expiry date (YYYY-MM-DD) or leave empty to keep current:`, selectedExistingItem.expiry_date || '');
                                    handleUpdateStock(selectedExistingItem.id, parseInt(quantity), expiryDate || selectedExistingItem.expiry_date);
                                  }
                                }}
                                className="text-xs bg-[#F79824] text-black px-2 py-1 rounded hover:bg-[#E88A1A] transition-all duration-300"
                              >
                                Update stock
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedExistingItem(null)}
                                className={`text-xs px-2 py-1 rounded transition-all duration-300 ${isDarkMode ? 'bg-[#3A3A3A] text-[#F8F8F8] hover:bg-[#202020]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                              >
                                Clear selection
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={clearAutoFill}
                            className={`text-xs px-2 py-1 rounded transition-all duration-300 ${isDarkMode ? 'bg-[#3A3A3A] text-[#F8F8F8] hover:bg-[#202020]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Add as new item
                          </button>
                        </div>
                      </div>
                    )}
                    {barcodeError && (
                      <div className="mt-2 text-sm text-[#B4182D]">
                        {barcodeError}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm transition-all duration-300 ${isDarkMode ? 'border-[#3A3A3A] bg-[#202020] text-[#F8F8F8] placeholder-[#F8F8F8]/50' : 'border-gray-300 bg-white text-gray-800 placeholder-gray-500'}`}
                      placeholder="Item name"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>
                        Quantity *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                        className="block w-full px-3 py-2 border border-[#3A3A3A] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm bg-[#202020] text-[#F8F8F8] transition-all duration-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#F8F8F8] mb-1">
                        Selling Price *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={newItem.price}
                        onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                        className="block w-full px-3 py-2 border border-[#3A3A3A] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm bg-[#202020] text-[#F8F8F8] placeholder-[#F8F8F8]/50 transition-all duration-300"
                        placeholder="Rs"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#F8F8F8] mb-1">
                        Buying Price *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={newItem.buying_price}
                        onChange={(e) => setNewItem({...newItem, buying_price: e.target.value})}
                        className="block w-full px-3 py-2 border border-[#3A3A3A] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm bg-[#202020] text-[#F8F8F8] placeholder-[#F8F8F8]/50 transition-all duration-300"
                        placeholder="Rs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F8F8F8] mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={newItem.expiry_date}
                      onChange={(e) => setNewItem({...newItem, expiry_date: e.target.value})}
                      className="block w-full px-3 py-2 border border-[#3A3A3A] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm bg-[#202020] text-[#F8F8F8] transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#F8F8F8] mb-1">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newItem.reorder_level}
                      onChange={(e) => setNewItem({...newItem, reorder_level: e.target.value})}
                      className="block w-full px-3 py-2 border border-[#3A3A3A] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent text-sm bg-[#202020] text-[#F8F8F8] transition-all duration-300"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewItem({
                        barcode: '',
                        name: '',
                        quantity: '',
                        price: '',
                        buying_price: '',
                        expiry_date: '',
                        reorder_level: '10'
                      });
                      setExistingItems([]);
                      setSelectedExistingItem(null);
                      setBarcodeError('');
                    }}
                    className="flex-1 px-4 py-2 border border-[#3A3A3A] rounded-lg text-[#F8F8F8] font-medium hover:bg-[#202020] transition-all duration-300 btn-press hover:shadow-lg hover:shadow-[#A5BF13]/10 hover:-translate-y-1 group ripple"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#A5BF13] text-black rounded-lg font-semibold hover:bg-[#94A90F] focus:outline-none focus:ring-2 focus:ring-[#A5BF13] transition-all duration-300 btn-press hover:shadow-xl hover:shadow-[#A5BF13]/30 hover:-translate-y-1 group ripple relative overflow-hidden"
                  >
                    {/* Ripple effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    
                    <span className="relative z-10 group-hover:animate-pulse">Add Item</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Edit Item</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"
              >
                <XCircle className="h-4 w-4 text-slate-600" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <form onSubmit={handleEditItem}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Barcode
                    </label>
                    <input
                      type="text"
                      value={selectedItem.barcode}
                      onChange={(e) => setSelectedItem({...selectedItem, barcode: e.target.value})}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={selectedItem.name}
                      onChange={(e) => setSelectedItem({...selectedItem, name: e.target.value})}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={selectedItem.quantity}
                        onChange={(e) => setSelectedItem({...selectedItem, quantity: e.target.value})}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Selling Price *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={selectedItem.price}
                        onChange={(e) => setSelectedItem({...selectedItem, price: e.target.value})}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Buying Price *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={selectedItem.buying_price || selectedItem.price}
                        onChange={(e) => setSelectedItem({...selectedItem, buying_price: e.target.value})}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={selectedItem.expiry_date || ''}
                      onChange={(e) => setSelectedItem({...selectedItem, expiry_date: e.target.value})}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={selectedItem.reorder_level}
                      onChange={(e) => setSelectedItem({...selectedItem, reorder_level: e.target.value})}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all"
                  >
                    {loading ? 'Updating...' : 'Update Item'}
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

export default InventoryManager; 