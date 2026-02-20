import { Client, Users } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key']);

  const users = new Users(client);

  try {
    const userId = req.headers['x-appwrite-user-id'];
    if (!userId) {
      return res.json({ isAdmin: false, error: 'Guest User' });
    }

    const user = await users.get(userId);
    const adminEmail = process.env.ADMIN_EMAIL; // We will set this in the console next

    if (user.email === adminEmail) {
      return res.json({ isAdmin: true });
    } else {
      return res.json({ isAdmin: false });
    }
  } catch (err) {
    error('Admin check failed: ' + err.message);
    return res.json({ isAdmin: false });
  }
};