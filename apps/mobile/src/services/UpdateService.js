import { Alert, Linking, Platform } from 'react-native';
import pkg from '../../package.json';

const GITHUB_REPO_OWNER = 'mrtuysal';
const GITHUB_REPO_NAME = 'Monty';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;
const FALLBACK_RELEASES_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;

const GITHUB_RAW_PACKAGE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/master/apps/mobile/package.json`;

/**
 * Checks GitHub Releases for a newer mobile release APK.
 * Falls back to raw package.json if GitHub Releases API is rate-limited or fails.
 * @param {boolean} silent - If true, doesn't show alert if app is already up to date or on network error
 */
export const checkForUpdates = async (silent = true) => {
    let remoteVersion = null;
    let downloadUrl = FALLBACK_RELEASES_URL;
    let releaseNotes = '';

    // Strategy 1: Try GitHub Releases API
    try {
        const response = await fetch(GITHUB_API_URL, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const release = await response.json();
            const rawTag = release.tag_name || '';
            remoteVersion = rawTag.replace(/^v/i, '').trim();
            releaseNotes = release.body || '';

            const apkAsset = (release.assets || []).find(a =>
                a.name && (a.name.endsWith('.apk') || a.name.includes('.apk'))
            );
            if (apkAsset?.browser_download_url) {
                downloadUrl = apkAsset.browser_download_url;
            } else if (remoteVersion) {
                downloadUrl = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/v${remoteVersion}/Monty-${remoteVersion}.apk`;
            }
        }
    } catch (e) {
        console.warn('GitHub API check failed, attempting raw fallback:', e);
    }

    // Strategy 2: If API was blocked or failed, query raw package.json
    if (!remoteVersion) {
        try {
            const rawRes = await fetch(`${GITHUB_RAW_PACKAGE_URL}?_t=${Date.now()}`);
            if (rawRes.ok) {
                const rawPkg = await rawRes.json();
                if (rawPkg.version) {
                    remoteVersion = rawPkg.version.trim();
                    downloadUrl = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/v${remoteVersion}/Monty-${remoteVersion}.apk`;
                    releaseNotes = `Monty v${remoteVersion} hazır! En güncel performans ve hata düzeltmelerini içerir.`;
                }
            }
        } catch (rawErr) {
            console.warn('Raw fallback check failed:', rawErr);
        }
    }

    // Evaluate result
    const localVersion = (pkg.version || '2.2.0').trim();

    if (remoteVersion) {
        if (isUpdateAvailable(localVersion, remoteVersion)) {
            showUpdateAlert(remoteVersion, downloadUrl, releaseNotes);
            return { hasUpdate: true, version: remoteVersion, downloadUrl };
        } else {
            if (!silent) {
                Alert.alert(
                    'Uygulama Güncel',
                    `Tebrikler! En son sürümü (v${localVersion}) kullanıyorsunuz.`
                );
            }
            return { hasUpdate: false, version: localVersion };
        }
    } else {
        if (!silent) {
            Alert.alert(
                'Bağlantı Hatası',
                'Güncelleme sunucusuna erişilemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.'
            );
        }
        return { hasUpdate: false, error: 'Could not contact update servers' };
    }
};

const showUpdateAlert = (newVersion, downloadUrl, releaseNotes) => {
    const notesSummary = releaseNotes
        ? `\n\nYenilikler:\n${releaseNotes.slice(0, 180)}${releaseNotes.length > 180 ? '...' : ''}`
        : '';

    Alert.alert(
        'Yeni Güncelleme Mevcut! 🚀',
        `Monty v${newVersion} yayınlandı (Mevcut: v${pkg.version}).${notesSummary}\n\nYeni özellikleri ve güvenlik iyileştirmelerini kullanmak için güncelleyin.`,
        [
            {
                text: 'Daha Sonra',
                style: 'cancel',
            },
            {
                text: 'Şimdi Güncelle (APK)',
                onPress: () => {
                    Linking.openURL(downloadUrl).catch(err => {
                        console.error('Failed to open download url:', err);
                        Linking.openURL(FALLBACK_RELEASES_URL);
                    });
                },
            },
        ],
        { cancelable: true }
    );
};

/**
 * Semver compare: returns true if remote > local
 */
export const isUpdateAvailable = (localStatus, remoteStatus) => {
    if (!remoteStatus) return false;
    const local = (localStatus || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
    const remote = (remoteStatus || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(local.length, remote.length); i++) {
        const l = local[i] || 0;
        const r = remote[i] || 0;
        if (r > l) return true;
        if (r < l) return false;
    }
    return false;
};
