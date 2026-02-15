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
      console.error("Appwrite service :: getPainting :: error", error);
      return false;
    }
  }

  async getPaintings(queries = []) {
    try {
      return await this.databases.listDocuments(
        conf.appwriteDatabaseId,
        conf.appwritePaintingsCollectionId,
        queries,
      );
    } catch (error) {
      console.error("Appwrite service :: getPaintings :: error", error);
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
      console.error("Appwrite service :: createPainting :: error", error);
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
      console.error("Appwrite service :: updatePainting :: error", error);
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
      console.warn("Appwrite service :: updateLikeCount :: warning", error);
      return null;
    }
  }

  // ==========================================
  // 📦 ORDERS & PAYMENTS
  // ==========================================

  // 1. Secure PayPal Verification via Function
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
      return JSON.parse(execution.responseBody);
    } catch (error) {
      console.error("Appwrite service :: verifyPayment :: error", error);
      throw error;
    }
  }

  // 2. Update Order Details (Status, Completion, etc.)
  async updateOrder(orderId, data) {
    try {
      return await this.databases.updateDocument(
        conf.appwriteDatabaseId,
        conf.appwriteOrdersCollectionId,
        orderId,
        data, // Expects object like { status: "Shipped" } or { ordercomplete: "yes" }
      );
    } catch (error) {
      console.error("Appwrite service :: updateOrder :: error", error);
      throw error; // Throw error so your frontend catch block can handle it
    }
  }

  // 3. Frontend COD Logic (Direct DB Operations)
  async createCODOrder({
    userId,
    items,
    customerName,
    email,
    shippingDetails,
    totalAmount,
  }) {
    try {
      const paintingIds = Array.isArray(items) ? items : [items];

      // A. Verify Stock First (Read from Paintings)
      for (const id of paintingIds) {
        const p = await this.databases.getDocument(
          conf.appwriteDatabaseId,
          conf.appwritePaintingsCollectionId,
          id,
        );
        if (p.isSold) throw new Error(`Item ${p.title} is already sold.`);
      }

      // B. Mark as Sold (Update Paintings)
      for (const id of paintingIds) {
        await this.databases.updateDocument(
          conf.appwriteDatabaseId,
          conf.appwritePaintingsCollectionId,
          id,
          { isSold: true },
        );
      }

      // C. Create Order (Write to Orders)
      const shippingString =
        typeof shippingDetails === "object"
          ? JSON.stringify(shippingDetails)
          : String(shippingDetails);

      return await this.databases.createDocument(
        conf.appwriteDatabaseId,
        conf.appwriteOrdersCollectionId, // ✅ Correct Collection for Orders
        ID.unique(),
        {
          userId,
          paintingId: paintingIds.join(","),
          amount: parseFloat(totalAmount) || 0,
          paymentId: `COD-${Date.now()}`,
          status: "COD",
          customerName,
          email,
          shippingAddress: shippingString,
          ordercomplete: "no", // Based on your schema
          currency: "INR",
        },
      );
    } catch (error) {
      console.error("Appwrite service :: createCODOrder :: error", error);
      throw error;
    }
  }

  async getOrders(queries = []) {
    try {
      if (!queries.some((q) => q.toString().includes("orderDesc"))) {
        queries.push(Query.orderDesc("$createdAt"));
      }
      return await this.databases.listDocuments(
        conf.appwriteDatabaseId,
        conf.appwriteOrdersCollectionId,
        queries,
      );
    } catch (error) {
      console.error("Appwrite service :: getOrders :: error", error);
      return { documents: [], total: 0 };
    }
  }

  // ==========================================
  // 💳 PAYMENT GATEWAY FUNCTIONS
  // ==========================================

  // 1. PhonePe Order Creation (Initiate Payment)
  // This calls your Appwrite Function to generate the secure Checksum & Redirect URL
  async createPhonePeOrder({ userId, amount, orderId, mobileNumber }) {
    try {
      const payload = {
        userId,
        amount: parseFloat(amount), // Amount in full currency (e.g., 100.00)
        orderId: orderId || ID.unique(), // Generate or use passed ID
        mobileNumber: mobileNumber || "9999999999",
        paymentMethod: "PhonePe_Initiate", // Tag for backend router
      };

      // Call Appwrite Function
      const execution = await this.functions.createExecution(
        conf.appwritePaymentFunctionId, // Reuse same function ID or create new one
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

      // Return the payment URL (User should be redirected here)
      return response.data; // e.g., { redirectUrl: "https://..." }
    } catch (error) {
      console.error("Appwrite service :: createPhonePeOrder :: error", error);
      throw error;
    }
  }

  // 2. PayPal Verification (Capture Payment)
  // This calls your Appwrite Function to validate the Order ID with PayPal
  async verifyPayPalPayment(orderID) {
    try {
      const payload = {
        orderID, // The ID generated by PayPal frontend SDK
        paymentMethod: "PayPal", // Tag for backend router
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
        throw new Error(response.message || "PayPal verification failed");
      }

      return response; // e.g., { success: true, orderId: "..." }
    } catch (error) {
      console.error("Appwrite service :: verifyPayPalPayment :: error", error);
      throw error;
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
      console.error("Appwrite service :: uploadFile :: error", error);
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
}

const service = new Service();
export default service;
