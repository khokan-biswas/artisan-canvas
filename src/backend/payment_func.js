import conf from '../conf/conf.js';
import { Client, Functions } from "appwrite";

export class FunctionService {
    client = new Client();
    functions;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteUrl)
            .setProject(conf.appwriteProjectId);
        
        this.functions = new Functions(this.client);
    }

    // Execute the PayPal Verification Function
    // Updated to accept 'items' (array) and 'totalPaid'
    async verifyPayment({ orderID, items, userId, totalPaid, shippingDetails }) {
        try {
            if (!orderID || !userId || !items || !totalPaid) {
                throw new Error("Missing required payment verification data");
            }
            
            const execution = await this.functions.createExecution(
                conf.appwritePaymentFunctionId,
                JSON.stringify({
                    orderID,
                    items,
                    userId,
                    totalPaid: Number(totalPaid).toFixed(2),
                    currency: "USD",
                    shippingDetails: shippingDetails || {}
                })
            );
            
            // Parse the response from the function
            const response = JSON.parse(execution.responseBody);
            console.log("PayPal Verification Response:", response);
            return response;
        } catch (error) {
            console.error("Appwrite service :: verifyPayment :: error", error);
            throw new Error(error.message || "Payment verification failed");
        }
    }
}

const functionService = new FunctionService();
export default functionService;