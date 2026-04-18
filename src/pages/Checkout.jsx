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
import { Loader2, Trash2, ShoppingBag, ChevronLeft, Truck, Smartphone, ShieldCheck, CheckSquare, Square } from 'lucide-react';
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

    const paypalOptions = useMemo(() => ({
        "client-id": conf.paypalClientId,
        currency: "USD",
        intent: "capture",
    }), []);

    const handlePayPalButtonClick = (data, actions) => {
        // 1. Run sync validation immediately (no async, no setTimeout)
        const { isValid, errors } = validateCheckoutFormSync();
        
        if (!isValid) {
            setValidationErrors(errors);
            alert("Please complete the shipping form first.");
            return actions.reject(); // Tells PayPal: "Do not open popup"
        }
        
        return actions.resolve(); // Tells PayPal: "Everything is good, open now"
    };

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

    useEffect(() => { verifyStock(); }, [verifyStock]);

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

                    // Only auto-fill email on first load
                    // User must manually fill name, address, and country
                    setShippingInfo(prev => ({
                        ...prev,
                        email: userData.email,
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
            
            // Split name into firstName and lastName
            const nameParts = (userProfile.name || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // 1. Fill fields from profile using functional setState to avoid stale state
            setShippingInfo(prev => ({
                ...prev,
                firstName: firstName,
                lastName: lastName,
                address: userProfile.address || prev.address,
                city: userProfile.city || prev.city,
                state: userProfile.state || prev.state,
                zipCode: userProfile.zip || prev.zipCode,
                country: savedCountry,
                phone: userProfile.phone || prev.phone,
                email: userProfile.email || prev.email
            }));

            // 2. Update Shipping & Currency
            if (savedCountry === "India") {
                setSelectedCurrency("INR");
                setShippingCost(SHIPPING_RATES_INR["India"] || 0);
            } else if (savedCountry) {
                setSelectedCurrency("USD");
                setShippingCost(SHIPPING_RATES_USD[savedCountry] || SHIPPING_RATES_USD["Other"]);
            }
            
            // 3. Clear any validation errors when using saved address
            setValidationErrors({});
        }
        // Note: We removed the 'else' block that was clearing the fields.
        // This ensures that when you unmark, the data stays there and buttons remain visible.
    };

    // --- ✅ ENSURE VALIDATION USES CURRENT FORM STATE ---
    const validateCheckoutFormSync = () => {
        const { firstName, lastName, email, phone, address, city, state, zipCode, country } = shippingInfo;
        const errors = {};

        // Check if all fields are filled - use trim to remove whitespace
        const checkField = (value, fieldName, fieldLabel) => {
            const trimmed = value?.trim() || '';
            if (!trimmed) {
                errors[fieldName] = `${fieldLabel} is required`;
            }
        };

        checkField(firstName, 'firstName', 'First name');
        checkField(lastName, 'lastName', 'Last name');
        checkField(email, 'email', 'Email');
        checkField(phone, 'phone', 'Phone number');
        checkField(address, 'address', 'Address');
        checkField(city, 'city', 'City');
        checkField(state, 'state', 'State');
        checkField(zipCode, 'zipCode', 'Zip code');
        checkField(country, 'country', 'Country');

        // Email validation (only if email is provided)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email?.trim() && !emailRegex.test(email)) {
            errors.email = "Please enter a valid email";
        }

        // Phone validation (basic - at least 10 digits)
        const phoneDigits = phone?.replace(/\D/g, '') || '';
        if (phoneDigits && phoneDigits.length < 10) {
            errors.phone = "Phone number must be at least 10 digits";
        }

        return { errors, isValid: Object.keys(errors).length === 0 };
    };

    // --- UNIFIED FIELD CHANGE HANDLER ---
    const handleFieldChange = (fieldName, value) => {
        setShippingInfo(prev => ({ ...prev, [fieldName]: value }));
        // Clear that field's error when user starts editing
        if (validationErrors[fieldName]) {
            setValidationErrors(prev => ({ ...prev, [fieldName]: '' }));
        }
    };

    // --- HANDLERS ---
    const handleCountryChange = (e) => {
        const country = e.target.value;
        
        // Update shipping info first
        handleFieldChange('country', country);
        
        // Then update currency and shipping cost based on country
        if (country === "India") {
            setSelectedCurrency("INR");
            setShippingCost(SHIPPING_RATES_INR["India"] || 0);
        } else if (country) {
            setSelectedCurrency("USD");
            setShippingCost(SHIPPING_RATES_USD[country] || SHIPPING_RATES_USD["Other"]);
        }
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
        const { isValid, errors } = validateCheckoutFormSync();
        if (!isValid) {
            setValidationErrors(errors);
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
            await updateUserProfileIfNeeded();
            dispatch(clearCart());
            navigate('/orders');
        } catch (error) {
            alert(`Order Failed: ${error.message}`);
            await verifyStock();
        } finally {
            setProcessing(false);
        }
    };

    // --- Helper: Update missing user profile fields after order ---
    const updateUserProfileIfNeeded = async () => {
        if (!user || !userProfile) return;
        const updates = {};
        if (!userProfile.name && shippingInfo.firstName) {
            updates.name = `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim();
        }
        if (!userProfile.email && shippingInfo.email) updates.email = shippingInfo.email;
        if (!userProfile.country && shippingInfo.country) updates.country = shippingInfo.country;
        if (!userProfile.address && shippingInfo.address) updates.address = shippingInfo.address;
        if (!userProfile.phone && shippingInfo.phone) updates.phone = shippingInfo.phone;
        if (!userProfile.city && shippingInfo.city) updates.city = shippingInfo.city;
        if (!userProfile.state && shippingInfo.state) updates.state = shippingInfo.state;
        if (!userProfile.zip && shippingInfo.zipCode) updates.zip = shippingInfo.zipCode;
        if (Object.keys(updates).length > 0) {
            try {
                await service.updateUserProfile(user.$id, updates);
            } catch (e) {
                // Optionally log or ignore
            }
        }
    };

    // B. PayPal Handler
    const buildVerifyPayload = (paymentMethod, extra = {}) => ({
        paymentMethod,
        userId: user.$id,
        items: availableItems.map(item => item.$id),
        shippingAddress: formatShippingAddress(),
        customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
        email: shippingInfo.email,
        totalPaid: Number(finalTotal).toFixed(2),
        currency: paymentMethod === 'Razorpay' ? 'INR' : 'USD',
        ...extra,
    });

    const handlePayPalApprove = async (data, actions) => {
        // ✅ VALIDATE FORM BEFORE PROCESSING
        const { isValid, errors } = validateCheckoutFormSync();
        if (!isValid) {
            setValidationErrors(errors);
            alert("Please fill in all required fields correctly.");
            return;
        }

        setProcessing(true);
        try {
            await actions.order.capture();
            const orderID = data.orderID;

            const result = await service.verifyPayment(buildVerifyPayload('PayPal', {
                orderID,
            }));

            const errorMessage = result?.message || result?.error || 'Payment verification failed. Please retry.';

            if (!result || result.success !== true) {
                throw new Error(errorMessage);
            }
            await updateUserProfileIfNeeded();
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

    const isMobile = useMemo(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent), []);

    // 3. The standard UPI URI (Encoded for safety)
    const upiString = useMemo(() => {
        return `upi://pay?pa=${conf.indianPaymentUpiId}&pn=Adhunic%20Art&am=${finalTotal.toFixed(2)}&cu=INR&tn=ArtOrder`;
    }, [finalTotal]);

    // 4. Combined Pay Handler
    const handleIndianGatewayPay = async () => {
        // 1. Basic Form Validation
        const { isValid, errors } = validateCheckoutFormSync();
        if (!isValid) {
            setValidationErrors(errors);
            alert("Please fill in shipping details first.");
            return;
        }

        setProcessing(true); // Start the loader

        try {
            // 2. CREATE THE ORDER IN APPWRITE (The most important step)
            const orderData = {
                userId: user.$id,
                items: availableItems.map(item => item.$id),
                customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
                email: shippingInfo.email,
                shippingAddress: formatShippingAddress(),
                totalAmount: finalTotal,
                paymentMethod: "UPI_QR",
                paymentId: `PENDING-${Date.now()}`, // Placeholder ID for Admin verification
                status: "Waiting for Payment"
            };

            // Call your Appwrite service
            const response = await service.createCODOrder(orderData);

            if (response) {
                // 3. IF ON MOBILE: Trigger the App Switcher
                if (isMobile) {
                    window.location.href = upiString;
                }

                // 4. THE "AUTO-CLOSE" FEEL
                // We show a success message and then redirect, just like PayPal does.
                await updateUserProfileIfNeeded();
                dispatch(clearCart());

                // Artificial delay to allow user to see the success state
                setTimeout(() => {
                    navigate('/orders', { state: { orderPlaced: true } });
                }, 2000);
            }
        } catch (error) {
            console.error("Order Creation Error:", error);
            alert("Connection Error: Order could not be saved. Please check your internet or Appwrite Platform settings.");
        } finally {
            // We keep processing true until navigation to prevent double-clicks
        }
    };

    // const handlePhonePePay = () => {
    //     const upiId = conf.indianPaymentUpiId; // Your personal UPI ID from .env
    //     const name = "Adhunic Art";
    //     const amount = finalTotal.toFixed(2);
    //     const note = "Art Purchase";

    //     // 1. Create the standard UPI String
    //     const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

    //     // 2. Open the link
    //     // On mobile: This will open a "chooser" (PhonePe, Google Pay, etc.)
    //     window.location.href = upiLink;
    // };

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

    const handleRazorpayPayment = async () => {
        // 1. Validation
        const { isValid, errors } = validateCheckoutFormSync();
        if (!isValid) {
            setValidationErrors(errors);
            return;
        }

        setProcessing(true);
        try {
            const createOrderResponse = await service.createRazorpayOrder({
                amount: finalTotal,
                currency: selectedCurrency,
                receipt: `receipt_${Date.now()}`,
                items: availableItems.map(item => item.$id),
                userId: user.$id,
            });

            if (!createOrderResponse || !createOrderResponse.orderId) {
                throw new Error('Failed to create Razorpay order. Please try again.');
            }

            const options = {
                key: conf.razorpayKeyId, // Your VITE_RAZORPAY_KEY_ID (rzp_test_...)
                amount: Math.round(finalTotal * 100), // Amount in paise
                currency: selectedCurrency,
                name: "Adhunic Art",
                description: "Original Artwork Purchase",
                order_id: createOrderResponse.orderId,
                // Prefill user data so they don't have to type it again
                prefill: {
                    name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
                    email: shippingInfo.email,
                    contact: shippingInfo.phone
                },
                handler: async function (response) {
                    // THIS IS THE CRITICAL SDE STEP: 
                    // We don't trust the frontend "success". We send details to Backend for verification.
                    setProcessing(true);
                    try {
                        const verification = await service.verifyPayment(buildVerifyPayload('Razorpay', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        }));

                        if (verification.success) {
                            await updateUserProfileIfNeeded();
                            dispatch(clearCart());
                            navigate('/orders', { state: { orderPlaced: true } });
                        } else {
                            alert(`Payment Verification Failed: ${verification.message || 'Please contact support.'}`);
                        }
                    } catch (error) {
                        alert(`Payment Verification Failed: ${error?.message || 'Server error during verification.'}`);
                    } finally {
                        setProcessing(false);
                    }
                },
                theme: { color: "#5f259f" }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();
        } catch (error) {
            alert(`Unable to start Razorpay checkout: ${error?.message || 'Please try again.'}`);
            setProcessing(false);
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
                                        value={shippingInfo.firstName || ''}
                                        onChange={(e) => handleFieldChange('firstName', e.target.value)}
                                    />
                                    {validationErrors.firstName && <p className="text-red-500 text-xs mt-1">{validationErrors.firstName}</p>}
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        className={`w-full border p-3 rounded-sm ${validationErrors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                        value={shippingInfo.lastName || ''}
                                        onChange={(e) => handleFieldChange('lastName', e.target.value)}
                                    />
                                    {validationErrors.lastName && <p className="text-red-500 text-xs mt-1">{validationErrors.lastName}</p>}
                                </div>
                            </div>
                            <div>
                                <select
                                    className={`w-full border p-3 rounded-sm bg-white ${validationErrors.country ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                    value={shippingInfo.country}
                                    onChange={handleCountryChange}
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
                                    value={shippingInfo.address || ''}
                                    onChange={(e) => handleFieldChange('address', e.target.value)}
                                />
                                {validationErrors.address && <p className="text-red-500 text-xs mt-1">{validationErrors.address}</p>}
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="City"
                                        className={`w-full border p-3 rounded-sm ${validationErrors.city ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                        value={shippingInfo.city || ''}
                                        onChange={(e) => handleFieldChange('city', e.target.value)}
                                    />
                                    {validationErrors.city && <p className="text-red-500 text-xs mt-1">{validationErrors.city}</p>}
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        placeholder="State"
                                        className={`w-full border p-3 rounded-sm ${validationErrors.state ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                        value={shippingInfo.state || ''}
                                        onChange={(e) => handleFieldChange('state', e.target.value)}
                                    />
                                    {validationErrors.state && <p className="text-red-500 text-xs mt-1">{validationErrors.state}</p>}
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Zip Code"
                                        className={`w-full border p-3 rounded-sm ${validationErrors.zipCode ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                        value={shippingInfo.zipCode || ''}
                                        onChange={(e) => handleFieldChange('zipCode', e.target.value)}
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
                                        value={shippingInfo.phone || ''}
                                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                                    />
                                    {validationErrors.phone && <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>}
                                </div>
                                <div>
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        className={`w-full border p-3 rounded-sm ${validationErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                        value={shippingInfo.email || ''}
                                        onChange={(e) => handleFieldChange('email', e.target.value)}
                                    />
                                    {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
                                </div>
                            </div>
                            {/* --- MODIFIED SECTION END --- */}


                            {selectedCurrency === "INR" && (
                                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white border-2 border-purple-600/10 rounded-3xl p-8 shadow-xl shadow-purple-50/50">

                                        {/* Header: Trust Signals */}
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-200">
                                                    <ShieldCheck className="text-white" size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-charcoal text-lg leading-tight">Secure Payment</h4>
                                                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-widest">Via Razorpay Secure</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md uppercase mb-1">Official Partner</span>
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-4" />
                                            </div>
                                        </div>

                                        {/* Payment Method Details */}
                                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
                                            <ul className="space-y-3">
                                                <li className="flex items-center gap-3 text-sm text-slate-600">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                                                    Pay via UPI, Cards, or NetBanking
                                                </li>
                                                <li className="flex items-center gap-3 text-sm text-slate-600">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                                                    Instant order confirmation
                                                </li>
                                                <li className="flex items-center gap-3 text-sm text-slate-600">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                                                    Secure SSL encrypted transaction
                                                </li>
                                            </ul>
                                        </div>

                                        {/* MAIN ACTION BUTTON */}
                                        <div className="space-y-4">
                                            <button
                                                type="button"
                                                onClick={handleRazorpayPayment} // Triggers the professional modal
                                                disabled={processing}
                                                className="w-full bg-[#5f259f] hover:bg-[#4d1e82] text-white py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-200 active:scale-[0.98] disabled:opacity-50"
                                            >
                                                {processing ? (
                                                    <Loader2 className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <Smartphone size={22} />
                                                        <span>Pay ₹{finalTotal.toLocaleString()} Now</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Secondary Option: COD */}
                                            <button
                                                type="button"
                                                onClick={handleCODOrder}
                                                className="w-full text-slate-400 text-xs font-bold py-2 hover:text-charcoal transition-colors uppercase tracking-[0.2em]"
                                            >
                                                Or Choose Cash on Delivery
                                            </button>
                                        </div>
                                    </div>

                                    {/* TRUST LOGOS */}
                                    <div className="flex justify-center items-center gap-8 py-4 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                                        <img src="https://www.vectorlogo.zone/logos/razorpay/razorpay-icon.svg" className="h-6" alt="Razorpay" />
                                        <img src="https://www.vectorlogo.zone/logos/phonepe/phonepe-icon.svg" className="h-5" alt="PhonePe" />
                                        <img src="https://www.vectorlogo.zone/logos/google_pay/google_pay-icon.svg" className="h-4" alt="GPay" />
                                        <img src="https://www.vectorlogo.zone/logos/paytm/paytm-icon.svg" className="h-3" alt="Paytm" />
                                    </div>
                                </div>
                            )}

                            {selectedCurrency === "USD" && (
                                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white border-2 border-slate-300 rounded-3xl p-8 shadow-xl shadow-slate-50/50">

                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-slate-900 p-3 rounded-2xl shadow-lg shadow-slate-200">
                                                    <ShoppingBag className="text-white" size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-charcoal text-lg leading-tight">Secure Payment</h4>
                                                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-widest">Via PayPal Secure</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md uppercase mb-1">Trusted Checkout</span>
                                                <img src="https://www.vectorlogo.zone/logos/paypal/paypal-icon.svg" alt="PayPal" className="h-6" />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
                                            <ul className="space-y-3 text-sm text-slate-600">
                                                <li className="flex items-center gap-3">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-700"></div>
                                                    Pay using PayPal, cards, or debit.
                                                </li>
                                                <li className="flex items-center gap-3">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-700"></div>
                                                    Global checkout with instant confirmation.
                                                </li>
                                                <li className="flex items-center gap-3">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-700"></div>
                                                    Secure encrypted payments.
                                                </li>
                                            </ul>
                                        </div>

                                        <PayPalScriptProvider options={paypalOptions}>
                                            <PayPalButtons
                                                style={{ layout: 'vertical', color: 'blue', label: 'paypal', shape: 'rect', tagline: false }}
                                                forceReRender={[finalTotal, shippingInfo.country, shippingInfo.email, shippingInfo.firstName, shippingInfo.lastName]}
                                                createOrder={(data, actions) => {
                                                    return actions.order.create({
                                                        purchase_units: [
                                                            {
                                                                amount: {
                                                                    currency_code: 'USD',
                                                                    value: finalTotal.toFixed(2),
                                                                },
                                                            },
                                                        ],
                                                    });
                                                }}
                                                onApprove={handlePayPalApprove}
                                                onClick={handlePayPalButtonClick}
                                                onError={(err) => {
                                                    console.error('PayPal error:', err);
                                                    alert('PayPal payment failed. Please try again.');
                                                }}
                                            />
                                        </PayPalScriptProvider>

                                        <button
                                            type="button"
                                            onClick={handleCODOrder}
                                            className="w-full mt-4 text-slate-400 text-xs font-bold py-2 hover:text-charcoal transition-colors uppercase tracking-[0.2em]"
                                        >
                                            Or Choose Cash on Delivery
                                        </button>
                                    </div>

                                    <div className="flex justify-center items-center gap-8 py-4 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                                        <img src="https://www.vectorlogo.zone/logos/paypal/paypal-icon.svg" className="h-6" alt="PayPal" />
                                        <img src="https://www.vectorlogo.zone/logos/visa/visa-icon.svg" className="h-6" alt="Visa" />
                                        <img src="https://www.vectorlogo.zone/logos/mastercard/mastercard-icon.svg" className="h-6" alt="Mastercard" />
                                    </div>
                                </div>
                            )}
                        </form>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
