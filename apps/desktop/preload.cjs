const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload Script — Security Bridge
 * 
 * This script runs in an isolated context and selectively exposes
 * only the necessary APIs to the renderer process via contextBridge.
 * This prevents the renderer from having full Node.js access.
 */
contextBridge.exposeInMainWorld('electronAPI', {
    // Clear all session/storage data (used during logout)
    clearSessionData: () => ipcRenderer.invoke('clear-session-data'),

    // OAuth
    openAuthWindow: (url) => ipcRenderer.invoke('open-auth-window', url),

    // Get the application version
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // Auto-launch at system startup
    getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
    setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),

    // Native desktop notifications
    showNotification: (options) => ipcRenderer.invoke('show-notification', options),

    // Auto-Updater
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateStatus: (callback) => {
        // Remove existing listeners to avoid duplicates
        ipcRenderer.removeAllListeners('update-status');
        ipcRenderer.on('update-status', (event, data) => callback(data));
    },

    // Check if running in Electron
    isElectron: true,

    // Platform info
    platform: process.platform
});
