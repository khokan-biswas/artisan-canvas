import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js"; 
import { removeFromCart, clearCart, syncCartAvailability } from "../store/cartSlice.js";
import authService from "../backend/auth.js";
import service from "../backend/config.js"; 
import conf from "../conf/conf.js"; 
import { Query } from 'appwrite';
import OptimizedImage from "../components/OptimizedImage";
import { Loader2, Trash2, ShoppingBag, ChevronLeft, Truck, Smartphone } from 'lucide-react';
import { COUNTRIES, SHIPPING_RATES_USD, SHIPPING_RATES_INR } from '../constants/countries.js';

// 💱 Exchange Rate
const EXCHANGE_RATE = 84; 

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // 1. Get Cart Items
  const cartItems = useSelector(state => state.cart.cartItems);
  
  const [user, setUser] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [checkingStock, setCheckingStock] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  
  // 🔘 CURRENCY STATE
  const [selectedCurrency, setSelectedCurrency] = useState("USD"); 
  const [shippingCost, setShippingCost] = useState(0);

  const [shippingInfo, setShippingInfo] = useState({
    firstName: '', lastName: '', address: '', country: '', state: '', city: '', phone: '', email: '', zipCode: ''
  });

  // --- 🔄 LIVE STOCK CHECK ---
  const verifyStock = useCallback(async () => {
    if (cartItems.length === 0) {
        setCheckingStock(false);
        return;
    }
    try {
        const ids = cartItems.map(item => item.$id);
        const response = await service.getPaintings([Query.equal('$id', ids)]);
        if (response.documents.length > 0) {
            dispatch(syncCartAvailability(response.documents));
        }
    } catch (error) {
        console.error("Stock check failed:", error);
    } finally {
        setCheckingStock(false);
    }
  }, [cartItems, dispatch]);

  useEffect(() => { verifyStock(); }, [dispatch]); 

  // --- 💰 PRICE CALCULATION LOGIC ---
  const calculateItemFinancials = (item, currency) => {
      if (item.isSold) return { final: 0, original: 0, discountPercent: 0 };

      const price = currency === "INR" ? (item.pricein || 0) : (item.priceusd || 0);
      const discountPercent = currency === "INR" ? (item.discountin || 0) : (item.discountusd || 0);

      let finalPrice = price;
      if (discountPercent > 0) {
          finalPrice = price - (price * (discountPercent / 100));
      }
      
      return {
          original: Math.round(price),
          final: Math.round(finalPrice),
          discountPercent: discountPercent
      };
  };

  const availableItems = cartItems.filter(item => !item.isSold);
  
  const orderSummary = availableItems.reduce((acc, item) => {
      const financials = calculateItemFinancials(item, selectedCurrency);
      acc.subtotal += financials.final;
      return acc;
  }, { subtotal: 0 });

  const finalTotal = orderSummary.subtotal + shippingCost;
  const currencySymbol = selectedCurrency === "INR" ? "₹" : "$";

  // --- 3. AUTH & SETUP ---
  useEffect(() => {
    const checkAuth = async () => {
        try {
            const userData = await authService.getCurrentUser();
            if (!userData) {
                navigate('/login');
            } else {
                setUser(userData);
                const userCountry = userData.country || '';
                
                if (userCountry === "India") {
                    setSelectedCurrency("INR");
                    setShippingCost(SHIPPING_RATES_INR["India"] || 0);
                } else if (userCountry) {
                    setSelectedCurrency("USD");
                    setShippingCost(SHIPPING_RATES_USD[userCountry] || SHIPPING_RATES_USD["Other"]);
                }
                
                setShippingInfo(prev => ({ 
                    ...prev, 
                    email: userData.email, 
                    firstName: userData.name.split(' ')[0],
                    lastName: userData.name.split(' ')[1] || '',
                    country: userCountry
                }));
                
                if (userData.address?.trim()) setShowAddressModal(true);
            }
        } catch (error) { console.error(error); }
    };
    checkAuth();
  }, [navigate]);

  // --- HANDLERS ---
  const handleCountryChange = (e) => {
    const country = e.target.value;
    if (country === "India") {
        setSelectedCurrency("INR");
        setShippingCost(SHIPPING_RATES_INR["India"] || 0);
    } else {
        setSelectedCurrency("USD");
        setShippingCost(SHIPPING_RATES_USD[country] || SHIPPING_RATES_USD["Other"]);
    }
    setShippingInfo({ ...shippingInfo, country });
  };

  const handleCurrencyToggle = (currency) => {
      if (currency === "INR" && shippingInfo.country && shippingInfo.country !== "India") {
          alert("INR is only available for shipping within India.");
          return;
      }
      setSelectedCurrency(currency);
      if (shippingInfo.country === "India") {
          setShippingCost(currency === "INR" ? (SHIPPING_RATES_INR["India"] || 0) : ((SHIPPING_RATES_INR["India"] || 0) / EXCHANGE_RATE));
      } else {
          const usdCost = SHIPPING_RATES_USD[shippingInfo.country] || SHIPPING_RATES_USD["Other"] || 0;
          setShippingCost(currency === "USD" ? usdCost : (usdCost * EXCHANGE_RATE));
      }
  };

  // --- 4. PAYMENT HANDLERS ---
  
  // A. COD Handler (Direct Backend Call from Frontend)
  const handleCODOrder = async () => {
    setProcessing(true);
    try {
        await service.createCODOrder({
            userId: user.$id,
            items: availableItems.map(item => item.$id),
            customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
            email: shippingInfo.email,
            shippingDetails: shippingInfo,
            totalAmount: finalTotal // ✅ Added totalAmount
        });
        dispatch(clearCart());
        navigate('/orders');
    } catch (error) {
        alert(`Order Failed: ${error.message}`);
        await verifyStock();
    } finally {
        setProcessing(false);
    }
  };

  // B. PayPal Handler (Call Appwrite Function)
  const handlePayPalApprove = async (data, actions) => {
    setProcessing(true);
    try {
      const orderID = data.orderID;
      
      const result = await service.verifyPayment({
        orderID: orderID,
        userId: user.$id,
        items: availableItems.map(item => item.$id),
        shippingDetails: shippingInfo,
        customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
        email: shippingInfo.email,
        totalPaid: finalTotal.toFixed(2),
        currency: "USD",
        paymentMethod: "PayPal" // ✅ Critical for Backend Logic
      });

      if (result.success) {
        dispatch(clearCart()); 
        navigate('/orders', { state: { orderId: result.orderId } });
      } else {
        throw new Error(result.message || "Payment verification failed.");
      }
    } catch (error) {
      console.error("Payment Error:", error);
      alert(`Payment Error: ${error.message}`);
      if (error.message !== "Payment verification failed.") {
          await verifyStock(); 
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleIndianGatewayPay = () => {
      alert("Integrate Razorpay or PhonePe SDK here. For now, please use Cash on Delivery.");
  };

  if (cartItems.length === 0) return <div className="h-screen flex flex-col items-center justify-center"><ShoppingBag className="h-16 w-16 text-gray-300 mb-4"/><h2 className="text-2xl font-serif">Empty Cart</h2><button onClick={() => navigate('/shop')} className="mt-4 underline">Go Shopping</button></div>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-8 px-4 font-sans">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-500 mb-8 hover:text-charcoal"><ChevronLeft className="h-4 w-4 mr-1"/> Back</button>

        <div className="mb-8 flex flex-col md:flex-row justify-between items-end md:items-center border-b border-gray-200 pb-4">
           <div>
               <h1 className="text-3xl font-serif text-charcoal">Checkout</h1>
               {checkingStock && <p className="text-xs text-gray-500 flex items-center gap-2 mt-1"><Loader2 className="animate-spin h-3 w-3"/> Checking availability...</p>}
           </div>
           
           <div className="flex bg-white rounded-md border border-gray-300 overflow-hidden mt-4 md:mt-0">
               <button onClick={() => handleCurrencyToggle("INR")} className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${selectedCurrency === "INR" ? 'bg-charcoal text-white' : 'text-gray-600 hover:bg-gray-50'}`}><span>🇮🇳</span> INR (₹)</button>
               <div className="w-[1px] bg-gray-300"></div>
               <button onClick={() => handleCurrencyToggle("USD")} className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${selectedCurrency === "USD" ? 'bg-charcoal text-white' : 'text-gray-600 hover:bg-gray-50'}`}><span>🇺🇸</span> USD ($)</button>
           </div>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
          <section className="lg:col-span-5 order-2 lg:order-1 mt-10 lg:mt-0">
             <div className="bg-white p-6 shadow-sm border border-gray-100 rounded-sm">
                <h2 className="text-xl font-serif text-charcoal mb-6 flex justify-between items-center">Order Summary <span className="text-xs font-sans font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Paying in {selectedCurrency}</span></h2>
                <div className="space-y-6 mb-6">
                    {cartItems.map((item) => {
                         const financials = calculateItemFinancials(item, selectedCurrency);
                         return (
                         <div key={item.$id} className={`flex gap-4 py-4 border-b border-gray-50 last:border-0 relative ${item.isSold ? 'opacity-60' : ''}`}>
                            <div className="w-20 flex-shrink-0 relative">
                                <OptimizedImage src={service.getThumbnail(item.imageUrl)} alt={item.title} className="w-full h-auto border" />
                                {item.isSold && <span className="absolute inset-0 bg-black/20 flex items-center justify-center text-white text-[10px] font-bold">SOLD</span>}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <h3 className="font-medium text-charcoal text-sm">{item.title}</h3>
                                    <button onClick={() => dispatch(removeFromCart(item.$id))} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                </div>
                                {!item.isSold && (
                                    <div className="mt-1">
                                        {financials.discountPercent > 0 ? (
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-bold text-charcoal text-sm">{currencySymbol}{financials.final.toLocaleString()}</span>
                                                <span className="text-xs text-gray-400 line-through">{currencySymbol}{financials.original.toLocaleString()}</span>
                                                <span className="text-[10px] text-green-600 font-medium">({financials.discountPercent}% OFF)</span>
                                            </div>
                                        ) : (
                                            <span className="font-bold text-charcoal text-sm">{currencySymbol}{financials.final.toLocaleString()}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                         </div>
                         );
                    })}
                </div>
                {availableItems.length > 0 && (
                    <>
                        <div className="space-y-4 py-6 border-t border-gray-100 text-sm">
                            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{currencySymbol}{orderSummary.subtotal.toLocaleString()}</span></div>
                            <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{shippingInfo.country ? `${currencySymbol}${shippingCost.toFixed(2)}` : "--"}</span></div>
                        </div>
                        <div className="flex justify-between py-6 text-xl font-serif font-bold text-charcoal border-t border-gray-100"><span>Total</span><span>{currencySymbol}{finalTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    </>
                )}
             </div>
          </section>

          <section className="lg:col-span-7 order-1 lg:order-2">
            <h2 className="text-2xl font-serif text-charcoal mb-6">Shipping & Payment</h2>
            <form className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="First Name" className="w-full border p-3 rounded-sm" value={shippingInfo.firstName} onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}/>
                    <input type="text" placeholder="Last Name" className="w-full border p-3 rounded-sm" value={shippingInfo.lastName} onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})}/>
                </div>
                <select className="w-full border p-3 rounded-sm bg-white" value={shippingInfo.country} onChange={handleCountryChange}>
                    <option value="" disabled>Select Country</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="text" placeholder="Address" className="w-full border p-3 rounded-sm" value={shippingInfo.address} onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}/>
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="City" className="w-full border p-3 rounded-sm" value={shippingInfo.city} onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}/>
                    <input type="text" placeholder="Zip Code" className="w-full border p-3 rounded-sm" value={shippingInfo.zipCode} onChange={(e) => setShippingInfo({...shippingInfo, zipCode: e.target.value})}/>
                </div>
                <div className="space-y-4">
                    <input type="tel" placeholder="Phone" className="w-full border p-3 rounded-sm" value={shippingInfo.phone} onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}/>
                    <input type="email" placeholder="Email" className="w-full border p-3 rounded-sm" value={shippingInfo.email} onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}/>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-charcoal mb-4">Payment Method</h3>
                    {!shippingInfo.country ? (
                        <div className="bg-yellow-50 text-yellow-800 p-3 text-sm rounded-sm text-center">Select Country to proceed</div>
                    ) : (
                        <div className="space-y-4">
                            {selectedCurrency === "INR" && (
                                <div className="space-y-3">
                                    <button type="button" onClick={handleIndianGatewayPay} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-sm flex items-center justify-center gap-2 transition-colors"><Smartphone size={20} /> Pay via PhonePe / UPI / Card</button>
                                    <p className="text-xs text-center text-gray-400">- OR -</p>
                                    <button type="button" onClick={handleCODOrder} disabled={processing} className="w-full bg-[#FFC439] hover:bg-[#F4BB2E] text-charcoal font-bold py-3 rounded-sm flex items-center justify-center gap-2 transition-colors">{processing ? <Loader2 className="animate-spin" /> : <><Truck size={20}/> Cash on Delivery</>}</button>
                                </div>
                            )}
                            {selectedCurrency === "USD" && (
                                <div className="relative z-0">
                                    <p className="text-xs text-gray-500 mb-2 text-center">Secure payment via PayPal (Credit/Debit Cards)</p>
                                    <PayPalScriptProvider options={{ "client-id": conf.appwritePaypalClientId, currency: "USD", intent: "capture" }} key="paypal-usd">
                                        <PayPalButtons 
                                            style={{ layout: "vertical", height: 48 }}
                                            createOrder={(data, actions) => {
                                                return actions.order.create({
                                                    purchase_units: [{
                                                        description: `Art Order (${selectedCurrency})`,
                                                        amount: { currency_code: "USD", value: finalTotal.toFixed(2) }
                                                    }]
                                                });
                                            }}
                                            onApprove={handlePayPalApprove}
                                            onError={(err) => { console.error(err); alert("PayPal transaction failed. Please try again."); }}
                                        />
                                    </PayPalScriptProvider>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Checkout;