const conf = {
    appwriteUrl: String(import.meta.env.VITE_APPWRITE_ENDPOINT),
    appwriteProjectId: String(import.meta.env.VITE_APPWRITE_PROJECT_ID),
    appwriteDatabaseId: String(import.meta.env.VITE_APPWRITE_DATABASE_ID),
    appwritePaintingsCollectionId: String(import.meta.env.VITE_APPWRITE_PAINTINGS_COLLECTION_ID),
    appwriteOrdersCollectionId: String(import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID),
    appwriteBucketId: String(import.meta.env.VITE_APPWRITE_BUCKET_ID),
    appwritePaymentFunctionId: String(import.meta.env.VITE_APPWRITE_FUNCTION_ID),
appwriteUserCollectionId    : String(import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID),
    // Switched to live PayPal client ID for production payments
    appwritePaypalClientId: String(import.meta.env.VITE_PAYPAL_LIVE_CLIENT_ID),
    appwritecartsCollectionId: String(import.meta.env.VITE_APPWRITE_CARTS_COLLECTION_ID),
    appwriteCheckAdminFunctionId: String(import.meta.env.VITE_APPWRITE_CHECK_ADMIN_FUNCTION_ID),

    // Indian payment gateway settings
    indianPaymentMethods: String(import.meta.env.VITE_INDIAN_PAYMENT_METHODS || 'PhonePe,GooglePay,Paytm'),
    indianPaymentUpiId: String(import.meta.env.VITE_INDIAN_PAYMENT_UPI_ID || ''),
    indianPaymentInstruction: String(import.meta.env.VITE_INDIAN_PAYMENT_INSTRUCTION || 'Use this UPI ID in any Indian UPI app.'),
}


export default conf;