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
  Send
} from 'lucide-react';
import { inventoryAPI, salesAPI } from '../services/api';

const Receipt = ({ sale, items, isDarkMode = true }) => (
  <div className={`font-mono text-xs ${isDarkMode ? 'text-white' : 'text-black'}`}>
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
          <div className={`flex justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
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

const BillingScreen = ({ isDarkMode = true }) => {
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [sendingInvoice, setSendingInvoice] = useState(false);
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
        // Check if we can add one more item to cart
        const maxAvailable = existingItem.originalStock || item.quantity;
        if (existingItem.quantity < maxAvailable) {
          setCart(cart.map(cartItem => 
            cartItem.barcode === item.barcode 
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          ));
          setBarcode('');
          setSuccess('Item quantity increased in cart!');
          setTimeout(() => setSuccess(''), 2000);
        } else {
          setError(`Maximum available quantity (${maxAvailable}) already in cart`);
          setTimeout(() => setError(''), 3000);
          setBarcode('');
          return;
        }
      } else {
        // Add new item to cart with original stock quantity for reference
        setCart([...cart, { 
          ...item, 
          quantity: 1,
          originalStock: item.quantity // Store original stock for validation
        }]);
        setBarcode('');
        setSuccess('Item added to cart successfully!');
        setTimeout(() => setSuccess(''), 2000);
      }
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
    
    // Check against original stock (available stock from database)
    const maxAvailable = item.originalStock || item.quantity;
    if (newQuantity > maxAvailable) {
      setError(`Cannot exceed available stock (${maxAvailable} available)`);
      setTimeout(() => setError(''), 3000);
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
        paymentType,
        customerMobile: customerMobile.trim() || null,
        customerName: customerName.trim() || null
      };
      
      // Use real sales API to create the sale
      const response = await salesAPI.create(saleData);
      
      if (response.data.success) {
        setSuccess('Sale completed successfully!');
        setPrintData({ 
          sale: { ...saleData, id: response.data.sale?.id }, 
          items: saleData.items 
        });
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

  // Function to refresh stock information for items in cart
  const refreshStockInfo = async (barcode) => {
    try {
      const response = await inventoryAPI.getByBarcode(barcode);
      if (response.data.success && response.data.item) {
        const updatedItem = response.data.item;
        setCart(cart.map(item => 
          item.barcode === barcode 
            ? { ...item, originalStock: updatedItem.quantity }
            : item
        ));
      }
    } catch (error) {
      console.error('Failed to refresh stock info:', error);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setPrintData(null);
  };

  const sendInvoiceToCustomer = async () => {
    console.log('Send invoice clicked');
    console.log('Customer mobile:', customerMobile);
    console.log('Print data:', printData);
    
    if (!customerMobile.trim()) {
      setError('Please enter customer mobile number to send invoice');
      return;
    }

    if (!printData?.sale?.id) {
      setError('No sale data available to send');
      return;
    }

    try {
      setSendingInvoice(true);
      setError('');
      
      console.log('Sending invoice for sale ID:', printData.sale.id);
      console.log('To mobile:', customerMobile.trim());
      
      const response = await salesAPI.sendInvoice(printData.sale.id, customerMobile.trim());
      
      console.log('SMS API response:', response);
      
      if (response.data.success) {
        setSuccess(`Invoice sent successfully to ${response.data.phoneNumber}`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.error || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Send invoice error:', error);
      setError('Failed to send invoice. Please try again.');
    } finally {
      setSendingInvoice(false);
    }
  };

  return (
    <div className={`h-screen flex transition-all duration-500 ${isDarkMode ? 'bg-[#202020]' : 'bg-white'}`}>
      
      {/* Main Content Area - Full width layout */}
      <div className="flex-1 flex h-screen">
        
        {/* Left Section: Scanner + Cart */}
        <div className="flex-1 flex flex-col h-full">
          
          {/* Top Bar with Scanner */}
          <div className={`border-b p-4 transition-all duration-500 ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#A5BF13] rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Scan className="h-5 w-5 text-black group-hover:animate-pulse" />
              </div>
              <div className="flex-1">
                <h2 className={`text-lg font-semibold mb-1 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>Barcode Scanner</h2>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <QrCode className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`} />
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSubmit(e)}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent transition-all duration-300 ${isDarkMode ? 'border-[#3A3A3A] bg-[#202020] placeholder-[#F8F8F8]/50 text-[#F8F8F8]' : 'border-gray-300 bg-white placeholder-gray-500 text-gray-800'}`}
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
              <div className={`mt-3 border border-[#B4182D] rounded-lg p-3 transition-all duration-500 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-red-50'}`}>
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-[#B4182D] mr-2 animate-pulse" />
                  <p className={`text-sm transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-red-800'}`}>{error}</p>
                </div>
              </div>
            )}
            {success && (
              <div className={`mt-3 border border-[#A5BF13] rounded-lg p-3 transition-all duration-500 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-green-50'}`}>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-[#A5BF13] mr-2 animate-pulse" />
                  <p className={`text-sm transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-green-800'}`}>{success}</p>
                </div>
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div className={`flex-1 overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-[#202020]' : 'bg-white'}`}>
            <div className={`p-4 border-b transition-all duration-500 ${isDarkMode ? 'border-[#3A3A3A]' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#A5BF13] rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <ShoppingBag className="h-4 w-4 text-black group-hover:animate-pulse" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>Shopping Cart</h3>
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
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-gray-100'}`}>
                    <ShoppingBag className="h-8 w-8 text-[#A5BF13] group-hover:animate-pulse" />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>Cart is Empty</h3>
                  <p className="text-[#A5BF13]">Start scanning items to add them to your cart</p>
                </div>
              ) : (
                                 <div className="space-y-3">
                   {cart.map((item) => (
                     <div key={item.barcode} className={`rounded-lg p-4 hover:shadow-xl hover:shadow-[#A5BF13]/10 hover:-translate-y-1 group transition-all duration-300 ${
                       item.expiry_date && new Date(item.expiry_date) < new Date() 
                         ? `${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-red-50'} border-2 border-[#B4182D]` 
                         : `${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-white border-gray-200'} border`
                     }`}>
                       <div className="flex items-start justify-between">
                         <div className="flex-1">
                           <h4 className={`font-semibold group-hover:text-[#A5BF13] transition-colors duration-200 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>{item.name}</h4>
                           <p className="text-sm text-[#A5BF13]">{item.barcode}</p>
                           <p className={`text-xs ${isDarkMode ? 'text-[#F8F8F8]/70' : 'text-gray-600'}`}>Available: {item.originalStock || item.quantity} units</p>
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
                           <p className={`text-sm ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`}>each</p>
                         </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                                                 <div className="flex items-center gap-2">
                           <button
                             onClick={() => updateQuantity(item.barcode, item.quantity - 1)}
                             className={`w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#A5BF13] hover:text-black transition-all duration-300 btn-press hover:scale-110 group ${isDarkMode ? 'bg-[#202020] border-[#3A3A3A]' : 'bg-white border-gray-300'}`}
                           >
                             <Minus className={`h-4 w-4 group-hover:animate-pulse ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`} />
                           </button>
                           <span className="text-sm font-semibold text-[#A5BF13] w-8 text-center group-hover:scale-110 transition-transform duration-200">{item.quantity}</span>
                           <button
                             onClick={() => updateQuantity(item.barcode, item.quantity + 1)}
                             disabled={item.quantity >= (item.originalStock || item.quantity)}
                             className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-300 btn-press hover:scale-110 group ${
                               item.quantity >= (item.originalStock || item.quantity)
                                 ? `${isDarkMode ? 'bg-[#3A3A3A] border-[#3A3A3A]' : 'bg-gray-200 border-gray-300'} cursor-not-allowed opacity-50`
                                 : `${isDarkMode ? 'bg-[#202020] border-[#3A3A3A]' : 'bg-white border-gray-300'} hover:bg-[#A5BF13] hover:text-black`
                             }`}
                           >
                             <Plus className={`h-4 w-4 ${
                               item.quantity >= (item.originalStock || item.quantity)
                                 ? `${isDarkMode ? 'text-[#F8F8F8]/50' : 'text-gray-400'}`
                                 : `${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'} group-hover:animate-pulse`
                             }`} />
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
        <div className={`w-96 border-l flex flex-col h-full transition-all duration-500 ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-gray-50 border-gray-200'}`}>
          
          {/* Payment Section */}
          <div className={`p-4 border-b transition-all duration-500 ${isDarkMode ? 'border-[#3A3A3A]' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#A5BF13] rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <CreditCard className="h-4 w-4 text-black group-hover:animate-pulse" />
              </div>
              <h3 className={`text-lg font-semibold transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>Payment</h3>
            </div>
            
                         <div className="space-y-4">
               <div>
                 <label className={`block text-sm font-medium mb-2 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>Select Payment Method</label>
                 <div className="space-y-2">
                   {[
                     { value: 'cash', label: 'Cash Payment', icon: Banknote },
                     { value: 'card', label: 'Credit/Debit Card', icon: CreditCard },
                     { value: 'mobile', label: 'Mobile Payment', icon: Smartphone }
                   ].map((method) => (
                     <label key={method.value} className={`flex items-center p-3 border rounded-lg hover:border-[#A5BF13] cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-[#A5BF13]/10 hover:-translate-y-1 group ${isDarkMode ? 'border-[#3A3A3A] hover:bg-[#202020]' : 'border-gray-300 hover:bg-gray-100'}`}>
                       <input
                         type="radio"
                         name="payment"
                         value={method.value}
                         checked={paymentType === method.value}
                         onChange={(e) => setPaymentType(e.target.value)}
                         className="sr-only"
                       />
                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-300 group-hover:scale-110 ${
                         paymentType === method.value ? 'bg-[#A5BF13] text-black' : `${isDarkMode ? 'bg-[#3A3A3A] text-[#F8F8F8]' : 'bg-gray-200 text-gray-700'}`
                       }`}>
                         <method.icon className="h-4 w-4 group-hover:animate-pulse" />
                       </div>
                       <span className={`font-medium transition-colors duration-200 ${
                         paymentType === method.value ? 'text-[#A5BF13]' : `${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`
                       }`}>{method.label}</span>
                       {paymentType === method.value && (
                         <Check className="h-4 w-4 text-[#A5BF13] ml-auto group-hover:animate-pulse" />
                       )}
                     </label>
                   ))}
                 </div>
               </div>
               
               {/* Customer Information */}
               <div className="space-y-3">
                 <h4 className={`text-sm font-medium transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`}>Customer Information (Optional)</h4>
                 <div className="space-y-2">
                   <div>
                     <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`}>
                       Customer Name
                     </label>
                     <input
                       type="text"
                       value={customerName}
                       onChange={(e) => setCustomerName(e.target.value)}
                       className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent transition-all duration-300 ${isDarkMode ? 'bg-[#202020] border-[#3A3A3A] text-[#F8F8F8] placeholder-[#F8F8F8]/50' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'}`}
                       placeholder="Enter customer name..."
                     />
                   </div>
                   <div>
                     <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-600'}`}>
                       Mobile Number
                     </label>
                     <input
                       type="tel"
                       value={customerMobile}
                       onChange={(e) => setCustomerMobile(e.target.value)}
                       className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#A5BF13] focus:border-transparent transition-all duration-300 ${isDarkMode ? 'bg-[#202020] border-[#3A3A3A] text-[#F8F8F8] placeholder-[#F8F8F8]/50' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'}`}
                       placeholder="07XXXXXXXX or +947XXXXXXXX"
                     />
                     <p className={`text-xs mt-1 transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]/70' : 'text-gray-500'}`}>
                       Enter mobile number to send invoice via SMS
                     </p>
                   </div>
                 </div>
               </div>
              
                             <div className={`rounded-lg p-4 border hover:shadow-xl hover:shadow-[#A5BF13]/10 transition-all duration-300 ${isDarkMode ? 'bg-[#202020] border-[#3A3A3A]' : 'bg-white border-gray-200'}`}>
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
                   className={`flex-1 px-4 py-2 border rounded-lg font-medium transition-all duration-300 btn-press hover:shadow-lg hover:shadow-[#A5BF13]/10 hover:-translate-y-1 group ripple ${isDarkMode ? 'border-[#3A3A3A] text-[#F8F8F8] hover:bg-[#202020]' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
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
           <div className={`rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden border transition-all duration-500 ${isDarkMode ? 'bg-[#2A2A2A] border-[#3A3A3A]' : 'bg-white border-gray-200'}`}>
             <div className={`flex items-center justify-between p-4 border-b transition-all duration-500 ${isDarkMode ? 'border-[#3A3A3A]' : 'border-gray-200'}`}>
               <h3 className={`text-lg font-semibold transition-colors duration-500 ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-800'}`}>Receipt</h3>
                             <button
                 onClick={closeReceiptModal}
                 className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group ripple ${isDarkMode ? 'bg-[#202020] hover:bg-[#A5BF13] hover:text-black' : 'bg-gray-100 hover:bg-[#A5BF13] hover:text-black'}`}
               >
                 <X className={`h-4 w-4 group-hover:animate-pulse ${isDarkMode ? 'text-[#F8F8F8]' : 'text-gray-700'}`} />
               </button>
             </div>
             <div className={`p-4 overflow-y-auto max-h-[60vh] transition-all duration-500 ${isDarkMode ? 'bg-[#202020]' : 'bg-gray-50'}`}>
               <Receipt sale={printData.sale} items={printData.items} isDarkMode={isDarkMode} />
             </div>
             <div className={`p-4 border-t transition-all duration-500 ${isDarkMode ? 'border-[#3A3A3A] bg-[#2A2A2A]' : 'border-gray-200 bg-white'}`}>
                             <div className="space-y-3">
                 {/* Send Invoice Button */}
                 {customerMobile.trim() && (
                   <button
                     onClick={sendInvoiceToCustomer}
                     disabled={sendingInvoice}
                     className="w-full px-4 py-2 bg-[#F79824] text-black rounded-lg font-semibold hover:bg-[#E88A1A] disabled:opacity-50 transition-all duration-300 btn-press hover:shadow-xl hover:shadow-[#F79824]/30 hover:-translate-y-1 group ripple relative overflow-hidden"
                   >
                     {/* Ripple effect */}
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                     
                     <div className="flex items-center justify-center relative z-10">
                       {sendingInvoice ? (
                         <>
                           <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent mr-2"></div>
                           Sending...
                         </>
                       ) : (
                         <>
                           <Send className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                           Send Invoice to {customerMobile}
                         </>
                       )}
                     </div>
                   </button>
                 )}
                 
                 {/* Action Buttons */}
                 <div className="flex gap-3">
                   <button
                     onClick={closeReceiptModal}
                     className={`flex-1 px-4 py-2 border rounded-lg font-medium transition-all duration-300 btn-press hover:shadow-lg hover:shadow-[#A5BF13]/10 hover:-translate-y-1 group ripple ${isDarkMode ? 'border-[#3A3A3A] text-[#F8F8F8] hover:bg-[#202020]' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
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
        </div>
      )}
    </div>
  );
};

export default BillingScreen;