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
  Loader2
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'green', text: 'Active' },
      pending: { color: 'yellow', text: 'Pending' },
      inactive: { color: 'red', text: 'Inactive' }
    };
    const config = statusConfig[status] || { color: 'gray', text: status };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${config.color}-100 text-${config.color}-800`}>
        {config.text}
      </span>
    );
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.barcode.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your stock items and track inventory
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
        >
          <Plus size={20} />
          Add Item
        </button>
      </div>

      {/* Filters and search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Items
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by name or barcode..."
              />
            </div>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status Filter
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">{success}</div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Inventory Items</h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first item.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className={item.quantity <= item.reorder_level ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Scan size={14} />
                          {item.barcode}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${
                          item.quantity <= item.reorder_level ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {item.quantity}
                        </span>
                        {item.quantity <= item.reorder_level && (
                          <AlertTriangle className="ml-2 h-4 w-4 text-red-400" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Reorder: {item.reorder_level}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs {item.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.expiry_date ? (
                          <>
                            <span className={`text-sm ${
                              new Date(item.expiry_date) < new Date() 
                                ? 'text-red-600' 
                                : new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? 'text-yellow-600'
                                : 'text-gray-900'
                            }`}>
                              {new Date(item.expiry_date).toLocaleDateString()}
                            </span>
                            {(new Date(item.expiry_date) < new Date() || 
                              new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) && (
                              <Clock className="ml-2 h-4 w-4 text-yellow-400" />
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">No expiry</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Item</h3>
              <p className="text-sm text-gray-600 mb-4">
                💡 <strong>Tip:</strong> When you scan or enter a barcode, the system will automatically detect if the item already exists and offer to fill in the details for you.
              </p>
              <form onSubmit={handleAddItem}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barcode *
                    </label>
                    <div className="relative">
                      <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                        className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Scan or enter barcode (press Enter to auto-fill)"
                      />
                      {barcodeLoading && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500 animate-spin" />
                      )}
                      {!barcodeLoading && existingItem && (
                        <button
                          type="button"
                          onClick={autoFillForm}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                          title="Auto-fill form with existing item details"
                        >
                          <Package size={16} />
                        </button>
                      )}
                      {!barcodeLoading && barcodeError && (
                        <AlertTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
                      )}
                    </div>
                    {existingItem && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
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
                            title={`Will fill: Name: ${existingItem.name}, Price: Rs ${existingItem.price}, Reorder Level: ${existingItem.reorder_level}`}
                          >
                            Auto-fill form
                          </button>
                          <button
                            type="button"
                            onClick={clearAutoFill}
                            className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                            title="Clear auto-fill and add as a completely new item"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Item name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={newItem.price}
                        onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={newItem.expiry_date}
                      onChange={(e) => setNewItem({...newItem, expiry_date: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newItem.reorder_level}
                      onChange={(e) => setNewItem({...newItem, reorder_level: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Item</h3>
              <form onSubmit={handleEditItem}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barcode
                    </label>
                    <input
                      type="text"
                      value={selectedItem.barcode}
                      onChange={(e) => setSelectedItem({...selectedItem, barcode: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={selectedItem.name}
                      onChange={(e) => setSelectedItem({...selectedItem, name: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={selectedItem.quantity}
                        onChange={(e) => setSelectedItem({...selectedItem, quantity: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={selectedItem.price}
                        onChange={(e) => setSelectedItem({...selectedItem, price: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={selectedItem.expiry_date || ''}
                      onChange={(e) => setSelectedItem({...selectedItem, expiry_date: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={selectedItem.reorder_level}
                      onChange={(e) => setSelectedItem({...selectedItem, reorder_level: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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