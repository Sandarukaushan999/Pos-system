import React, { useState, useRef, useEffect } from 'react';
import { 
  Scan, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  DollarSign,
  Printer,
  AlertTriangle,
  ShoppingBag,
  X,
  Check,
  Smartphone,
  Banknote,
  QrCode,
  Receipt
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
      // Fetch item from backend
      const response = await inventoryAPI.getByBarcode(barcode);
      if (!response.data.success || !response.data.item) {
        setError('Item not found. Please check the barcode and try again.');
        setBarcode('');
        return;
      }
      const item = response.data.item;
      if (item.isExpired) {
        setError('This item is expired and cannot be sold');
        setBarcode('');
        return;
      }
      const existingItem = cart.find(cartItem => cartItem.barcode === item.barcode);
      if (existingItem) {
        if (existingItem.quantity < item.quantity) {
          setCart(cart.map(cartItem => 
            cartItem.barcode === item.barcode 
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          ));
        } else {
          setError('Maximum available quantity already in cart');
          setBarcode('');
          return;
        }
      } else {
        setCart([...cart, { ...item, quantity: 1 }]);
      }
      setBarcode('');
      setSuccess('Item added to cart successfully!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      setError('Failed to add item. Please try again.');
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

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Please add items before checkout.');
      return;
    }
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    try {
      setLoading(true);
      setError('');
      // Send sale to backend
      const saleData = {
        items: cart.map(item => ({
          barcode: item.barcode,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        total: getTotal(),
        paymentType,
        // Optionally add cashier/salesman info here
      };
      const response = await salesAPI.create(saleData);
      if (response.data.success) {
      setSuccess('Sale completed successfully! Receipt printed.');
      setCart([]);
      setShowPaymentModal(false);
      setPaymentType('cash');
      setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Payment failed. Please try again.');
      }
    } catch (error) {
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setError('');
    setSuccess('');
  };

  const PaymentMethodIcon = ({ type }) => {
    switch (type) {
      case 'cash':
        return <Banknote className="h-5 w-5" />;
      case 'card':
        return <CreditCard className="h-5 w-5" />;
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Point of Sale</h1>
              <p className="text-xl text-slate-600">Scan items and process sales efficiently</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-slate-500">Items in Cart</p>
                <p className="text-2xl font-bold text-slate-900">{getTotalItems()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Scanner & Messages */}
          <div className="lg:col-span-2 space-y-6">
            {/* Barcode Scanner */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mr-4">
                    <Scan className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Barcode Scanner</h2>
                    <p className="text-blue-100">Scan or enter product barcode</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="barcode" className="block text-sm font-medium text-slate-700 mb-2">
                      Product Barcode
                    </label>
                    <div className="relative">
                      <QrCode className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        id="barcode"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSubmit(e)}
                        className="block w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl text-lg bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        placeholder="Scan barcode or enter manually..."
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleBarcodeSubmit}
                    disabled={loading || !barcode.trim()}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                        Adding Item...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Plus className="h-5 w-5 mr-2" />
                        Add to Cart
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 transform animate-pulse">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mr-4">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-800">Error</h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 transform animate-pulse">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mr-4">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">Success</h3>
                    <p className="text-green-700">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cart Items */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center mr-3">
                      <ShoppingBag className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Shopping Cart</h2>
                      <p className="text-slate-600">{cart.length} items</p>
                    </div>
                  </div>
                  <button
                    onClick={clearCart}
                    disabled={cart.length === 0}
                    className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              {cart.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Cart is Empty</h3>
                  <p className="text-slate-500">Start scanning items to add them to your cart</p>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {cart.map((item) => (
                    <div key={item.barcode} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all duration-300">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{item.name}</h3>
                            <p className="text-sm text-slate-500">{item.barcode}</p>
                            {item.isNearExpiry && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full mt-1">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Near Expiry
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">Rs {item.price.toFixed(2)}</p>
                            <p className="text-sm text-slate-500">each</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => updateQuantity(item.barcode, item.quantity - 1)}
                              className="w-8 h-8 rounded-lg bg-white border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all duration-300"
                            >
                              <Minus className="h-4 w-4 text-slate-600" />
                            </button>
                            <span className="text-lg font-semibold text-slate-900 w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.barcode, item.quantity + 1)}
                              className="w-8 h-8 rounded-lg bg-white border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all duration-300"
                            >
                              <Plus className="h-4 w-4 text-slate-600" />
                            </button>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <p className="text-xl font-bold text-slate-900">
                              Rs {(item.price * item.quantity).toLocaleString()}
                            </p>
                            <button
                              onClick={() => removeFromCart(item.barcode)}
                              className="w-8 h-8 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-300 flex items-center justify-center"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Cart Summary */}
          <div className="space-y-6">
            {/* Cart Summary */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden sticky top-8">
              <div className="p-6 bg-gradient-to-r from-green-500 to-blue-600">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mr-4">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Order Summary</h2>
                    <p className="text-green-100">Review your purchase</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-600">Total Items:</span>
                  <span className="font-semibold text-slate-900">{getTotalItems()}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold text-slate-900">Rs {getTotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-600">Tax (8%):</span>
                  <span className="font-semibold text-slate-900">Rs {(getTotal() * 0.08).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center py-4 bg-slate-50 rounded-xl px-4">
                  <span className="text-xl font-bold text-slate-900">Total:</span>
                  <span className="text-2xl font-bold text-slate-900">Rs {(getTotal() * 1.08).toFixed(2)}</span>
                </div>
                
                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || loading}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                >
                  <div className="flex items-center justify-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    {cart.length === 0 ? 'Cart Empty' : 'Proceed to Payment'}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100">
              <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">Payment</h3>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-300"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Select Payment Method
                  </label>
                  <div className="space-y-3">
                    {[
                      { value: 'cash', label: 'Cash Payment', icon: Banknote },
                      { value: 'card', label: 'Credit/Debit Card', icon: CreditCard },
                      { value: 'mobile', label: 'Mobile Payment', icon: Smartphone }
                    ].map((method) => (
                      <label key={method.value} className="flex items-center p-3 border-2 border-slate-200 rounded-xl hover:border-blue-300 cursor-pointer transition-all duration-300">
                        <input
                          type="radio"
                          name="payment"
                          value={method.value}
                          checked={paymentType === method.value}
                          onChange={(e) => setPaymentType(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-all duration-300 ${
                          paymentType === method.value 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          <method.icon className="h-5 w-5" />
                        </div>
                        <span className={`font-medium ${
                          paymentType === method.value ? 'text-blue-600' : 'text-slate-900'
                        }`}>
                          {method.label}
                        </span>
                        {paymentType === method.value && (
                          <Check className="h-5 w-5 text-blue-600 ml-auto" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-semibold">Rs {getTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">Tax (8%):</span>
                    <span className="font-semibold">Rs {(getTotal() * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Amount:</span>
                    <span>Rs {(getTotal() * 1.08).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processPayment}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-300"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      'Complete Sale'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingScreen;