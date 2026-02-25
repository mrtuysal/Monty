/**
 * Cloud Storage Adapter Interface
 * Handles interaction with Google Drive / iCloud
 * Currently mocks local file storage for MVP simulation
 */

const fs = require('fs');
const path = require('path');

class CloudAdapter {
    constructor(provider = 'local') {
        this.provider = provider;
        this.storagePath = path.join(__dirname, '../../local_cloud_storage');

        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }

    async listFiles() {
        return fs.readdirSync(this.storagePath);
    }

    async downloadFile(filename) {
        const filePath = path.join(this.storagePath, filename);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
        return null;
    }

    async uploadFile(filename, content) {
        const filePath = path.join(this.storagePath, filename);
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    }

    async deleteFile(filename) {
        const filePath = path.join(this.storagePath, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    }
}

module.exports = CloudAdapter;
