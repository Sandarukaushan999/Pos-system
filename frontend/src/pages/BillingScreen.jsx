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
  QrCode
} from 'lucide-react';
import { inventoryAPI, salesAPI } from '../services/api';

const Receipt = ({ sale, items }) => (
  <div className="font-mono text-xs">
    <div className="text-center mb-2">
      <h3 className="font-bold">STORE RECEIPT</h3>
      <p>{new Date().toLocaleString()}</p>
    </div>
    <div className="border-t border-b py-2">
      {items.map((item, index) => (
        <div key={index} className="mb-2">
          <div className="flex justify-between">
            <span className="font-semibold">{item.name}</span>
            <span>Rs {(item.price * item.quantity).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Qty: {item.quantity} x Rs {item.price.toFixed(2)}</span>
            <span>Exp: {item.expiry_date}</span>
          </div>
        </div>
      ))}
    </div>
    <div className="mt-2">
      <div className="flex justify-between font-bold">
        <span>Total:</span>
        <span>Rs {sale.total.toFixed(2)}</span>
      </div>
    </div>
  </div>
);

const BillingScreen = () => {
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const barcodeInputRef = useRef(null);
  const [printData, setPrintData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

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
      
      // Use real API call to get item by barcode
      const response = await inventoryAPI.getByBarcode(barcode);
      
      if (!response.data.success || !response.data.item) {
        setError('Item not found. Please check the barcode and try again.');
        setBarcode('');
        return;
      }
      
      const item = response.data.item;
      
      // Check if item is expired
      if (item.expiry_date && new Date(item.expiry_date) < new Date()) {
        setError('This item is expired and cannot be sold. Expiry date: ' + new Date(item.expiry_date).toLocaleDateString());
        setBarcode('');
        return;
      }
      
      // Check if item is near expiry (within 7 days) - show warning but allow sale
      const isNearExpiry = item.expiry_date && new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      if (isNearExpiry) {
        setError('Warning: This item expires soon (' + new Date(item.expiry_date).toLocaleDateString() + '). Please check before selling.');
        setBarcode('');
        return;
      }
      
      // Check if item has sufficient stock
      if (item.quantity <= 0) {
        setError('This item is out of stock.');
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
      console.error('Barcode scan error:', error);
      if (error.response?.status === 404) {
        setError('Item not found. Please check the barcode and try again.');
      } else {
        setError('Failed to add item. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (barcode, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(barcode);
      return;
    }
    const item = cart.find(item => item.barcode === barcode);
    if (newQuantity > item.quantity) {
      setError('Cannot exceed available stock');
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

  const processPayment = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Please add items before checkout.');
      return;
    }
    
    // Check for expired items in cart
    const expiredItems = cart.filter(item => 
      item.expiry_date && new Date(item.expiry_date) < new Date()
    );
    
    if (expiredItems.length > 0) {
      const expiredItemNames = expiredItems.map(item => item.name).join(', ');
      setError(`Cannot complete sale: The following items are expired: ${expiredItemNames}`);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const saleData = {
        items: cart.map(item => ({
          barcode: item.barcode,
          name: item.name,
          price: item.price,
          buying_price: item.buying_price || item.price,
          quantity: item.quantity,
          expiry_date: item.expiry_date
        })),
        total: getTotal(),
        paymentType
      };
      
      // Use real sales API to create the sale
      const response = await salesAPI.create(saleData);
      
      if (response.data.success) {
        setSuccess('Sale completed successfully!');
        setPrintData({ sale: saleData, items: saleData.items });
        setShowReceiptModal(true);
        setTimeout(() => setSuccess(''), 3000);
        setCart([]);
        setPaymentType('cash');
        
        // Trigger dashboard refresh
        localStorage.setItem('dashboard-refresh', Date.now().toString());
        
        // Also dispatch a custom event for immediate refresh
        window.dispatchEvent(new CustomEvent('dashboard-refresh', {
          detail: {
            timestamp: Date.now(),
            saleId: response.data.sale?.id,
            amount: saleData.total
          }
        }));
      } else {
        setError('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Payment failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setError('');
    setSuccess('');
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setPrintData(null);
  };

  return (
    <div className="h-screen bg-[#202020] flex">
      
      {/* Main Content Area - Full width layout */}
      <div className="flex-1 flex h-screen">
        
        {/* Left Section: Scanner + Cart */}
        <div className="flex-1 flex flex-col h-full">
          
          {/* Top Bar with Scanner */}
          <div className="bg-[#2A2A2A] border-b border-[#3A3A3A] p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#A5BF13] rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Scan className="h-5 w-5 text-black group-hover:animate-pulse" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-[#F8F8F8] mb-1">Barcode Scanner</h2>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <QrCode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#F8F8F8]" />
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSubmit(e)}
                      className="w-full pl-10 pr-4 py-2 border border-[#3A3A3A] rounded-lg text-sm bg-[#202020] placeholder-[#F8F8F8]/50 text-[#F8F8F8] focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent transition-all duration-300"
                      placeholder="Scan barcode or enter manually..."
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={handleBarcodeSubmit}
                    disabled={loading || !barcode.trim()}
                    className="px-6 py-2 bg-[#A5BF13] text-black rounded-lg font-semibold text-sm hover:bg-[#94A90F] focus:outline-none focus:ring-2 focus:ring-[#A5BF13] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl hover:shadow-[#A5BF13]/30 hover:-translate-y-1 relative overflow-hidden group ripple"
                  >
                    {/* Ripple effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    
                    {loading ? (
                      <div className="flex items-center relative z-10">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent mr-2"></div>
                        Adding...
                      </div>
                    ) : (
                      <div className="flex items-center relative z-10">
                        <Plus className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                        Add to Cart
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Messages */}
            {error && (
              <div className="mt-3 bg-[#2A2A2A] border border-[#B4182D] rounded-lg p-3">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-[#B4182D] mr-2 animate-pulse" />
                  <p className="text-[#F8F8F8] text-sm">{error}</p>
                </div>
              </div>
            )}
            {success && (
              <div className="mt-3 bg-[#2A2A2A] border border-[#A5BF13] rounded-lg p-3">
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-[#A5BF13] mr-2 animate-pulse" />
                  <p className="text-[#F8F8F8] text-sm">{success}</p>
                </div>
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div className="flex-1 bg-[#202020] overflow-hidden">
            <div className="p-4 border-b border-[#3A3A3A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#A5BF13] rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <ShoppingBag className="h-4 w-4 text-black group-hover:animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#F8F8F8]">Shopping Cart</h3>
                    <p className="text-sm text-[#A5BF13]">{cart.length} items</p>
                  </div>
                </div>
                <button
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="px-3 py-1 text-[#B4182D] hover:text-[#F8F8F8] hover:bg-[#B4182D] rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:shadow-lg hover:shadow-[#B4182D]/20 hover:-translate-y-1 group ripple"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#2A2A2A] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300">
                    <ShoppingBag className="h-8 w-8 text-[#A5BF13] group-hover:animate-pulse" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#F8F8F8] mb-2">Cart is Empty</h3>
                  <p className="text-[#A5BF13]">Start scanning items to add them to your cart</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.barcode} className={`rounded-lg p-4 hover:bg-[#2A2A2A] transition-all duration-300 hover:shadow-xl hover:shadow-[#A5BF13]/10 hover:-translate-y-1 group ${
                      item.expiry_date && new Date(item.expiry_date) < new Date() 
                        ? 'bg-[#2A2A2A] border-2 border-[#B4182D]' 
                        : 'bg-[#2A2A2A] border border-[#3A3A3A]'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#F8F8F8] group-hover:text-[#A5BF13] transition-colors duration-200">{item.name}</h4>
                          <p className="text-sm text-[#A5BF13]">{item.barcode}</p>
                          {item.expiry_date && new Date(item.expiry_date) < new Date() && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-[#B4182D] text-white rounded-full mt-1 animate-pulse">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              EXPIRED
                            </span>
                          )}
                          {item.expiry_date && new Date(item.expiry_date) >= new Date() && 
                           new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-[#F79824] text-black rounded-full mt-1">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Near Expiry
                            </span>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-bold text-[#A5BF13] group-hover:scale-110 transition-transform duration-200">Rs {item.price.toFixed(2)}</p>
                          <p className="text-sm text-[#F8F8F8]">each</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.barcode, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-[#202020] border border-[#3A3A3A] flex items-center justify-center hover:bg-[#A5BF13] hover:text-black transition-all duration-300 btn-press hover:scale-110 group"
                          >
                            <Minus className="h-4 w-4 text-[#F8F8F8] group-hover:animate-pulse" />
                          </button>
                          <span className="text-sm font-semibold text-[#A5BF13] w-8 text-center group-hover:scale-110 transition-transform duration-200">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.barcode, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-[#202020] border border-[#3A3A3A] flex items-center justify-center hover:bg-[#A5BF13] hover:text-black transition-all duration-300 btn-press hover:scale-110 group"
                          >
                            <Plus className="h-4 w-4 text-[#F8F8F8] group-hover:animate-pulse" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[#A5BF13] group-hover:scale-110 transition-transform duration-200">
                            Rs {(item.price * item.quantity).toLocaleString()}
                          </p>
                          <button
                            onClick={() => removeFromCart(item.barcode)}
                            className="w-8 h-8 rounded-lg bg-[#B4182D] text-white hover:bg-[#A5BF13] hover:text-black transition-all duration-300 flex items-center justify-center btn-press hover:scale-110 group"
                          >
                            <Trash2 className="h-4 w-4 group-hover:animate-pulse" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Payment */}
        <div className="w-96 bg-[#2A2A2A] border-l border-[#3A3A3A] flex flex-col h-full">
          
          {/* Payment Section */}
          <div className="p-4 border-b border-[#3A3A3A]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#A5BF13] rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <CreditCard className="h-4 w-4 text-black group-hover:animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold text-[#F8F8F8]">Payment</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#F8F8F8] mb-2">Select Payment Method</label>
                <div className="space-y-2">
                  {[
                    { value: 'cash', label: 'Cash Payment', icon: Banknote },
                    { value: 'card', label: 'Credit/Debit Card', icon: CreditCard },
                    { value: 'mobile', label: 'Mobile Payment', icon: Smartphone }
                  ].map((method) => (
                    <label key={method.value} className="flex items-center p-3 border border-[#3A3A3A] rounded-lg hover:border-[#A5BF13] cursor-pointer transition-all duration-300 hover:bg-[#202020] hover:shadow-lg hover:shadow-[#A5BF13]/10 hover:-translate-y-1 group">
                      <input
                        type="radio"
                        name="payment"
                        value={method.value}
                        checked={paymentType === method.value}
                        onChange={(e) => setPaymentType(e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-300 group-hover:scale-110 ${
                        paymentType === method.value ? 'bg-[#A5BF13] text-black' : 'bg-[#3A3A3A] text-[#F8F8F8]'
                      }`}>
                        <method.icon className="h-4 w-4 group-hover:animate-pulse" />
                      </div>
                      <span className={`font-medium transition-colors duration-200 ${
                        paymentType === method.value ? 'text-[#A5BF13]' : 'text-[#F8F8F8]'
                      }`}>{method.label}</span>
                      {paymentType === method.value && (
                        <Check className="h-4 w-4 text-[#A5BF13] ml-auto group-hover:animate-pulse" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="bg-[#202020] rounded-lg p-4 border border-[#3A3A3A] hover:shadow-xl hover:shadow-[#A5BF13]/10 transition-all duration-300">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-lg font-bold text-[#A5BF13]">
                    <span>Total Amount:</span>
                    <span className="group-hover:scale-110 transition-transform duration-200">Rs {getTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={clearCart}
                  className="flex-1 px-4 py-2 border border-[#3A3A3A] rounded-lg text-[#F8F8F8] font-medium hover:bg-[#202020] transition-all duration-300 btn-press hover:shadow-lg hover:shadow-[#A5BF13]/10 hover:-translate-y-1 group ripple"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  disabled={loading || cart.length === 0}
                  className="flex-1 px-4 py-2 bg-[#A5BF13] text-black rounded-lg font-semibold hover:bg-[#94A90F] disabled:opacity-50 transition-all duration-300 btn-press hover:shadow-xl hover:shadow-[#A5BF13]/30 hover:-translate-y-1 group ripple relative overflow-hidden"
                >
                  {/* Ripple effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center relative z-10">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    <span className="relative z-10 group-hover:animate-pulse">Complete Sale</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal Popup */}
      {showReceiptModal && printData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2A2A2A] rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden border border-[#3A3A3A]">
            <div className="flex items-center justify-between p-4 border-b border-[#3A3A3A]">
              <h3 className="text-lg font-semibold text-[#F8F8F8]">Receipt</h3>
              <button
                onClick={closeReceiptModal}
                className="w-8 h-8 rounded-lg bg-[#202020] hover:bg-[#A5BF13] hover:text-black flex items-center justify-center transition-all duration-300 group ripple"
              >
                <X className="h-4 w-4 text-[#F8F8F8] group-hover:animate-pulse" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] bg-[#202020]">
              <Receipt sale={printData.sale} items={printData.items} />
            </div>
            <div className="p-4 border-t border-[#3A3A3A] bg-[#2A2A2A]">
              <div className="flex gap-3">
                <button
                  onClick={closeReceiptModal}
                  className="flex-1 px-4 py-2 border border-[#3A3A3A] rounded-lg text-[#F8F8F8] font-medium hover:bg-[#202020] transition-all duration-300 btn-press hover:shadow-lg hover:shadow-[#A5BF13]/10 hover:-translate-y-1 group ripple"
                >
                  Close
                </button>
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 px-4 py-2 bg-[#A5BF13] text-black rounded-lg font-semibold hover:bg-[#94A90F] focus:outline-none focus:ring-2 focus:ring-[#A5BF13] transition-all duration-300 btn-press hover:shadow-xl hover:shadow-[#A5BF13]/30 hover:-translate-y-1 group ripple relative overflow-hidden"
                >
                  {/* Ripple effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  <div className="flex items-center justify-center relative z-10">
                    <Printer className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                    Print Receipt
                  </div>
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