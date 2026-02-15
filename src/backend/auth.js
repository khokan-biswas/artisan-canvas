import conf from '../conf/conf.js';
import { Client, Account, ID, Databases } from "appwrite";

export class AuthService {
    client = new Client();
    account;
    databases;

    constructor() {
        this.client.setEndpoint(conf.appwriteUrl).setProject(conf.appwriteProjectId);
        this.account = new Account(this.client);
        this.databases = new Databases(this.client);
    }

    async createAccount({ email, password, name, country, phone }) {
        try {
            // 1. Create Appwrite Auth User
            const userAccount = await this.account.create(ID.unique(), email, password, name);
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
                            isAdmin: false
                        }
                    );
                } catch (dbError) { console.warn("DB Save Error:", dbError); }
                return userAccount;
            }
        } catch (error) { throw error; }
    }

    async login({ email, password }) {
        return await this.account.createEmailPasswordSession(email, password);
    }

    async getCurrentUser() {
        try {
            const authUser = await this.account.get();
            try {
                const dbUser = await this.databases.getDocument(
                    conf.appwriteDatabaseId, conf.appwriteUserCollectionId, authUser.$id
                );
                return { ...authUser, ...dbUser }; 
            } catch (dbError) { return authUser; }
        } catch (error) { return null; }
    }
    async logout() { await this.account.deleteSessions(); }
}
const authService = new AuthService();
export default authService;