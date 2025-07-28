import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  UserCheck,
  UserX
} from 'lucide-react';
import { inventoryAPI } from '../services/api';

const StockApproval = () => {
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getPending();
      if (response.data.success) {
        setPendingItems(response.data.items);
      }
    } catch (error) {
      setError('Failed to fetch pending items');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id, action, itemData = null) => {
    try {
      setLoading(true);
      setError('');

      const response = await inventoryAPI.approve(id, {
        action,
        ...itemData
      });

      if (response.data.success) {
        setSuccess(`Item ${action}ed successfully`);
        fetchPendingItems();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.error || `Failed to ${action} item`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: pendingItems.length,
    highValue: pendingItems.filter(item => item.price > 100).length,
    nearExpiry: pendingItems.filter(item => 
      item.expiry_date && new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    ).length,
    urgent: pendingItems.filter(item => 
      item.expiry_date && new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ).length
  };

  if (loading && pendingItems.length === 0) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Stock Approval</h1>
              <p className="text-sm text-slate-600">Review and approve pending stock items</p>
            </div>
            <button
              onClick={fetchPendingItems}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Total Pending</p>
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
                <p className="text-xs font-medium text-slate-600 mb-1">High Value</p>
                <p className="text-xl font-bold text-green-600">{stats.highValue}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Near Expiry</p>
                <p className="text-xl font-bold text-yellow-600">{stats.nearExpiry}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Urgent</p>
                <p className="text-xl font-bold text-red-600">{stats.urgent}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
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
              <Check className="h-4 w-4 text-green-600 mr-2" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Pending Items Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No pending items</h3>
              <p className="text-slate-500">All items have been reviewed and processed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingItems.map((item) => (
                <div key={item.id} className={`bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition-all ${
                  item.expiry_date && new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    ? 'border-2 border-red-200'
                    : item.expiry_date && new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    ? 'border-2 border-yellow-200'
                    : ''
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-sm">{item.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{item.barcode}</p>
                      {item.expiry_date && new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full mt-1 animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          URGENT
                        </span>
                      )}
                      {item.expiry_date && new Date(item.expiry_date) >= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && 
                       new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          Near Expiry
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">Rs {item.price.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">each</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Quantity:</span>
                      <span className="text-sm font-semibold text-slate-900">{item.quantity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Reorder Level:</span>
                      <span className="text-xs text-slate-500">{item.reorder_level}</span>
                    </div>
                    {item.expiry_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Expiry:</span>
                        <span className={`text-xs ${
                          new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                            ? 'text-red-600'
                            : new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            ? 'text-yellow-600'
                            : 'text-slate-500'
                        }`}>
                          {new Date(item.expiry_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Added:</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleApproval(item.id, 'approve')}
                      disabled={loading}
                      className="flex-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproval(item.id, 'reject')}
                      disabled={loading}
                      className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <XCircle className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockApproval; 