import { Alert, Linking, Platform } from 'react-native';
import pkg from '../../package.json';

const GITHUB_REPO_OWNER = 'mrtuysal';
const GITHUB_REPO_NAME = 'Monty';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;
const FALLBACK_RELEASES_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;

/**
 * Checks GitHub Releases for a newer mobile release APK
 * @param {boolean} silent - If true, doesn't show alert if app is already up to date or on network error
 */
export const checkForUpdates = async (silent = true) => {
    try {
        const response = await fetch(GITHUB_API_URL, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Monty-Mobile-App'
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API HTTP ${response.status}`);
        }

        const release = await response.json();
        const rawTag = release.tag_name || '';
        const remoteVersion = rawTag.replace(/^v/i, '').trim();
        const localVersion = (pkg.version || '2.2.0').trim();

        // Find APK asset if uploaded to release
        const apkAsset = (release.assets || []).find(a =>
            a.name && (a.name.endsWith('.apk') || a.name.includes('.apk'))
        );
        const downloadUrl = apkAsset?.browser_download_url || release.html_url || FALLBACK_RELEASES_URL;

        if (isUpdateAvailable(localVersion, remoteVersion)) {
            showUpdateAlert(remoteVersion, downloadUrl, release.body);
            return { hasUpdate: true, version: remoteVersion, downloadUrl };
        } else {
            if (!silent) {
                Alert.alert(
                    'Uygulama Güncel',
                    `En son sürümü (v${localVersion}) kullanıyorsunuz.`
                );
            }
            return { hasUpdate: false, version: localVersion };
        }
    } catch (error) {
        console.warn('Update check failed:', error);
        if (!silent) {
            Alert.alert(
                'Kontrol Edilemedi',
                'Güncelleme kontrolü sırasında bir sorun oluştu. İnternet bağlantınızı kontrol edip tekrar deneyin.'
            );
        }
        return { hasUpdate: false, error };
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
