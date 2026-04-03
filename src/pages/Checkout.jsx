import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { removeFromCart, clearCart, syncCartAvailability } from "../store/cartSlice.js";
import authService from "../backend/auth.js";
import service from "../backend/config.js";
import conf from "../conf/conf.js";
import { Query } from 'appwrite';
import OptimizedImage from "../components/OptimizedImage";
import { Loader2, Trash2, ShoppingBag, ChevronLeft, Truck, Smartphone, CheckSquare, Square } from 'lucide-react';
import { COUNTRIES, SHIPPING_RATES_USD, SHIPPING_RATES_INR } from '../constants/countries.js';

// 💱 Exchange Rate
const EXCHANGE_RATE = 84;

const Checkout = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // 1. Get Cart Items
    const cartItems = useSelector(state => state.cart.cartItems);

    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null); // To store DB user data
    const [processing, setProcessing] = useState(false);
    const [checkingStock, setCheckingStock] = useState(true);
    const [useSavedAddress, setUseSavedAddress] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});

    // 🔘 CURRENCY STATE
    const [selectedCurrency, setSelectedCurrency] = useState("USD");
    const [shippingCost, setShippingCost] = useState(0);

    const [shippingInfo, setShippingInfo] = useState({
        firstName: '', lastName: '', address: '', country: '', state: '', city: '', phone: '', email: '', zipCode: ''
    });

    const indianPaymentOptions = useMemo(() => {
        return conf.indianPaymentMethods
            .split(',')
            .map((method) => method.trim())
            .filter(Boolean);
    }, []);

    const primaryIndianPaymentMethod = indianPaymentOptions[0] || 'UPI';
    const indianUpiId = conf.indianPaymentUpiId;
    const indianPaymentInstruction = conf.indianPaymentInstruction;
    const indianUpiLink = indianUpiId ? `upi://pay?pa=${encodeURIComponent(indianUpiId)}&pn=${encodeURIComponent('Adhunic Art')}&cu=INR` : '';

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
//             console.error("Stock check failed:", error);
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

                    // FETCH USER COLLECTION DATA
                    const profile = await service.getUserProfile(userData.$id);
                    if (profile) setUserProfile(profile);

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
                }
            } catch (error) {
                console.error(error);
            }
        };
        checkAuth();
    }, [navigate]);

    // --- 📦 ADDRESS FORMATTER ---
    const formatShippingAddress = () => {
        const { address, city, state, zipCode, country } = shippingInfo;
        return `${address} ${city} ${state} ${zipCode} ${country}`.replace(/\s+/g, ' ').trim();
    };

    // --- ✅ FIXED CHECKBOX HANDLER (Buttons won't disappear) ---
    const toggleUseSavedAddress = () => {
        const newVal = !useSavedAddress;
        setUseSavedAddress(newVal);

        if (newVal && userProfile) {
            const savedCountry = userProfile.country || '';

            // 1. Fill fields from profile
            setShippingInfo({
                ...shippingInfo,
                address: userProfile.address || '',
                city: userProfile.city || '',
                state: userProfile.state || '',
                zipCode: userProfile.zip || '',
                country: savedCountry,
                phone: userProfile.phone || shippingInfo.phone // Keep current phone if profile is empty
            });

            // 2. Update Shipping & Currency
            if (savedCountry === "India") {
                setSelectedCurrency("INR");
                setShippingCost(SHIPPING_RATES_INR["India"] || 0);
            } else if (savedCountry) {
                setSelectedCurrency("USD");
                setShippingCost(SHIPPING_RATES_USD[savedCountry] || SHIPPING_RATES_USD["Other"]);
            }
        }
        // Note: We removed the 'else' block that was clearing the fields.
        // This ensures that when you unmark, the data stays there and buttons remain visible.
    };

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

    // A. COD Handler
    const handleCODOrder = async () => {
        // ✅ VALIDATE FORM BEFORE PROCESSING
        if (!validateCheckoutForm()) {
            alert("Please fill in all required fields correctly.");
            return;
        }

        setProcessing(true);
        try {
            await service.createCODOrder({
                userId: user.$id,
                items: availableItems.map(item => item.$id),
                customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
                email: shippingInfo.email,
                shippingAddress: formatShippingAddress(), // ✅ Formatted String
                totalAmount: finalTotal
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

    // ✅ FORM VALIDATION FUNCTION
    const validateCheckoutForm = () => {
        const { firstName, lastName, email, phone, address, city, state, zipCode, country } = shippingInfo;
        const errors = {};
        
        // Check if all fields are filled
        if (!firstName?.trim()) errors.firstName = "First name is required";
        if (!lastName?.trim()) errors.lastName = "Last name is required";
        if (!email?.trim()) errors.email = "Email is required";
        if (!phone?.trim()) errors.phone = "Phone number is required";
        if (!address?.trim()) errors.address = "Address is required";
        if (!city?.trim()) errors.city = "City is required";
        if (!state?.trim()) errors.state = "State is required";
        if (!zipCode?.trim()) errors.zipCode = "Zip code is required";
        if (!country?.trim()) errors.country = "Country is required";
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) errors.email = "Please enter a valid email";
        
        // Phone validation (basic - at least 10 digits)
        const phoneRegex = /^\d{10,}$/;
        if (phone && !phoneRegex.test(phone.replace(/\D/g, ''))) errors.phone = "Phone number must be at least 10 digits";
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0; // Return true if no errors
    };

    // B. PayPal Handler
    const handlePayPalApprove = async (data, actions) => {
        // ✅ VALIDATE FORM BEFORE PROCESSING
        if (!validateCheckoutForm()) {
            alert("Please fill in all required fields correctly.");
            return;
        }

        setProcessing(true);
        try {
            const orderID = data.orderID;

            const result = await service.verifyPayment({
                orderID: orderID,
                userId: user.$id,
                items: availableItems.map(item => item.$id),
                shippingAddress: formatShippingAddress(),
                customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
                email: shippingInfo.email,
                totalPaid: finalTotal.toFixed(2),
                currency: "USD",
                paymentMethod: "PayPal"
            });

            const errorMessage = result?.message || result?.error || 'Payment verification failed. Please retry.';

            if (!result || result.success !== true) {
                throw new Error(errorMessage);
            }

            dispatch(clearCart());
            navigate('/orders', { state: { orderId: result.orderId } });
            alert('Payment successful! Your order is confirmed.');
        } catch (error) {
//             console.error('Payment Error:', error);
            alert(`Payment Error: ${error?.message || 'Unable to verify the transaction. Please try again.'}`);
            await verifyStock();
        } finally {
            setProcessing(false);
        }
    };

    const handleIndianGatewayPay = async () => {
        // ✅ VALIDATE FORM BEFORE PROCESSING
        if (!validateCheckoutForm()) {
            alert("Please fill in all required fields correctly.");
            return;
        }

        if (!indianUpiId) {
            alert("Configure VITE_INDIAN_PAYMENT_UPI_ID in your .env file before using UPI payment.");
            return;
        }

        setProcessing(true);
        try {
            await service.createCODOrder({
                userId: user.$id,
                items: availableItems.map(item => item.$id),
                customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
                email: shippingInfo.email,
                shippingAddress: formatShippingAddress(),
                totalAmount: finalTotal,
                paymentMethod: primaryIndianPaymentMethod,
                paymentId: `${primaryIndianPaymentMethod}-${Date.now()}`
            });

            dispatch(clearCart());
            navigate('/orders');
            alert(`Order created. Please complete payment using UPI ID ${indianUpiId}.`);
        } catch (error) {
//             console.error('UPI Payment Error:', error);
            alert(`UPI Payment failed: ${error?.message || 'Please try again.'}`);
            await verifyStock();
        } finally {
            setProcessing(false);
        }
    };

    const handleCopyUpiId = async () => {
        if (!indianUpiId) return;
        try {
            await navigator.clipboard.writeText(indianUpiId);
            alert('UPI ID copied to clipboard');
        } catch (copyError) {
//             console.warn('Copy failed', copyError);
            alert('Copy failed. Please copy the UPI ID manually.');
        }
    };

    if (cartItems.length === 0) return <div className="h-screen flex flex-col items-center justify-center"><ShoppingBag className="h-16 w-16 text-gray-300 mb-4" /><h2 className="text-2xl font-serif">Empty Cart</h2><button onClick={() => navigate('/shop')} className="mt-4 underline">Go Shopping</button></div>;

    return (
        <div className="min-h-screen bg-[#FDFBF7] py-8 px-4 font-sans">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-500 mb-8 hover:text-charcoal"><ChevronLeft className="h-4 w-4 mr-1" /> Back</button>

                <div className="mb-8 flex flex-col md:flex-row justify-between items-end md:items-center border-b border-gray-200 pb-4">
                    <div>
                        <h1 className="text-3xl font-serif text-charcoal">Checkout</h1>
                        {checkingStock && <p className="text-xs text-gray-500 flex items-center gap-2 mt-1"><Loader2 className="animate-spin h-3 w-3" /> Checking availability...</p>}
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
                                    <div className="flex justify-between py-6 text-xl font-serif font-bold text-charcoal border-t border-gray-100"><span>Total</span><span>{currencySymbol}{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                                </>
                            )}
                        </div>
                    </section>

                    <section className="lg:col-span-7 order-1 lg:order-2">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-serif text-charcoal">Shipping & Payment</h2>
                            {userProfile && (
                                <button
                                    type="button"
                                    onClick={toggleUseSavedAddress}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-charcoal transition-colors"
                                >
                                    {useSavedAddress ? <CheckSquare size={18} className="text-black" /> : <Square size={18} />}
                                    Use as user address
                                </button>
                            )}
                        </div>

                        <form className="space-y-6">
                            {/* --- MODIFIED SECTION START --- */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <input 
                                        type="text" 
                                        placeholder="First Name" 
                                        className={`w-full border p-3 rounded-sm ${validationErrors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                        value={shippingInfo.firstName} 
                                        onChange={(e) => {
                                            setShippingInfo({ ...shippingInfo, firstName: e.target.value });
                                            if (validationErrors.firstName) {
                                                setValidationErrors({ ...validationErrors, firstName: '' });
                                            }
                                        }} 
                                    />
                                    {validationErrors.firstName && <p className="text-red-500 text-xs mt-1">{validationErrors.firstName}</p>}
                                </div>
                                <div>
                                    <input 
                                        type="text" 
                                        placeholder="Last Name" 
                                        className={`w-full border p-3 rounded-sm ${validationErrors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                        value={shippingInfo.lastName} 
                                        onChange={(e) => {
                                            setShippingInfo({ ...shippingInfo, lastName: e.target.value });
                                            if (validationErrors.lastName) {
                                                setValidationErrors({ ...validationErrors, lastName: '' });
                                            }
                                        }} 
                                    />
                                    {validationErrors.lastName && <p className="text-red-500 text-xs mt-1">{validationErrors.lastName}</p>}
                                </div>
                            </div>
                            <div>
                                <select 
                                    className={`w-full border p-3 rounded-sm bg-white ${validationErrors.country ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                    value={shippingInfo.country} 
                                    onChange={(e) => {
                                        handleCountryChange(e);
                                        if (validationErrors.country) {
                                            setValidationErrors({ ...validationErrors, country: '' });
                                        }
                                    }}
                                >
                                    <option value="" disabled>Select Country</option>
                                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                {validationErrors.country && <p className="text-red-500 text-xs mt-1">{validationErrors.country}</p>}
                            </div>
                            <div>
                                <input 
                                    type="text" 
                                    placeholder="Use Local Address Like ( vilage or land mark )" 
                                    className={`w-full border p-3 rounded-sm ${validationErrors.address ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                    value={shippingInfo.address} 
                                    onChange={(e) => {
                                        setShippingInfo({ ...shippingInfo, address: e.target.value });
                                        if (validationErrors.address) {
                                            setValidationErrors({ ...validationErrors, address: '' });
                                        }
                                    }} 
                                />
                                {validationErrors.address && <p className="text-red-500 text-xs mt-1">{validationErrors.address}</p>}
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <input 
                                        type="text" 
                                        placeholder="City" 
                                        className={`w-full border p-3 rounded-sm ${validationErrors.city ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                        value={shippingInfo.city} 
                                        onChange={(e) => {
                                            setShippingInfo({ ...shippingInfo, city: e.target.value });
                                            if (validationErrors.city) {
                                                setValidationErrors({ ...validationErrors, city: '' });
                                            }
                                        }} 
                                    />
                                    {validationErrors.city && <p className="text-red-500 text-xs mt-1">{validationErrors.city}</p>}
                                </div>
                                <div>
                                    <input 
                                        type="text" 
                                        placeholder="State" 
                                        className={`w-full border p-3 rounded-sm ${validationErrors.state ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                        value={shippingInfo.state} 
                                        onChange={(e) => {
                                            setShippingInfo({ ...shippingInfo, state: e.target.value });
                                            if (validationErrors.state) {
                                                setValidationErrors({ ...validationErrors, state: '' });
                                            }
                                        }} 
                                    />
                                    {validationErrors.state && <p className="text-red-500 text-xs mt-1">{validationErrors.state}</p>}
                                </div>
                                <div>
                                    <input 
                                        type="text" 
                                        placeholder="Zip Code" 
                                        className={`w-full border p-3 rounded-sm ${validationErrors.zipCode ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                        value={shippingInfo.zipCode} 
                                        onChange={(e) => {
                                            setShippingInfo({ ...shippingInfo, zipCode: e.target.value });
                                            if (validationErrors.zipCode) {
                                                setValidationErrors({ ...validationErrors, zipCode: '' });
                                            }
                                        }} 
                                    />
                                    {validationErrors.zipCode && <p className="text-red-500 text-xs mt-1">{validationErrors.zipCode}</p>}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <input 
                                        type="tel" 
                                        placeholder="Phone" 
                                        className={`w-full border p-3 rounded-sm ${validationErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                        value={shippingInfo.phone} 
                                        onChange={(e) => {
                                            setShippingInfo({ ...shippingInfo, phone: e.target.value });
                                            if (validationErrors.phone) {
                                                setValidationErrors({ ...validationErrors, phone: '' });
                                            }
                                        }} 
                                    />
                                    {validationErrors.phone && <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>}
                                </div>
                                <div>
                                    <input 
                                        type="email" 
                                        placeholder="Email" 
                                        className={`w-full border p-3 rounded-sm ${validationErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                        value={shippingInfo.email} 
                                        onChange={(e) => {
                                            setShippingInfo({ ...shippingInfo, email: e.target.value });
                                            if (validationErrors.email) {
                                                setValidationErrors({ ...validationErrors, email: '' });
                                            }
                                        }} 
                                    />
                                    {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
                                </div>
                            </div>
                            {/* --- MODIFIED SECTION END --- */}

                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <h3 className="text-lg font-medium text-charcoal mb-4">Payment Method</h3>
                                {!shippingInfo.country ? (
                                    <div className="bg-yellow-50 text-yellow-800 p-3 text-sm rounded-sm text-center">Select Country to proceed</div>
                                ) : (
                                    <div className="space-y-4">
                                        {selectedCurrency === "INR" && (
                                            <div className="space-y-4">
                                                {indianUpiId ? (
                                                    <div className="p-4 bg-slate-50 rounded-sm text-sm text-slate-700">
                                                        <p className="font-semibold">Pay using UPI</p>
                                                        <p className="mt-3 text-lg tracking-wide">{indianUpiId}</p>
                                                        <p className="mt-2 text-xs text-gray-500">{indianPaymentInstruction}</p>
                                                        <p className="mt-2 text-xs text-gray-500">Scan or pay direct to the client using any UPI app.</p>
                                                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                                            <button
                                                                type="button"
                                                                onClick={handleCopyUpiId}
                                                                className="flex-1 bg-charcoal hover:bg-black text-white font-bold py-3 rounded-sm transition-colors"
                                                            >
                                                                Copy UPI ID
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => { if (indianUpiLink) window.open(indianUpiLink, '_blank'); }}
                                                                disabled={!indianUpiLink}
                                                                className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-sm transition-colors hover:bg-gray-100 disabled:bg-gray-200 disabled:text-gray-500"
                                                            >
                                                                Open UPI App
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 bg-yellow-50 rounded-sm text-sm text-yellow-900 border border-yellow-200">
                                                        Configure <code>VITE_INDIAN_PAYMENT_UPI_ID</code> in your .env to enable UPI checkout.
                                                    </div>
                                                )}

                                                <div className="grid gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={handleIndianGatewayPay}
                                                        disabled={processing || !indianUpiId}
                                                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold py-3 rounded-sm transition-colors"
                                                    >
                                                        {processing ? <Loader2 className="animate-spin" /> : `Pay using ${primaryIndianPaymentMethod}`}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleCODOrder}
                                                        disabled={processing}
                                                        className="w-full bg-white border border-gray-300 text-charcoal font-bold py-3 rounded-sm hover:bg-gray-50 transition-colors"
                                                    >
                                                        {processing ? <Loader2 className="animate-spin" /> : 'Cash on Delivery (COD)'}
                                                    </button>
                                                </div>

                                                <p className="text-center text-xs text-gray-500">Change gateway name or UPI ID in <code>.env</code> and restart the app.</p>
                                            </div>
                                        )}
                                        {selectedCurrency === "USD" && (
                                            <div className="relative z-0">
                                                <p className="text-xs text-gray-500 mb-2 text-center">Secure payment via PayPal (Credit/Debit Cards)</p>
                                                {console.log('Using PayPal Client ID for live payments:', conf.appwritePaypalClientId)}
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
//                                                         onError={(err) => { console.error(err); alert("PayPal transaction failed. Please try again."); }}
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
