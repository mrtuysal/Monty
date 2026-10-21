/**
 * Monty Renk Paleti ve Tema Yönetimi Servisi
 * Tema Değişkenleri ve Canlı Uygulama
 */

export const THEMES = [
    {
        id: 'light-pure',
        name: 'Aydınlık (Ferah Beyaz & Zümrüt)',
        subtitle: 'Göz yormayan ferah beyaz, temiz arayüz ve zümrüt yeşili vurgusu',
        isLight: true,
        preview: ['#ffffff', '#f1f5f9', '#10b981', '#0f172a'],
        vars: {
            '--bg-primary': '#F8FAFC',
            '--bg-secondary': '#FFFFFF',
            '--bg-card': '#FFFFFF',
            '--bg-card-hover': '#F1F5F9',
            '--surface-high': '#F8FAFC',
            '--surface-highest': '#E2E8F0',
            '--primary': '#10B981',
            '--primary-glow': 'rgba(16, 185, 129, 0.25)',
            '--secondary': '#0284C7',
            '--text-main': '#0F172A',
            '--text-muted': '#64748B',
            '--text-dim': '#94A3B8',
            '--border': '#E2E8F0',
            '--border-strong': '#CBD5E1',
            '--shadow-glow': '0 4px 20px rgba(0, 0, 0, 0.06)'
        }
    },
    {
        id: 'light-warm',
        name: 'Aydınlık (Sıcak Fildişi)',
        subtitle: 'Hafif sıcak kağıt tonları, amber altın dokunuşları ve yumuşak kontrast',
        isLight: true,
        preview: ['#faf7f2', '#f3efe8', '#f59e0b', '#262320'],
        vars: {
            '--bg-primary': '#FDFBF7',
            '--bg-secondary': '#F5F1E9',
            '--bg-card': '#FFFFFF',
            '--bg-card-hover': '#FAF7F2',
            '--surface-high': '#F5F1E9',
            '--surface-highest': '#EBE4D8',
            '--primary': '#D97706',
            '--primary-glow': 'rgba(217, 119, 6, 0.25)',
            '--secondary': '#10B981',
            '--text-main': '#1C1917',
            '--text-muted': '#78716C',
            '--text-dim': '#A8A29E',
            '--border': '#E7E0D3',
            '--border-strong': '#D6CEBF',
            '--shadow-glow': '0 4px 20px rgba(0, 0, 0, 0.05)'
        }
    },
    {
        id: 'emerald',
        name: 'Monty Doğa (Zümrüt)',
        subtitle: 'Büyüme, bereket ve organik yeşil tonları (Yeni Logo ile uyumlu)',
        isLight: false,
        preview: ['#10b981', '#f59e0b', '#0b1310', '#162520'],
        vars: {
            '--bg-primary': '#0b1310',
            '--bg-secondary': '#111c18',
            '--bg-card': '#162520',
            '--bg-card-hover': '#1e332c',
            '--primary': '#10b981',
            '--primary-glow': 'rgba(16, 185, 129, 0.4)',
            '--secondary': '#f59e0b',
            '--text-main': '#f0fdf4',
            '--text-muted': '#86a397',
            '--border': '#1e382d',
            '--shadow-glow': '0 0 30px rgba(16, 185, 129, 0.3)'
        }
    },
    {
        id: 'cosmic',
        name: 'Kozmik Gece (Neon Mor)',
        subtitle: 'Fütüristik neon mor, elektrik mavisi ve derin uzay siyahı',
        preview: ['#6c63ff', '#00f2fe', '#0d0f18', '#1a1e33'],
        vars: {
            '--bg-primary': '#0d0f18',
            '--bg-secondary': '#131625',
            '--bg-card': '#1a1e33',
            '--bg-card-hover': '#242a47',
            '--primary': '#6c63ff',
            '--primary-glow': 'rgba(108, 99, 255, 0.4)',
            '--secondary': '#ec4899',
            '--text-main': '#f8fafc',
            '--text-muted': '#94a3b8',
            '--border': '#292e4d',
            '--shadow-glow': '0 0 30px rgba(108, 99, 255, 0.35)'
        }
    },
    {
        id: 'ocean',
        name: 'Okyanus Derinliği (Pasifik)',
        subtitle: 'Sakinleştirici akuamarin, camgöbeği ve derin deniz mavisi',
        preview: ['#0ea5e9', '#06b6d4', '#07131e', '#10263a'],
        vars: {
            '--bg-primary': '#07131e',
            '--bg-secondary': '#0b1c2b',
            '--bg-card': '#10263a',
            '--bg-card-hover': '#183854',
            '--primary': '#0ea5e9',
            '--primary-glow': 'rgba(14, 165, 233, 0.4)',
            '--secondary': '#06b6d4',
            '--text-main': '#f0f9ff',
            '--text-muted': '#7dd3fc',
            '--border': '#193a56',
            '--shadow-glow': '0 0 30px rgba(14, 165, 233, 0.35)'
        }
    },
    {
        id: 'sunset',
        name: 'Gün Batımı (Sıcak Amber)',
        subtitle: 'Enerjik mercan kırmızısı, sıcak mandalina ve kömür pembesi',
        preview: ['#f43f5e', '#fb923c', '#160d10', '#2d1a20'],
        vars: {
            '--bg-primary': '#160d10',
            '--bg-secondary': '#211317',
            '--bg-card': '#2d1a20',
            '--bg-card-hover': '#3d242c',
            '--primary': '#f43f5e',
            '--primary-glow': 'rgba(244, 63, 94, 0.4)',
            '--secondary': '#fb923c',
            '--text-main': '#fff1f2',
            '--text-muted': '#fda4af',
            '--border': '#4c2833',
            '--shadow-glow': '0 0 30px rgba(244, 63, 94, 0.35)'
        }
    },
    {
        id: 'monochrome',
        name: 'Karbon Titanyum (Cyber Slate)',
        subtitle: 'Minimalist titanyum gri, buz mavisi ve yüksek kontrastlı saf beyaz',
        preview: ['#38bdf8', '#e2e8f0', '#09090b', '#18181b'],
        vars: {
            '--bg-primary': '#09090b',
            '--bg-secondary': '#121215',
            '--bg-card': '#18181b',
            '--bg-card-hover': '#232328',
            '--primary': '#38bdf8',
            '--primary-glow': 'rgba(56, 189, 248, 0.35)',
            '--secondary': '#e2e8f0',
            '--text-main': '#ffffff',
            '--text-muted': '#a1a1aa',
            '--border': '#27272a',
            '--shadow-glow': '0 0 30px rgba(56, 189, 248, 0.3)'
        }
    }
];

const STORAGE_KEY = 'monty_active_theme';

export function getSavedTheme() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && THEMES.some(t => t.id === saved)) {
            return saved;
        }
    } catch (e) {
        // localStorage unavailable
    }
    return 'emerald'; // Varsayılan olarak yeni logoyla uyumlu zümrüt yeşili
}

export function applyTheme(themeId) {
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    const root = document.documentElement;

    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-theme-mode', theme.isLight ? 'light' : 'dark');

    Object.entries(theme.vars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });

    try {
        localStorage.setItem(STORAGE_KEY, theme.id);
    } catch (e) {
        // storage save failed
    }

    return theme;
}

// Uygulama yüklenirken hemen kayıtlı temayı uygula
if (typeof window !== 'undefined') {
    applyTheme(getSavedTheme());
}
