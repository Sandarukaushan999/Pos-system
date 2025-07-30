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
      <div className="h-screen bg-[#202020] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A5BF13]"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#202020] p-6 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#F8F8F8]">Stock Approval</h1>
              <p className="text-sm text-[#A5BF13]">Review and approve pending stock items</p>
            </div>
            <button
              onClick={fetchPendingItems}
              disabled={loading}
              className="bg-[#A5BF13] text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#94A90F] focus:outline-none focus:ring-2 focus:ring-[#A5BF13] transition-all duration-300 flex items-center gap-2 disabled:opacity-50 hover:shadow-xl hover:shadow-[#A5BF13]/30 hover:-translate-y-1 group ripple relative overflow-hidden"
            >
              {/* Ripple effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : 'group-hover:animate-pulse'} relative z-10`} />
              <span className="relative z-10">Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#A5BF13]/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#A5BF13] mb-1">Total Pending</p>
                <p className="text-xl font-bold text-[#F8F8F8]">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#A5BF13] flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <Package className="h-5 w-5 text-black" />
              </div>
            </div>
          </div>
          <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#F79824]/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#A5BF13] mb-1">High Value</p>
                <p className="text-xl font-bold text-[#F79824]">{stats.highValue}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#F79824] flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <TrendingUp className="h-5 w-5 text-black" />
              </div>
            </div>
          </div>
          <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#F79824]/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#A5BF13] mb-1">Near Expiry</p>
                <p className="text-xl font-bold text-[#F79824]">{stats.nearExpiry}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#F79824] flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <Clock className="h-5 w-5 text-black" />
              </div>
            </div>
          </div>
          <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#B4182D]/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#A5BF13] mb-1">Urgent</p>
                <p className="text-xl font-bold text-[#B4182D]">{stats.urgent}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#B4182D] flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
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
              <Check className="h-4 w-4 text-[#A5BF13] mr-2 animate-pulse" />
              <p className="text-[#F8F8F8] text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Pending Items Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A5BF13]"></div>
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#2A2A2A] rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-all duration-300">
                <Package className="h-8 w-8 text-[#A5BF13]" />
              </div>
              <h3 className="text-lg font-semibold text-[#F8F8F8] mb-2">No pending items</h3>
              <p className="text-[#A5BF13]">All items have been reviewed and processed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingItems.map((item) => (
                <div key={item.id} className={`bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-lg p-4 hover:shadow-xl hover:shadow-[#A5BF13]/20 hover:-translate-y-2 transition-all duration-300 group ${
                  item.expiry_date && new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    ? 'border-2 border-[#B4182D]'
                    : item.expiry_date && new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    ? 'border-2 border-[#F79824]'
                    : ''
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#F8F8F8] text-sm group-hover:text-[#A5BF13] transition-colors duration-300">{item.name}</h3>
                      <p className="text-xs text-[#A5BF13] mt-1">{item.barcode}</p>
                      {item.expiry_date && new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-[#B4182D] text-white rounded-full mt-1 animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          URGENT
                        </span>
                      )}
                      {item.expiry_date && new Date(item.expiry_date) >= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && 
                       new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-[#F79824] text-black rounded-full mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          Near Expiry
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#F8F8F8]">Rs {item.price.toLocaleString()}</p>
                      <p className="text-xs text-[#A5BF13]">each</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A5BF13]">Quantity:</span>
                      <span className="text-sm font-semibold text-[#F8F8F8]">{item.quantity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A5BF13]">Reorder Level:</span>
                      <span className="text-xs text-[#A5BF13]">{item.reorder_level}</span>
                    </div>
                    {item.expiry_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#A5BF13]">Expiry:</span>
                        <span className={`text-xs ${
                          new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                            ? 'text-[#B4182D]'
                            : new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            ? 'text-[#F79824]'
                            : 'text-[#A5BF13]'
                        }`}>
                          {new Date(item.expiry_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A5BF13]">Added:</span>
                      <span className="text-xs text-[#A5BF13] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-3 border-t border-[#3A3A3A]">
                    <button
                      onClick={() => handleApproval(item.id, 'approve')}
                      disabled={loading}
                      className="w-24 px-2 py-1.5 bg-[#A5BF13] text-black rounded-lg text-xs font-medium hover:bg-[#94A90F] hover:scale-105 transition-all flex items-center justify-center gap-1 disabled:opacity-50 ripple relative overflow-hidden group"
                    >
                      {/* Ripple effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      
                      <CheckCircle className="h-3 w-3 relative z-10 group-hover:animate-pulse" />
                      <span className="relative z-10">Approve</span>
                    </button>
                    <button
                      onClick={() => handleApproval(item.id, 'reject')}
                      disabled={loading}
                      className="w-24 px-2 py-1.5 bg-[#B4182D] text-white rounded-lg text-xs font-medium hover:bg-[#A31528] hover:scale-105 transition-all flex items-center justify-center gap-1 disabled:opacity-50 ripple relative overflow-hidden group"
                    >
                      {/* Ripple effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      
                      <XCircle className="h-3 w-3 relative z-10 group-hover:animate-pulse" />
                      <span className="relative z-10">Reject</span>
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