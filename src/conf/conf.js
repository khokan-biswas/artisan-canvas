const conf = {
    // App Configuration
    appUrl: String(import.meta.env.VITE_APP_URL || 'http://localhost:5173'),

    // Appwrite Core
    appwriteUrl: String(import.meta.env.VITE_APPWRITE_ENDPOINT),
    appwriteProjectId: String(import.meta.env.VITE_APPWRITE_PROJECT_ID),
    appwriteDatabaseId: String(import.meta.env.VITE_APPWRITE_DATABASE_ID),

    // Collections
    appwritePaintingsCollectionId: String(import.meta.env.VITE_APPWRITE_PAINTINGS_COLLECTION_ID),
    appwriteOrdersCollectionId: String(import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID),
    appwriteUserCollectionId: String(import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID),
    appwriteCartsCollectionId: String(import.meta.env.VITE_APPWRITE_CARTS_COLLECTION_ID),
    appwriteResetCodesCollectionId: String(import.meta.env.VITE_APPWRITE_RESET_CODES_COLLECTION_ID || "reset_codes"),

    // Storage & Functions
    appwriteBucketId: String(import.meta.env.VITE_APPWRITE_BUCKET_ID),
    appwritePaymentFunctionId: String(import.meta.env.VITE_APPWRITE_FUNCTION_ID),
    appwriteCheckAdminFunctionId: String(import.meta.env.VITE_APPWRITE_CHECK_ADMIN_FUNCTION_ID),

    // Payment Gateway Public Keys
    paypalClientId: String(import.meta.env.VITE_PAYPAL_CLIENT_ID),
    razorpayKeyId: String(import.meta.env.VITE_RAZORPAY_KEY_ID),

    // Indian Payment Settings
    indianPaymentMethods: String(
        import.meta.env.VITE_INDIAN_PAYMENT_METHODS || "PhonePe,GooglePay,Paytm"
    ),
    indianPaymentUpiId: String(import.meta.env.VITE_INDIAN_PAYMENT_UPI_ID || ""),
    indianPaymentInstruction: String(
        import.meta.env.VITE_INDIAN_PAYMENT_INSTRUCTION || "Use this UPI ID in any Indian UPI app."
    ),
};

export default conf;

