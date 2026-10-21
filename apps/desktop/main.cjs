const { app, BrowserWindow, ipcMain, session, Notification, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');

const isDev = !app.isPackaged;

// Disable Hardware Acceleration to prevent cache/GPU errors
app.disableHardwareAcceleration();
console.log('Hardware Acceleration disabled.');

// Global unhandled error protection
process.on('uncaughtException', (err) => {
    console.error('Unhandled Exception in main process:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection in main process:', reason);
});

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
        icon: path.join(__dirname, 'build', 'icon.ico'),
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
                        const filePath = path.join(__dirname, 'dist', 'index.html');
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

// ═══════════════════════════════════════════
//  OAuth Loopback Server (Secure Browser Login)
// ═══════════════════════════════════════════
let activeOAuthServer = null;
let activeOAuthTimeout = null;

function cleanupOAuthServer() {
    if (activeOAuthTimeout) {
        clearTimeout(activeOAuthTimeout);
        activeOAuthTimeout = null;
    }
    if (activeOAuthServer) {
        try {
            activeOAuthServer.close();
        } catch (e) { }
        activeOAuthServer = null;
    }
}

// ═══════════════════════════════════════════
//  OAuth Loopback Server (Secure Browser Login)
// ═══════════════════════════════════════════
let activeOAuthServer = null;
let activeOAuthTimeout = null;

function cleanupOAuthServer() {
    if (activeOAuthTimeout) {
        clearTimeout(activeOAuthTimeout);
        activeOAuthTimeout = null;
    }
    if (activeOAuthServer) {
        try {
            activeOAuthServer.close();
        } catch (e) { }
        activeOAuthServer = null;
    }
}

ipcMain.handle('prepare-oauth', async () => {
    cleanupOAuthServer();

    return new Promise((resolve, reject) => {
        const createServer = (port) => {
            const server = http.createServer((req, res) => {
                try {
                    const parsedUrl = new URL(req.url, 'http://127.0.0.1');

                    // Ignore favicon requests
                    if (parsedUrl.pathname === '/favicon.ico') {
                        res.writeHead(204);
                        res.end();
                        return;
                    }

                    if (parsedUrl.pathname === '/auth/callback') {
                        // Serve callback landing page that extracts hash and POSTs back to /callback-complete
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>Monty - Giriş Başarılı</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      max-width: 420px;
      width: 100%;
    }
    .icon {
      font-size: 52px;
      margin-bottom: 20px;
      display: inline-block;
      animation: pop 0.4s ease-out;
    }
    h2 { margin: 0 0 10px 0; color: #22c55e; font-size: 22px; font-weight: 700; }
    p { margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.6; }
    .badge {
      display: inline-block;
      margin-top: 20px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(34, 197, 94, 0.1);
      color: #4ade80;
      font-size: 12px;
      font-weight: 600;
    }
    @keyframes pop {
      0% { transform: scale(0.6); opacity: 0; }
      80% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🌿</div>
    <h2>Giriş Başarılı!</h2>
    <p>Hesabınız doğrulandı. Monty masaüstü uygulamasına otomatik olarak aktarılıyorsunuz.</p>
    <div class="badge">Bu sekmeyi güvenle kapatabilirsiniz</div>
  </div>
  <script>
    const hash = window.location.hash.substring(1);
    const search = window.location.search.substring(1);
    const params = new URLSearchParams(hash || search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');
    const error = params.get('error_description') || params.get('error');

    fetch('/callback-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, refreshToken, code, error })
    }).finally(() => {
      setTimeout(() => {
        try { window.close(); } catch(e){}
      }, 1500);
    });
  </script>
</body>
</html>`);
                    } else if (parsedUrl.pathname === '/callback-complete' && req.method === 'POST') {
                        let body = '';
                        req.on('data', chunk => body += chunk);
                        req.on('end', () => {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true }));

                            try {
                                const data = JSON.parse(body || '{}');
                                if (activeOAuthServer && activeOAuthServer.onAuthComplete) {
                                    activeOAuthServer.onAuthComplete(data);
                                }
                            } catch (e) {
                                if (activeOAuthServer && activeOAuthServer.onAuthComplete) {
                                    activeOAuthServer.onAuthComplete({ error: 'Payload parse failed' });
                                }
                            }
                        });
                    } else {
                        res.writeHead(404);
                        res.end('Not Found');
                    }
                } catch (requestErr) {
                    console.error('OAuth server request error:', requestErr);
                    try {
                        res.writeHead(500);
                        res.end('Server Error');
                    } catch (e) { }
                }
            });

            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE' && port !== 0) {
                    console.log(`Port ${port} in use, trying random port...`);
                    createServer(0);
                } else {
                    reject(err);
                }
            });

            server.listen(port, '127.0.0.1', () => {
                const assignedPort = server.address() ? server.address().port : port;
                console.log(`OAuth loopback server listening on 127.0.0.1:${assignedPort}`);
                activeOAuthServer = server;
                resolve({ port: assignedPort });
            });
        };

        createServer(54321);
    });
});

ipcMain.handle('wait-for-oauth', async (event, url) => {
    if (!activeOAuthServer) {
        throw new Error('OAuth loopback server is not active');
    }

    return new Promise((resolve) => {
        let isResolved = false;

        const complete = (data) => {
            if (isResolved) return;
            isResolved = true;

            // Allow 3 seconds for browser to receive responses before closing server
            setTimeout(() => {
                cleanupOAuthServer();
            }, 3000);

            if (mainWindow && !mainWindow.isDestroyed()) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
            }

            resolve(data);
        };

        activeOAuthServer.onAuthComplete = complete;

        activeOAuthTimeout = setTimeout(() => {
            complete({ error: 'Giriş işlemi zaman aşımına uğradı.' });
        }, 3 * 60 * 1000);

        console.log('Opening OAuth URL in user default browser:', url);
        shell.openExternal(url).catch(err => {
            console.error('Failed to open external browser:', err);
            complete({ error: 'Tarayıcı açılamadı: ' + err.message });
        });
    });
});

ipcMain.handle('cancel-oauth', () => {
    cleanupOAuthServer();
    return { success: true };
});

// Legacy OAuth Window Handler fallback
ipcMain.handle('open-auth-window', async (event, url) => {
    return new Promise((resolve) => {
        let authWindow = new BrowserWindow({
            width: 500,
            height: 700,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        const customUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        authWindow.webContents.setUserAgent(customUA);

        authWindow.loadURL(url);

        authWindow.on('ready-to-show', () => {
            authWindow.show();
        });

        const checkRedirect = (newUrl) => {
            if (newUrl.includes('access_token=') || newUrl.includes('provider_token=')) {
                resolve(newUrl);
                authWindow.close();
            }
        };

        authWindow.webContents.on('will-redirect', (e, newUrl) => checkRedirect(newUrl));
        authWindow.webContents.on('did-redirect-navigation', (e, newUrl) => checkRedirect(newUrl));

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
            resolve(null);
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

// TCMB Daily Currency Rates (Efektif Satış / Banknote Selling)
ipcMain.handle('get-currency-rates', async () => {
    try {
        const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml');
        if (!response.ok) throw new Error(`TCMB HTTP error: ${response.status}`);
        const xmlText = await response.text();

        const currencies = ['USD', 'EUR', 'GBP'];
        const rates = { TRY: 1 };

        for (const code of currencies) {
            // Priority 1: BanknoteSelling (Efektif Satış)
            const bRe = new RegExp(`<Currency[^>]+Kod="${code}"[\\s\\S]*?<BanknoteSelling>([^<]*)<`, 'i');
            const bMatch = xmlText.match(bRe);
            let val = bMatch && bMatch[1] ? parseFloat(bMatch[1].replace(',', '.')) : null;

            // Priority 2: ForexSelling (Döviz Satış - fallback)
            if (!val) {
                const fRe = new RegExp(`<Currency[^>]+Kod="${code}"[\\s\\S]*?<ForexSelling>([^<]*)<`, 'i');
                const fMatch = xmlText.match(fRe);
                val = fMatch && fMatch[1] ? parseFloat(fMatch[1].replace(',', '.')) : null;
            }

            if (val && !isNaN(val)) {
                rates[code] = val;
            }
        }

        return { success: true, rates, fetchedAt: new Date().toISOString() };
    } catch (err) {
        console.error('TCMB rates fetch error in main:', err);
        return { success: false, error: err.message };
    }
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
