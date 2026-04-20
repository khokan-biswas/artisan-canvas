import conf from "../conf/conf.js";
import { Client, ID, Databases, Storage, Query, Functions } from "appwrite";

export class Service {
  client = new Client();
  databases;
  bucket;
  functions;

  constructor() {
    this.client
      .setEndpoint(conf.appwriteUrl)
      .setProject(conf.appwriteProjectId);

    this.databases = new Databases(this.client);
    this.bucket = new Storage(this.client);
    this.functions = new Functions(this.client);
  }

  // ==========================================
  // 🛡️ ADMIN SERVICES
  // ==========================================

  // ✅ NEW: Check if current user is Admin via Appwrite Function
  // async isUserAdmin() {
  //   try {
  //     const execution = await this.functions.createExecution(
  //       conf.appwriteCheckAdminFunctionId, // Make sure this is in your conf.js!
  //       "", // No payload needed for GET
  //       false, // Async = false (wait for response)
  //       "/",
  //       "GET",
  //     );

  //     const response = JSON.parse(execution.responseBody);
  //     return response.isAdmin; // Returns true or false
  //   } catch (error) {
  //     //       console.error("Appwrite service :: isUserAdmin :: error", error);
  //     return false; // Default to false on error for security
  //   }
  // }

  // ==========================================
  // 🎨 PAINTINGS (PRODUCTS)
  // ==========================================

  async getPainting(id) {
    try {
      return await this.databases.getDocument(
        conf.appwriteDatabaseId,
        conf.appwritePaintingsCollectionId,
        id,
      );
    } catch (error) {
      //       console.error("Appwrite service :: getPainting :: error", error);
      return false;
    }
  }

  async getPaintings(queries = [], limit = 25, offset = 0) {
    try {
      // We combine the user's custom queries with our pagination queries
      const finalQueries = [
        ...queries,
        Query.limit(limit),
        Query.offset(offset),
        Query.orderDesc("$createdAt"), // Good SDE practice: show newest art first
      ];

      return await this.databases.listDocuments(
        conf.appwriteDatabaseId,
        conf.appwritePaintingsCollectionId,
        finalQueries,
      );
    } catch (error) {
      // console.error("Appwrite service :: getPaintings :: error", error);
      return { documents: [], total: 0 };
    }
  }

  async createPainting(data) {
    try {
      return await this.databases.createDocument(
        conf.appwriteDatabaseId,
        conf.appwritePaintingsCollectionId,
        ID.unique(),
        {
          ...data,
          like: 0,
          pricein: parseFloat(data.pricein) || 0,
          priceusd: parseFloat(data.priceusd) || 0,
          discountin: parseFloat(data.discountin) || 0,
          discountusd: parseFloat(data.discountusd) || 0,
        },
      );
    } catch (error) {
      //       console.error("Appwrite service :: createPainting :: error", error);
      throw error;
    }
  }

  async updatePainting(slug, data) {
    try {
      return await this.databases.updateDocument(
        conf.appwriteDatabaseId,
        conf.appwritePaintingsCollectionId,
        slug,
        data,
      );
    } catch (error) {
      //       console.error("Appwrite service :: updatePainting :: error", error);
      throw error;
    }
  }

  async updateLikeCount(slug, newCount) {
    try {
      return await this.databases.updateDocument(
        conf.appwriteDatabaseId,
        conf.appwritePaintingsCollectionId,
        slug,
        { like: newCount },
      );
    } catch (error) {
      //       console.warn("Appwrite service :: updateLikeCount :: warning", error);
      return null;
    }
  }

  // ==========================================
  // 📦 ORDERS & PAYMENTS
  // ==========================================

  // 1. Secure Payment Verification via Appwrite Function
  async verifyPayment(payload) {
    try {
      const execution = await this.functions.createExecution(
        conf.appwritePaymentFunctionId,
        JSON.stringify(payload),
        false,
        "/",
        "POST",
        { "Content-Type": "application/json" },
      );
      const response = JSON.parse(execution.responseBody);
      if (response.success === false) {
        throw new Error(response.message || "Payment verification failed.");
      }
      return response;
    } catch (error) {
      //       console.error("Appwrite service :: verifyPayment :: error", error);
      return {
        success: false,
        error: true,
        message: error?.message || "Payment verification request failed.",
      };
    }
  }

