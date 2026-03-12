const { app, BrowserWindow, ipcMain, session, Notification } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const isDev = !app.isPackaged;

// Disable Hardware Acceleration to prevent cache/GPU errors
app.disableHardwareAcceleration();
console.log('Hardware Acceleration disabled.');

// ═══════════════════════════════════════════
//  Auto-Updater Configuration
// ═══════════════════════════════════════════

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = console;

let mainWindow = null;
let updateAvailable = false;
let updateDownloaded = false;
let updateInfo = null;

function setupAutoUpdater() {
    if (isDev) {
        console.log('Skipping auto-updater in dev mode.');
        return;
    }

    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...');
        sendUpdateStatus('checking');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
        updateAvailable = true;
        updateInfo = info;
        sendUpdateStatus('available', info);

        // Show system notification
        if (Notification.isSupported()) {
            const notif = new Notification({
                title: '🔄 Güncelleme Mevcut',
                body: `Monty v${info.version} indiriliyor...`,
                silent: false
            });
            notif.show();
        }
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('App is up to date. Version:', info.version);
        sendUpdateStatus('up-to-date', info);
    });

    autoUpdater.on('download-progress', (progress) => {
        const percent = Math.round(progress.percent);
        console.log(`Download progress: ${percent}%`);
        sendUpdateStatus('downloading', { percent, bytesPerSecond: progress.bytesPerSecond });
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info.version);
        updateDownloaded = true;
        updateInfo = info;
        sendUpdateStatus('downloaded', info);

        // Show system notification
        if (Notification.isSupported()) {
            const notif = new Notification({
                title: '✅ Güncelleme Hazır',
                body: `Monty v${info.version} yüklendi. Uygulamayı yeniden başlatarak güncellemeyi tamamlayın.`,
                silent: false
            });
            notif.on('click', () => {
                autoUpdater.quitAndInstall(false, true);
            });
            notif.show();
        }
    });

    autoUpdater.on('error', (err) => {
        console.error('Auto-updater error:', err);
        sendUpdateStatus('error', { message: err.message });
    });

    // Check for updates every 30 minutes
    autoUpdater.checkForUpdates().catch(err => {
        console.error('Initial update check failed:', err.message);
    });

    setInterval(() => {
        autoUpdater.checkForUpdates().catch(() => { });
    }, 30 * 60 * 1000);
}

function sendUpdateStatus(status, data = null) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-status', { status, data });
    }
}

// ═══════════════════════════════════════════
//  Window Creation
// ═══════════════════════════════════════════

function createWindow() {
    console.log('Creating window...');
    mainWindow = new BrowserWindow({
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

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Window finished loading');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Window failed to load:', errorCode, errorDescription);
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:3001')
            .catch(e => {
                mainWindow.loadURL('http://localhost:3000')
                    .catch(e2 => {
                        const filePath = path.join(__dirname, '..', 'dist', 'index.html');
                        mainWindow.loadFile(filePath);
                    });
            });
    } else {
        const filePath = path.join(process.resourcesPath, 'dist', 'index.html');
        console.log('Loading from file:', filePath);
        mainWindow.loadFile(filePath).catch(e => console.error('Failed to load file:', e));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ═══════════════════════════════════════════
//  IPC Handlers
// ═══════════════════════════════════════════

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

// OAuth Window Handler (Solves Google block & white screen issues)
ipcMain.handle('open-auth-window', async (event, url) => {
    return new Promise((resolve) => {
        let authWindow = new BrowserWindow({
            width: 500,
            height: 700,
            show: false, // Don't show immediately to prevent white flash
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        // Spoof standard browser User-Agent to bypass Google/Apple's embedded browser blocks
        const customUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        authWindow.webContents.setUserAgent(customUA);

        authWindow.loadURL(url);

        authWindow.on('ready-to-show', () => {
            authWindow.show();
        });

        const checkRedirect = (newUrl) => {
            // Check if the URL contains Supabase auth tokens
            if (newUrl.includes('access_token=') || newUrl.includes('provider_token=')) {
                resolve(newUrl);
                authWindow.close();
            }
        };

        authWindow.webContents.on('will-redirect', (e, newUrl) => checkRedirect(newUrl));
        authWindow.webContents.on('did-redirect-navigation', (e, newUrl) => checkRedirect(newUrl));

        // Periodically check the current URL (in case redirects aren't caught)
        const checkInterval = setInterval(() => {
            if (!authWindow || authWindow.isDestroyed()) {
                clearInterval(checkInterval);
                return;
            }
            try {
                const currentUrl = authWindow.webContents.getURL();
                checkRedirect(currentUrl);
            } catch (err) { }
        }, 500);

        authWindow.on('closed', () => {
            clearInterval(checkInterval);
            resolve(null); // User manually closed the window
        });
    });
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
    if (Notification.isSupported()) {
        const notification = new Notification({
            title: title || 'Monty',
            body: body || '',
            silent: false
        });
        notification.on('click', () => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });
        notification.show();
        return { success: true };
    }
    return { success: false, error: 'Notifications not supported' };
});

// ── Update IPC Handlers ──
ipcMain.handle('check-for-updates', async () => {
    if (isDev) return { status: 'dev-mode' };
    try {
        const result = await autoUpdater.checkForUpdates();
        return { status: 'checking', version: result?.updateInfo?.version };
    } catch (err) {
        return { status: 'error', message: err.message };
    }
});

ipcMain.handle('get-update-status', () => {
    return {
        updateAvailable,
        updateDownloaded,
        version: updateInfo?.version || null,
        releaseNotes: updateInfo?.releaseNotes || null,
    };
});

ipcMain.handle('install-update', () => {
    if (updateDownloaded) {
        autoUpdater.quitAndInstall(false, true);
        return { success: true };
    }
    return { success: false, error: 'No update downloaded' };
});

// ═══════════════════════════════════════════
//  App Lifecycle
// ═══════════════════════════════════════════

app.whenReady().then(() => {
    createWindow();

    // Start auto-updater
    setupAutoUpdater();

    // Enable auto-launch by default when running as packaged app
    if (!isDev) {
        const settings = app.getLoginItemSettings();
        if (!settings.openAtLogin) {
            app.setLoginItemSettings({
                openAtLogin: true,
                openAsHidden: true
            });
            console.log('Auto-launch enabled on first run.');
        }
    }
});

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
