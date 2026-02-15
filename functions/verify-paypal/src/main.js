const sdk = require("node-appwrite");
const checkoutNodeJssdk = require("@paypal/checkout-server-sdk");
const crypto = require("crypto"); // Built-in Node module for PhonePe hashing

module.exports = async function (context) {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  // 1. Initialize Appwrite
  if (
    !process.env.APPWRITE_ENDPOINT ||
    !process.env.APPWRITE_PROJECT_ID ||
    !process.env.APPWRITE_API_KEY
  ) {
    context.error("❌ Missing Appwrite Environment Variables");
    return context.res.json(
      { success: false, message: "Server Configuration Error" },
      500
    );
  }

  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  // --- HELPER LOGS ---
  const log = (msg) => context.log(`[Payment Fn]: ${msg}`);
  const errorLog = (msg) => context.error(`[Payment Fn Error]: ${msg}`);

  // 2. PARSE PAYLOAD
  let payload = {};
  try {
    if (context.req.body) {
      payload =
        typeof context.req.body === "string"
          ? JSON.parse(context.req.body)
          : context.req.body;
    } else if (context.payload) {
      payload =
        typeof context.payload === "string"
          ? JSON.parse(context.payload)
          : context.payload;
    }
  } catch (e) {
    errorLog("JSON Parse Failed: " + e.message);
    return context.res.json(
      { success: false, message: "Invalid JSON Body" },
      400
    );
  }

  const {
    paymentMethod, // "PayPal" or "PhonePe_Initiate"
    orderID, // For PayPal
    items,
    userId,
    shippingDetails,
    customerName,
    email,
    totalPaid,
    amount, // For PhonePe
    mobileNumber, // For PhonePe
  } = payload;

  log(`Processing Request: ${paymentMethod} | User: ${userId}`);

  try {
    // ============================================================
    // 🅰️ OPTION A: PHONEPE INITIATION (Generate Checksum)
    // ============================================================
    if (paymentMethod === "PhonePe_Initiate") {
      log("Initiating PhonePe Transaction...");

      const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
      const SALT_KEY = process.env.PHONEPE_SALT_KEY;
      const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || "1";
      const ENV = process.env.PHONEPE_ENV || "UAT"; // "UAT" or "PROD"

      const merchantTransactionId = `T${Date.now()}`; // Unique ID

      const normalPayload = {
        merchantId: MERCHANT_ID,
        merchantTransactionId: merchantTransactionId,
        merchantUserId: userId,
        amount: amount * 100, // Convert to Paise (INR)
        redirectUrl: "https://your-website.com/orders", // Update this!
        redirectMode: "REDIRECT",
        callbackUrl: "https://your-website.com/api/phonepe-webhook", // Optional
        mobileNumber: mobileNumber,
        paymentInstrument: {
          type: "PAY_PAGE",
        },
      };

      // 1. Base64 Encode Payload
      const base64Payload = Buffer.from(JSON.stringify(normalPayload)).toString(
        "base64"
      );

      // 2. Generate Checksum: SHA256(Base64 + "/pg/v1/pay" + SaltKey) + ### + SaltIndex
      const stringToHash = base64Payload + "/pg/v1/pay" + SALT_KEY;
      const sha256 = crypto
        .createHash("sha256")
        .update(stringToHash)
        .digest("hex");
      const checksum = `${sha256}###${SALT_INDEX}`;

      // 3. Return Data to Frontend
      return context.res.json({
        success: true,
        data: {
          payload: base64Payload,
          checksum: checksum,
          transactionId: merchantTransactionId,
          url:
            ENV === "PROD"
              ? "https://api.phonepe.com/apis/hermes/pg/v1/pay"
              : "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay",
        },
      });
    }

    // ============================================================
    // 🅱️ OPTION B: PAYPAL VERIFICATION (Capture & Save)
    // ============================================================
    if (paymentMethod === "PayPal") {
      log("Verifying PayPal Order...");

      if (!orderID || !items) {
        return context.res.json(
          { success: false, message: "Missing PayPal Data" },
          400
        );
      }

      // 1. Setup PayPal Client
      const Environment =
        process.env.PAYPAL_ENVIRONMENT === "production"
          ? checkoutNodeJssdk.core.LiveEnvironment
          : checkoutNodeJssdk.core.SandboxEnvironment;

      const paypalClient = new checkoutNodeJssdk.core.PayPalHttpClient(
        new Environment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_SECRET
        )
      );

      // 2. Capture Payment
      const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(
        orderID
      );
      request.requestBody({});
      const capture = await paypalClient.execute(request);

      if (capture.result.status !== "COMPLETED") {
        throw new Error(`PayPal Status: ${capture.result.status}`);
      }

      log("💰 PayPal Payment Captured.");

      // 3. Mark Items as Sold
      const soldItems = Array.isArray(items) ? items : [items];
      for (const id of soldItems) {
        await databases.updateDocument(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_PAINTINGS_COLLECTION_ID,
          id,
          { isSold: true }
        );
      }

      // 4. Create Order in Database
      const orderDoc = await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_ORDERS_COLLECTION_ID,
        sdk.ID.unique(),
        {
          userId,
          customerName: customerName || "Guest",
          email: email || "no-email",
          paintingId: soldItems.join(","),
          amount: parseFloat(totalPaid),
          shippingAddress:
            typeof shippingDetails === "object"
              ? JSON.stringify(shippingDetails)
              : String(shippingDetails),
          paymentId: capture.result.id,
          status: "Paid",
          currency: "USD", // ✅ Explicitly saving as USD
        }
      );

      log(`🎉 Order Created: ${orderDoc.$id}`);
      return context.res.json({ success: true, orderId: orderDoc.$id });
    }

    return context.res.json(
      { success: false, message: "Invalid Payment Method" },
      400
    );
  } catch (error) {
    errorLog("CRITICAL ERROR: " + error.message);
    return context.res.json({ success: false, error: error.message }, 500);
  }
};


// thise are the environment variables you need to set for this function to work properly:

// PHONEPE_MERCHANT_ID

// PHONEPE_SALT_KEY

// PHONEPE_SALT_INDEX

// PHONEPE_ENV (Set to UAT for testing, PROD for live)