  async createRazorpayOrder({ amount, currency = 'INR', receipt = null, items = [], userId }) {
    try {
      const execution = await this.functions.createExecution(
        conf.appwritePaymentFunctionId,
        JSON.stringify({
          paymentMethod: 'RazorpayCreateOrder',
          amount: Number(amount),
          currency,
          receipt,
          items,
          userId,
        }),
        false,
        "/",
        "POST",
        { "Content-Type": "application/json" },
      );

      const response = JSON.parse(execution.responseBody);
      if (response.success === false) {
        throw new Error(response.message || "Unable to create Razorpay order.");
      }
      return response;
    } catch (error) {
      //       console.error("Appwrite service :: createRazorpayOrder :: error", error);
      throw error;
    }
  }

  // 2. Update Order Details (Admin status updates)
  async updateOrder(orderId, data) {
    try {
      return await this.databases.updateDocument(
        conf.appwriteDatabaseId,
        conf.appwriteOrdersCollectionId,
        orderId,
        data,
      );
    } catch (error) {
      //       console.error("Appwrite service :: updateOrder :: error", error);
      throw error;
    }
  }

  // 3. Frontend Order Logic (Direct DB Operations)
  // ✅ UPDATED: Matching the 'shippingAddress' key from your Checkout component
 async createCODOrder({
    userId,
    items,
    customerName,
    email,
    shippingAddress,
    totalAmount,
    paymentMethod = "COD",
    paymentId = null,

}) {
    // --- DEBUG LOG: Input Data ---
    console.log("DEBUG: createCODOrder received:", { userId, items, totalAmount, paymentMethod });

    try {
        const paintingIds = Array.isArray(items) ? items : [items];

        // A. Verify Stock First
        for (const id of paintingIds) {
            const p = await this.databases.getDocument(
                conf.appwriteDatabaseId,
                conf.appwritePaintingsCollectionId,
                id,
            );
            if (p.isSold) throw new Error(`Item ${p.title} is already sold.`);
        }

        // B. Mark as Sold
        for (const id of paintingIds) {
            await this.databases.updateDocument(
                conf.appwriteDatabaseId,
                conf.appwritePaintingsCollectionId,
                id,
                { isSold: true },
            );
        }

        const normalizedPaymentId = paymentId || `${paymentMethod}-${Date.now()}`;
        const status = paymentMethod === "COD" ? "COD" : "Waiting for Payment";

        // --- DEBUG LOG: Final Payload before DB call ---
        const orderData = {
            userId,
            paintingId: paintingIds.join(","),
            amount: parseFloat(totalAmount) || 0,
            paymentId: normalizedPaymentId,
            status,
            customerName,
            email,
            shippingAddress: shippingAddress,
            ordercomplete: "no",
            currency: "INR",
        };
        
        console.log("DEBUG: Database ID:", conf.appwriteDatabaseId);
        console.log("DEBUG: Collection ID:", conf.appwriteOrdersCollectionId);
        console.log("DEBUG: Final Payload Object:", orderData);

        // C. Create Order Document
        return await this.databases.createDocument(
            conf.appwriteDatabaseId,
            conf.appwriteOrdersCollectionId,
            "unique()", // Using the string "unique()" instead of ID.unique() to avoid import errors
            orderData
        );
    } catch (error) {
        console.error("DEBUG ERROR: Appwrite Order Creation Failed", error);
        // Important: check if error is specifically about a missing attribute
        if (error.message.includes("Attribute")) {
            console.warn("Check your Appwrite Console: One of the fields in 'orderData' might be missing from your collection attributes.");
        }
        throw error;
    }
}

  // 4. Fetch Orders
  async getOrders(queries = []) {
    try {
      // Default to showing newest orders first
      if (!queries.some((q) => q.toString().includes("orderDesc"))) {
        queries.push(Query.orderDesc("$createdAt"));
      }
      return await this.databases.listDocuments(
        conf.appwriteDatabaseId,
        conf.appwriteOrdersCollectionId,
        queries,
      );
    } catch (error) {
      //       console.error("Appwrite service :: getOrders :: error", error);
      return { documents: [], total: 0 };
    }
  }

  // ==========================================
  // 💳 PAYMENT GATEWAY FUNCTIONS
  // ==========================================

