
import conf from "../conf/conf.js";
import { Client, Account, ID, Databases, Query } from "appwrite";

export class AuthService {
  client = new Client();
  account;
  databases;

  constructor() {
    this.client
      .setEndpoint(conf.appwriteUrl)
      .setProject(conf.appwriteProjectId);
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
  }

  async createAccount({ email, password, name, country, phone }) {
    try {
      // 1. Create Appwrite Auth User
      const userAccount = await this.account.create(
        ID.unique(),
        email,
        password,
        name,
      );
      if (userAccount) {
        // 2. Login immediately
        await this.login({ email, password });

        // 3. Save details to Database
        try {
          await this.databases.createDocument(
            conf.appwriteDatabaseId,
            conf.appwriteUserCollectionId,
            userAccount.$id,
            {
              name,
              email,
              country,
              phone, // 👈 Saving Phone
              isAdmin: false,
            },
          );
        } catch (dbError) {
//           console.warn("DB Save Error:", dbError);
        }
        return userAccount;
      }
    } catch (error) {
      throw error;
    }
  }

  async login({ email, password }) {
    return await this.account.createEmailPasswordSession(email, password);
  }

  async updateName(name) {
    try {
      // 'account' is your new Account(this.client) instance
      return await this.account.updateName(name);
    } catch (error) {
      // console.error("Appwrite auth :: updateName :: error", error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const authUser = await this.account.get();
      try {
        const dbUser = await this.databases.getDocument(
          conf.appwriteDatabaseId,
          conf.appwriteUserCollectionId,
          authUser.$id,
        );
        return { ...authUser, ...dbUser };
      } catch (dbError) {
        return authUser;
      }
    } catch (error) {
      return null;
    }
  }
  
  async sendPasswordResetEmail(email) {
    try {
      // Generate a 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code in database with 10-minute expiry
      const expiryTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      
      try {
        // Try to update if exists, otherwise create
        const existing = await this.databases.listDocuments(
          conf.appwriteDatabaseId,
          conf.appwriteResetCodesCollectionId,
          [Query.equal('email', email)]
        );
        
        if (existing.documents.length > 0) {
          await this.databases.updateDocument(
            conf.appwriteDatabaseId,
            conf.appwriteResetCodesCollectionId,
            existing.documents[0].$id,
            { code, expiryTime }
          );
        } else {
          await this.databases.createDocument(
            conf.appwriteDatabaseId,
            conf.appwriteResetCodesCollectionId,
            ID.unique(),
            { email, code, expiryTime }
          );
        }
      } catch (dbError) {
        console.warn("Could not store reset code in database:", dbError);
      }
      
      // TODO: Send email with code (integrate with email service)
      // When integrating with email service, use this URL:
      // const resetUrl = `${conf.appUrl}/reset-password?email=${encodeURIComponent(email)}`;
      // For now, log to console for testing
      console.log(`Reset code for ${email}: ${code}`);
      console.log(`User should visit: ${conf.appUrl}/reset-password to enter this code`);
      
      return { success: true, message: 'Code sent to your email' };
    } catch (error) {
      throw error;
    }
  }

  async verifyResetCode(email, code) {
    try {
      const result = await this.databases.listDocuments(
        conf.appwriteDatabaseId,
        conf.appwriteResetCodesCollectionId,
        [Query.equal('email', email), Query.equal('code', code)]
      );
      
      if (result.documents.length === 0) {
        throw new Error('Invalid code or email.');
      }
      
      const doc = result.documents[0];
      const now = new Date();
      const expiry = new Date(doc.expiryTime);
      
      if (now > expiry) {
        throw new Error('Code has expired.');
      }
      
      return { success: true, userId: email };
    } catch (error) {
      throw error;
    }
  }

  async updatePassword({ userId, secret, password }) {
    try {
      // Completes password reset with code
      return await this.account.updateRecovery(userId, secret, password, password);
    } catch (error) {
      throw error;
    }
  }
  
  async logout() {
    await this.account.deleteSessions();
  }

  async sendPasswordResetEmail(email) {
    try {
        // The second parameter is the URL. 
        // Even though we want a "code", Appwrite still needs a valid URL.
        // We point it to your reset page. The "secret" will be in the URL, 
        // but the user can also just copy it from the email text.
        return await this.account.createRecovery(
            email, 
            'http://localhost:5173/reset-password' // Your frontend URL
        );
    } catch (error) {
        throw error;
    }
}

async updatePassword({userId, secret, password}) {
    try {
        // userId here is usually the ID found in the recovery email or the email itself
        return await this.account.updateRecovery(
            userId, 
            secret, 
            password, 
            password
        );
    } catch (error) {
        throw error;
    }
}
}
const authService = new AuthService();
export default authService;
