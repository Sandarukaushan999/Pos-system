import React, { useState, useRef, useEffect } from 'react';
import { 
  Scan, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  DollarSign,
  Printer,
  AlertTriangle
} from 'lucide-react';
import { inventoryAPI, salesAPI } from '../services/api';

const BillingScreen = () => {
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    // Auto-focus barcode input
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    try {
      setLoading(true);
      setError('');
      
      const response = await inventoryAPI.getByBarcode(barcode);
      
      if (response.data.success) {
        const item = response.data.item;
        
        // Check if item is expired
        if (item.isExpired) {
          setError('This item is expired and cannot be sold');
          setBarcode('');
          return;
        }

        // Check if item is already in cart
        const existingItem = cart.find(cartItem => cartItem.barcode === item.barcode);
        
        if (existingItem) {
          // Update quantity if stock allows
          if (existingItem.quantity < item.quantity) {
            setCart(cart.map(cartItem => 
              cartItem.barcode === item.barcode 
                ? { ...cartItem, quantity: cartItem.quantity + 1 }
                : cartItem
            ));
          } else {
            setError('Maximum available quantity already in cart');
          }
        } else {
          // Add new item to cart
          setCart([...cart, {
            ...item,
            quantity: 1
          }]);
        }
        
        setBarcode('');
        setSuccess('Item added to cart');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Item not found');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (barcode, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(barcode);
      return;
    }

    setCart(cart.map(item => 
      item.barcode === barcode 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (barcode) => {
    setCart(cart.filter(item => item.barcode !== barcode));
  };

  const getTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    try {
      setLoading(true);
      setError('');

      const saleData = {
        items: cart.map(item => ({
          barcode: item.barcode,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          expiry_date: item.expiry_date
        })),
        payment_type: paymentType,
        total_amount: getTotal()
      };

      const response = await salesAPI.create(saleData);
      
      if (response.data.success) {
        setSuccess('Sale completed successfully!');
        setCart([]);
        setShowPaymentModal(false);
        setPaymentType('cash');
        
        // Print receipt (placeholder)
        printReceipt(response.data.sale);
        
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to process sale');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = (sale) => {
    // Placeholder for receipt printing
    console.log('Printing receipt:', sale);
    // In a real implementation, this would connect to an ESC/POS printer
  };

  const clearCart = () => {
    setCart([]);
    setError('');
    setSuccess('');
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Scan items and process sales
        </p>
      </div>

      {/* Barcode scanner */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleBarcodeSubmit} className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-2">
              Scan Barcode
            </label>
            <div className="relative">
              <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                id="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Scan barcode or enter manually"
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !barcode.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
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

      {/* Cart */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Cart</h2>
          <div className="flex gap-2">
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Cart
            </button>
          </div>
        </div>
        
        {cart.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Scan className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items in cart</h3>
            <p className="mt-1 text-sm text-gray-500">Start scanning items to add them to the cart.</p>
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
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cart.map((item) => (
                  <tr key={item.barcode}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.barcode}</div>
                        {item.isNearExpiry && (
                          <div className="text-xs text-yellow-600">Near expiry</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.barcode, item.quantity - 1)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="text-sm text-gray-900 w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.barcode, item.quantity + 1)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => removeFromCart(item.barcode)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Total and checkout */}
      {cart.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Total Items: {cart.length}</p>
              <p className="text-2xl font-bold text-gray-900">
                Total: ${getTotal().toFixed(2)}
              </p>
            </div>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CreditCard size={20} />
              Checkout
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile Payment</option>
                </select>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">${getTotal().toFixed(2)}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Complete Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingScreen; 