  // 1. PhonePe Order Creation (Initiate Payment)
  async createPhonePeOrder({ userId, amount, orderId, mobileNumber }) {
    try {
      const payload = {
        userId,
        amount: parseFloat(amount),
        orderId: orderId || ID.unique(),
        mobileNumber: mobileNumber || "9999999999",
        paymentMethod: "PhonePe_Initiate",
      };

      const execution = await this.functions.createExecution(
        conf.appwritePaymentFunctionId,
        JSON.stringify(payload),
        false,
        "/",
        "POST",
        { "Content-Type": "application/json" },
      );

      const response = JSON.parse(execution.responseBody);

      if (!response.success) {
        throw new Error(response.message || "PhonePe initiation failed");
      }

      return response.data;
    } catch (error) {
      //       console.error("Appwrite service :: createPhonePeOrder :: error", error);
      throw error;
    }
  }

  // ==========================================
  // 🛒 CART MANAGEMENT (UPDATED FOR ARRAY SCHEMA)
  // ==========================================

  // 1. Get Cart from DB
  async getCart(userId) {
    try {
      const queries = [Query.equal("userId", userId)];
      const response = await this.databases.listDocuments(
        conf.appwriteDatabaseId,
        conf.appwritecartsCollectionId,
        queries,
      );

      if (response.documents.length > 0) {
        // Since 'items' is an array of strings, we parse each string back to an object
        const itemsArray = response.documents[0].items;
        return itemsArray.map((itemString) => JSON.parse(itemString));
      }
      return [];
    } catch (error) {
      //       console.log("Appwrite service :: getCart :: error", error);
      return [];
    }
  }

  // 2. Save Cart to DB
  async saveCart(userId, cartItemsArray) {
    try {
      // ✅ Convert each object in the array into its own JSON string
      // This matches the Appwrite 'string array' type
      const itemsAsArrayOfStrings = cartItemsArray.map((item) =>
        JSON.stringify(item),
      );

      const queries = [Query.equal("userId", userId)];

      const response = await this.databases.listDocuments(
        conf.appwriteDatabaseId,
        conf.appwritecartsCollectionId,
        queries,
      );

      if (response.documents.length > 0) {
        // UPDATE existing document
        return await this.databases.updateDocument(
          conf.appwriteDatabaseId,
          conf.appwritecartsCollectionId,
          response.documents[0].$id,
          { items: itemsAsArrayOfStrings }, // Send the array of strings
        );
      } else {
        // CREATE new document
        return await this.databases.createDocument(
          conf.appwriteDatabaseId,
          conf.appwritecartsCollectionId,
          ID.unique(),
          {
            userId: userId,
            items: itemsAsArrayOfStrings, // Send the array of strings
          },
        );
      }
    } catch (error) {
      //       console.log("Appwrite service :: saveCart :: error", error);
      throw error; // Throwing so the UI can handle the error state
    }
  }

  // ==========================================
  // 🖼 STORAGE
  // ==========================================

  async uploadFile(file) {
    try {
      return await this.bucket.createFile(
        conf.appwriteBucketId,
        ID.unique(),
        file,
      );
    } catch (error) {
      //       console.error("Appwrite service :: uploadFile :: error", error);
      throw error;
    }
  }

  getThumbnail(fileIdInput) {
    try {
      let fileId = fileIdInput;
      if (!fileId) return null;
      if (typeof fileId === "string" && fileId.includes("/files/")) {
        const parts = fileId.split("/files/");
        if (parts[1]) fileId = parts[1].split("/")[0];
      }
      const url = this.bucket.getFileView(conf.appwriteBucketId, fileId);
      return url.href || url.toString();
    } catch (error) {
      return null;
    }
  }

  // ==========================================
  // 👤 USER DATABASE SERVICES
  // ==========================================

  // 1. Get detailed user profile from Database
  async getUserProfile(userId) {
    try {
      return await this.databases.getDocument(
        conf.appwriteDatabaseId,
        conf.appwriteUserCollectionId,
        userId,
      );
    } catch (error) {
      // If document doesn't exist (404), return null instead of throwing error
      if (error.code === 404) return null;
      //       console.error("Appwrite service :: getUserProfile :: error", error);
      return null;
    }
  }

  // 2. Update user profile in Database
  async updateUserProfile(userId, updateData) {
    try {
      // We assume the Document ID is the same as the User Auth ID
      return await this.databases.updateDocument(
        conf.appwriteDatabaseId,
        conf.appwriteUserCollectionId,
        userId,
        updateData,
      );
    } catch (error) {
      //       console.error("Appwrite service :: updateUserProfile :: error", error);
      throw error;
    }
  }
}

const service = new Service();
export default service;
