# verify-paypal

## 🧰 Usage

### GET /ping

- Returns a "Pong" message.

**Response**

Sample `200` Response:

```text
Pong
```

### GET, POST, PUT, PATCH, DELETE /

- Returns a "Learn More" JSON response.

**Response**

Sample `200` Response:

```json
{
  "motto": "Build like a team of hundreds_",
  "learn": "https://appwrite.io/docs",
  "connect": "https://appwrite.io/discord",
  "getInspired": "https://builtwith.appwrite.io"
}
```

## ⚙️ Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Permissions       | `any`         |
| Timeout (Seconds) | 15            |

## 🔒 Environment Variables

This function requires the following environment variables to be set in the Appwrite Function settings:

- `APPWRITE_FUNCTION_PROJECT_ID` (or `APPWRITE_PROJECT_ID`) - Appwrite project id
- `APPWRITE_API_KEY` - Appwrite API key with appropriate permissions
- `APPWRITE_ENDPOINT` - (optional) Appwrite endpoint, defaults to https://cloud.appwrite.io/v1
- `DATABASE_ID` - Appwrite Database ID used by the frontend (`VITE_APPWRITE_DATABASE_ID`)
- `PAINTINGS_COLLECTION_ID` - Collection ID for paintings (`VITE_APPWRITE_PAINTINGS_COLLECTION_ID`)
- `ORDERS_COLLECTION_ID` - Collection ID for orders (`VITE_APPWRITE_ORDERS_COLLECTION_ID`)
- `PAYPAL_CLIENT_ID` - PayPal REST client ID (sandbox or live)
- `PAYPAL_SECRET` - PayPal REST secret
- `PAYPAL_ENVIRONMENT` - `sandbox` (default) or `production`
- `DEFAULT_CURRENCY` - (optional) e.g. `USD`

Notes:
- The frontend calls this function via the Appwrite Functions `createExecution` API and passes a JSON payload.
- The function accepts payload fields: `orderID`, `userId`, `items` (array of painting IDs) or `paintingId` (legacy), `totalPaid`, and `shippingDetails`.
- Make sure the Appwrite Function environment variables match the database and collection IDs used by your frontend.
