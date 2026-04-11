import { Alert, Linking, Platform } from 'react-native';
// We read the local version from package.json
import pkg from '../../package.json';

// GitHub Repository Raw URL for package.json
// Replace with your actual username/repo if different
const GITHUB_PACKAGE_JSON_URL = 'https://raw.githubusercontent.com/mrtuysal/Monty/main/apps/mobile/package.json';

// Where the user can download the latest APK (Releases page)
const APK_DOWNLOAD_URL = 'https://github.com/mrtuysal/Monty/releases/latest';

export const checkForUpdates = async (silent = true) => {
    try {
        // Fetch the remote package.json from GitHub
        const response = await fetch(GITHUB_PACKAGE_JSON_URL + '?t=' + new Date().getTime()); // Add timestamp to prevent caching

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const remotePkg = await response.json();
        const remoteVersion = remotePkg.version;
        const localVersion = pkg.version;

        // Compare versions (simple logic: if not equal and remote > local)
        if (isUpdateAvailable(localVersion, remoteVersion)) {
            showUpdateAlert(remoteVersion);
            return { hasUpdate: true, version: remoteVersion };
        } else {
            if (!silent) {
                Alert.alert('Zaten Güncel', 'Uygulamanın en son sürümünü kullanıyorsunuz.');
            }
            return { hasUpdate: false };
        }
    } catch (error) {
        console.error('Update check failed:', error);
        if (!silent) {
            Alert.alert('Hata', 'Güncelleme kontrolü yapılamadı. Lütfen internet bağlantınızı kontrol edin.');
        }
        return { hasUpdate: false, error };
    }
};

const showUpdateAlert = (newVersion) => {
    Alert.alert(
        'Yeni Güncelleme Mevcut!',
        `Monty v${newVersion} versiyonu yayınlandı.\n\nYeni özellikleri kullanabilmek için lütfen uygulamanızı güncelleyin.`,
        [
            {
                text: 'İptal',
                style: 'cancel',
            },
            {
                text: 'Şimdi İndir',
                onPress: () => {
                    // Open the GitHub releases page in the default browser
                    Linking.openURL(APK_DOWNLOAD_URL).catch(err =>
                        console.error('An error occurred trying to open the URL', err)
                    );
                },
            },
        ],
        { cancelable: false }
    );
};

// Helper to compare semver versions (e.g. 1.0.1 vs 1.1.0)
const isUpdateAvailable = (localStatus, remoteStatus) => {
    const local = localStatus.split('.').map(Number);
    const remote = remoteStatus.split('.').map(Number);

    for (let i = 0; i < Math.max(local.length, remote.length); i++) {
        const l = local[i] || 0;
        const r = remote[i] || 0;
        if (r > l) return true;
        if (r < l) return false;
    }
    return false; // They are equal
};
