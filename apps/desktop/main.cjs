const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

// Disable Hardware Acceleration to prevent cache/GPU errors
app.disableHardwareAcceleration();
console.log('Hardware Acceleration disabled.');

function createWindow() {
    console.log('Creating window...');
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        backgroundColor: '#050505',
        webPreferences: {
            nodeIntegration: false,      // SECURITY: Renderer cannot access Node.js
            contextIsolation: true,      // SECURITY: Isolate preload from renderer
            preload: path.join(__dirname, 'preload.cjs')  // Safe API bridge
        },
        // Premium window style
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#0a0a0a',
            symbolColor: '#ffffff'
        }
    });

    win.webContents.on('did-finish-load', () => {
        console.log('Window finished loading');
    });

    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Window failed to load:', errorCode, errorDescription);
    });

    if (isDev) {
        win.loadURL('http://localhost:3000')
            .catch(e => {
                const filePath = path.join(__dirname, 'dist', 'index.html');
                win.loadFile(filePath);
            });
    } else {
        const filePath = path.join(__dirname, 'dist', 'index.html');
        console.log('Loading from file:', filePath);
        win.loadFile(filePath).catch(e => console.error('Failed to load file:', e));
    }
}

// --- IPC Handlers (Secure bridge between main and renderer) ---

// Clear all session data (cookies, localStorage, etc.) — used during logout
ipcMain.handle('clear-session-data', async () => {
    try {
        await session.defaultSession.clearStorageData();
        await session.defaultSession.clearCache();
        console.log('Session data cleared successfully.');
        return { success: true };
    } catch (err) {
        console.error('Failed to clear session data:', err);
        return { success: false, error: err.message };
    }
});

// Get app version
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Auto-launch at system startup
ipcMain.handle('get-auto-launch', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
});

ipcMain.handle('set-auto-launch', (event, enabled) => {
    try {
        app.setLoginItemSettings({
            openAtLogin: enabled,
            openAsHidden: true // Start minimized
        });
        return { success: true, enabled };
    } catch (err) {
        console.error('Failed to set auto-launch:', err);
        return { success: false, error: err.message };
    }
});

// Show native desktop notification
ipcMain.handle('show-notification', (event, { title, body }) => {
    const { Notification } = require('electron');
    if (Notification.isSupported()) {
        const notification = new Notification({
            title: title || 'Monty',
            body: body || '',
            icon: path.join(__dirname, 'public', 'icon.png'),
            silent: false
        });
        notification.on('click', () => {
            const win = BrowserWindow.getAllWindows()[0];
            if (win) {
                if (win.isMinimized()) win.restore();
                win.focus();
            }
        });
        notification.show();
        return { success: true };
    }
    return { success: false, error: 'Notifications not supported' };
});

// --- App Lifecycle ---

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
