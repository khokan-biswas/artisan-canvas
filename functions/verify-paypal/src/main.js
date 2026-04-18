const sdk = require("node-appwrite");
const checkoutNodeJssdk = require("@paypal/checkout-server-sdk");
const Razorpay = require("razorpay");
const crypto = require("crypto");

module.exports = async function (context) {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_URL)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  let payload = context.req.body;
  if (typeof payload === "string") payload = JSON.parse(payload);

  const { paymentMethod } = payload;

  try {
    // --- 🆕 1. RAZORPAY ORDER CREATION (This was missing!) ---
    if (paymentMethod === "RazorpayCreateOrder") {
      context.log("Creating Razorpay Order...");
      const razorpay = new Razorpay({
        key_id: (process.env.RAZORPAY_KEY_ID || "").trim(),
        key_secret: (process.env.RAZORPAY_KEY_SECRET || "").trim(),
      });

      const order = await razorpay.orders.create({
        amount: Math.round(Number(payload.amount) * 100), // convert to paise
        currency: payload.currency || "INR",
        receipt: `rcpt_${Date.now()}`,
      });

      return context.res.json({ success: true, orderId: order.id });
    }

    // --- 🅰️ 2. RAZORPAY VERIFICATION (After payment) ---
    if (paymentMethod === "Razorpay") {
      context.log("Processing Razorpay Verification...");
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, totalPaid } = payload;
      
      const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return context.res.json({ success: false, message: "Invalid Razorpay Signature" }, 400);
      }

      return await finalizeOrder(databases, payload, razorpay_payment_id, "INR", context);
    }

    // --- 🅱️ 3. PAYPAL FLOW (Working) ---
    if (paymentMethod === "PayPal") {
      context.log("Processing PayPal...");
      const { orderID, totalPaid } = payload;

      const env = process.env.PAYPAL_ENVIRONMENT === "production" 
        ? new checkoutNodeJssdk.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_SECRET)
        : new checkoutNodeJssdk.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_SECRET);
      
      const paypalClient = new checkoutNodeJssdk.core.PayPalHttpClient(env);
      const capture = await paypalClient.execute(new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID));

      if (capture.result.status === "COMPLETED") {
        return await finalizeOrder(databases, payload, capture.result.id, "USD", context);
      }
    }

    // This triggers if paymentMethod doesn't match any IF above
    return context.res.json({ success: false, message: `Unsupported Method: ${paymentMethod}` }, 400);

  } catch (err) {
    context.error(err.message);
    return context.res.json({ success: false, error: err.message }, 500);
  }
};

// --- DATABASE HELPER ---
async function finalizeOrder(databases, data, payId, currency, context) {
    const { items, userId, totalPaid, customerName, email, shippingAddress } = data;
    const soldItems = Array.isArray(items) ? items : String(items).split(",");

    try {
        for (const id of soldItems) {
            await databases.updateDocument(process.env.APPWRITE_DATABASE_ID, process.env.APPWRITE_PAINTINGS_COLLECTION_ID, id.trim(), { isSold: true });
        }

        const orderPayload = {
            userId: String(userId),
            paintingId: soldItems.join(", ").substring(0, 254),
            amount: parseFloat(totalPaid),
            customerName: String(customerName || "Guest"),
            shippingAddress: String(shippingAddress || "Direct").substring(0, 499),
            paymentId: String(payId),
            status: "Paid",
            email: String(email),
            ordercomplete: "no",
            currency: String(currency)
        };

        const order = await databases.createDocument(
            process.env.APPWRITE_DATABASE_ID,
            process.env.APPWRITE_ORDERS_COLLECTION_ID,
            sdk.ID.unique(),
            orderPayload
        );

        return context.res.json({ success: true, orderId: order.$id });
    } catch (dbError) {
        return context.res.json({ success: false, message: "Database Error", error: dbError.message }, 500);
    }
}