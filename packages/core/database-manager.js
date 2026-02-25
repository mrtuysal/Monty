const CloudAdapter = require('./cloud-adapter');
const { encryptData, decryptData } = require('./encryption');

class DatabaseManager {
    constructor(secretKey) {
        this.cloud = new CloudAdapter();
        this.secretKey = secretKey;
        this.localState = {
            accounts: [],
            payments: []
        };
        this.isLoaded = false;
    }

    async init() {
        console.log("Initializing Database Manager...");
        // Try to load current year data
        const currentYear = new Date().getFullYear();
        const filename = `${currentYear}_data.enc`;

        const encryptedContent = await this.cloud.downloadFile(filename);

        if (encryptedContent) {
            const decrypted = decryptData(encryptedContent, this.secretKey);
            if (decrypted) {
                this.localState = decrypted;
                this.isLoaded = true;
                console.log("Data loaded from cloud (mock).");
            } else {
                console.error("Failed to decrypt data!");
            }
        } else {
            console.log("No existing data found. Starting fresh.");
            this.isLoaded = true;
        }
    }

    async save() {
        if (!this.isLoaded) return;

        const currentYear = new Date().getFullYear();
        const filename = `${currentYear}_data.enc`;

        const encrypted = encryptData(this.localState, this.secretKey);
        await this.cloud.uploadFile(filename, encrypted);
        console.log("Data saved to cloud (mock).");
    }

    // CRUD Operations
    addAccount(account) {
        this.localState.accounts.push({ id: Date.now(), ...account });
        this.save();
    }

    getAccounts() {
        return this.localState.accounts;
    }

    addPayment(payment) {
        this.localState.payments.push({ id: Date.now(), ...payment });
        this.save();
    }

    getPayments() {
        return this.localState.payments;
    }
}

module.exports = DatabaseManager;
