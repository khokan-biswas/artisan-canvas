const conf = {
    appwriteUrl: String(import.meta.env.VITE_APPWRITE_ENDPOINT),
    appwriteProjectId: String(import.meta.env.VITE_APPWRITE_PROJECT_ID),
    appwriteDatabaseId: String(import.meta.env.VITE_APPWRITE_DATABASE_ID),
    appwritePaintingsCollectionId: String(import.meta.env.VITE_APPWRITE_PAINTINGS_COLLECTION_ID),
    appwriteOrdersCollectionId: String(import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID),
    appwriteBucketId: String(import.meta.env.VITE_APPWRITE_BUCKET_ID),
    appwritePaymentFunctionId: String(import.meta.env.VITE_APPWRITE_FUNCTION_ID),
    appwriteUserCollectionId: String(import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID),
    appwritePaypalClientId: String(import.meta.env.VITE_APPWRITE_PAYPAL_CLIENT_ID),
    
}

export default conf;