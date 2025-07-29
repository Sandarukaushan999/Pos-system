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

const InventoryManager = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
    expiry_date: '',
    reorder_level: '10'
  });

  // Auto-fill states
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');
  const [existingItem, setExistingItem] = useState(null);

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

  // Function to fetch item by barcode
  const fetchItemByBarcode = useCallback(async (barcode) => {
    if (!barcode.trim()) {
      setExistingItem(null);
      setBarcodeError('');
      return;
    }

    try {
      setBarcodeLoading(true);
      setBarcodeError('');
      const response = await inventoryAPI.getByBarcode(barcode.trim());
      if (response.data.success) {
        setExistingItem(response.data.item);
        setBarcodeError('');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setExistingItem(null);
        setBarcodeError('No existing item found with this barcode');
      } else {
        setBarcodeError('Failed to fetch item details');
      }
    } finally {
      setBarcodeLoading(false);
    }
  }, []);

  // Debounced version of fetchItemByBarcode
  const debouncedFetchBarcode = useCallback(
    debounce(fetchItemByBarcode, 500),
    [fetchItemByBarcode]
  );

  // Handle barcode input change
  const handleBarcodeChange = (e) => {
    const barcode = e.target.value;
    setNewItem({ ...newItem, barcode });
    
    // Clear existing item if barcode is cleared
    if (!barcode.trim()) {
      setExistingItem(null);
      setBarcodeError('');
      return;
    }

    // Fetch item details if barcode is long enough
    if (barcode.trim().length >= 3) {
      debouncedFetchBarcode(barcode);
    }
  };

  // Auto-fill form with existing item data
  const autoFillForm = () => {
    if (existingItem) {
      // Show brief loading state
      setLoading(true);
      setTimeout(() => {
        setNewItem({
          barcode: existingItem.barcode,
          name: existingItem.name,
          quantity: '',
          price: existingItem.price.toString(),
          expiry_date: '',
          reorder_level: existingItem.reorder_level.toString()
        });
        setSuccess(`✅ Auto-filled details for existing item: ${existingItem.name}`);
        setLoading(false);
        setTimeout(() => setSuccess(''), 3000);
      }, 300); // Brief delay to show loading state
    }
  };

  // Clear auto-fill and allow new item with same barcode
  const clearAutoFill = () => {
    setExistingItem(null);
    setBarcodeError('');
    setNewItem({
      ...newItem,
      name: '',
      price: '',
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

  const handleAddItem = async (e) => {
    e.preventDefault();
    // Validate required fields
    if (!newItem.barcode.trim() || !newItem.name.trim() || !newItem.quantity || !newItem.price) {
      setError('Barcode, name, quantity, and price are required');
      return;
    }

    // Check if item with same barcode exists and show confirmation
    if (existingItem && existingItem.barcode === newItem.barcode) {
      const confirmed = window.confirm(
        `An item with barcode "${newItem.barcode}" already exists:\n\n` +
        `Name: ${existingItem.name}\n` +
        `Price: Rs ${existingItem.price}\n\n` +
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
          expiry_date: '',
          reorder_level: '10'
        });
        setExistingItem(null);
        setBarcodeError('');
        fetchItems();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.error || 'Failed to add item');
      }
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        setError('An item with this barcode already exists. Please use a different barcode or contact an administrator.');
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
      active: { color: 'green', text: 'Active', icon: CheckCircle },
      pending: { color: 'yellow', text: 'Pending', icon: Clock },
      inactive: { color: 'red', text: 'Inactive', icon: XCircle }
    };
    const config = statusConfig[status] || { color: 'gray', text: status, icon: Package };
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-${config.color}-100 text-${config.color}-800`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.barcode.includes(searchTerm)
  );

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
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
              <p className="text-sm text-slate-600">Manage your stock items and track inventory</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Total Items</p>
                <p className="text-xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Active</p>
                <p className="text-xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-xl shadow-lg p-4 ${stats.lowStock > 0 ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Low Stock</p>
                <p className="text-xl font-bold text-red-600">{stats.lowStock}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-xl shadow-lg p-4 ${stats.expired > 0 ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Expired</p>
                <p className="text-xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search by name or barcode..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Inventory Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No items found</h3>
              <p className="text-slate-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first item.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                // Calculate item status with improved logic
                const { isLowStock, isExpired } = calculateItemStatus(item);

                return (
                  <div key={item.id} className={`bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition-all ${
                    isLowStock ? 'border-2 border-yellow-300 animate-pulse' : ''
                  } ${
                    isExpired ? 'border-2 border-red-300 animate-pulse' : ''
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-sm">{item.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Scan className="h-3 w-3" />
                          {item.barcode}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Quantity:</span>
                        <span className={`text-sm font-semibold ${
                          isLowStock ? 'text-red-600' : 'text-slate-900'
                        }`}>
                          {item.quantity}
                          {isLowStock && (
                            <AlertTriangle className="inline h-3 w-3 ml-1 text-red-500 animate-pulse" />
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Price:</span>
                        <span className="text-sm font-semibold text-slate-900">Rs {item.price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Reorder Level:</span>
                        <span className="text-xs text-slate-500">{item.reorder_level}</span>
                      </div>
                      {item.expiry_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">Expiry:</span>
                          <span className={`text-xs ${
                            isExpired 
                              ? 'text-red-600' 
                              : new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                              ? 'text-yellow-600'
                              : 'text-slate-500'
                          }`}>
                            {new Date(item.expiry_date).toLocaleDateString()}
                            {isExpired && (
                              <Clock className="inline h-3 w-3 ml-1 animate-pulse" />
                            )}
                            {!isExpired && new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                              <Clock className="inline h-3 w-3 ml-1" />
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => openEditModal(item)}
                        className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-all flex items-center justify-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-all flex items-center justify-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Add New Item</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewItem({
                    barcode: '',
                    name: '',
                    quantity: '',
                    price: '',
                    expiry_date: '',
                    reorder_level: '10'
                  });
                  setExistingItem(null);
                  setBarcodeError('');
                }}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"
              >
                <XCircle className="h-4 w-4 text-slate-600" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-slate-600 mb-4">
                💡 <strong>Tip:</strong> When you scan or enter a barcode, the system will automatically detect if the item already exists and offer to fill in the details for you.
              </p>
              <form onSubmit={handleAddItem}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Barcode *
                    </label>
                    <div className="relative">
                      <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={newItem.barcode}
                        onChange={handleBarcodeChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && existingItem) {
                            e.preventDefault();
                            autoFillForm();
                          }
                        }}
                        className="block w-full pl-10 pr-12 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Scan or enter barcode (press Enter to auto-fill)"
                      />
                      {barcodeLoading && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
                      )}
                      {!barcodeLoading && existingItem && (
                        <button
                          type="button"
                          onClick={autoFillForm}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                          title="Auto-fill form with existing item details"
                        >
                          <Package className="h-4 w-4" />
                        </button>
                      )}
                      {!barcodeLoading && barcodeError && (
                        <AlertTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {existingItem && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm text-blue-800">
                          <strong>Existing item found:</strong> {existingItem.name}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Price: Rs {existingItem.price.toLocaleString()} | 
                          Current Stock: {existingItem.quantity} | 
                          Reorder Level: {existingItem.reorder_level}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={autoFillForm}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                          >
                            Auto-fill form
                          </button>
                          <button
                            type="button"
                            onClick={clearAutoFill}
                            className="text-xs bg-slate-500 text-white px-2 py-1 rounded hover:bg-slate-600"
                          >
                            Add as new item
                          </button>
                        </div>
                      </div>
                    )}
                    {barcodeError && (
                      <div className="mt-2 text-sm text-red-600">
                        {barcodeError}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Item name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Price *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={newItem.price}
                        onChange={(e) => setNewItem({...newItem, price: e.target.value})}
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
                      value={newItem.expiry_date}
                      onChange={(e) => setNewItem({...newItem, expiry_date: e.target.value})}
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
                      value={newItem.reorder_level}
                      onChange={(e) => setNewItem({...newItem, reorder_level: e.target.value})}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                        expiry_date: '',
                        reorder_level: '10'
                      });
                      setExistingItem(null);
                      setBarcodeError('');
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all"
                  >
                    {loading ? 'Adding...' : 'Add Item'}
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
                  <div className="grid grid-cols-2 gap-4">
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
                        Price *
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