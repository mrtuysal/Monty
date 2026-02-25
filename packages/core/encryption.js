const CryptoJS = require("crypto-js");

/**
 * Encrypts data using AES-256
 * @param {object|string} data - Data to encrypt
 * @param {string} key - Encryption key
 * @returns {string} - Encrypted string
 */
function encryptData(data, key) {
    try {
        const jsonString = JSON.stringify(data);
        return CryptoJS.AES.encrypt(jsonString, key).toString();
    } catch (error) {
        console.error("Encryption failed:", error);
        return null;
    }
}

/**
 * Decrypts data using AES-256
 * @param {string} encryptedData - Encrypted string
 * @param {string} key - Decryption key
 * @returns {object|string} - Decrypted data
 */
function decryptData(encryptedData, key) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, key);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(originalText);
    } catch (error) {
        console.error("Decryption failed:", error);
        return null;
    }
}

module.exports = {
    encryptData,
    decryptData
};
