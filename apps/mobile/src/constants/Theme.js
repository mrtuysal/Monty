export const THEMES = {
    dark: {
        id: 'dark',
        name: 'Koyu Tema',
        subtitle: 'Obsidian siyahı ve neon zümrüt vurgusu',
        isDark: true,
        preview: ['#09090B', '#141417', '#22C55E', '#FAFAFA'],
        colors: {
            background: '#09090B',
            surface: '#141417',
            surfaceHigh: '#1C1C21',
            surfaceHighest: '#2A2A2C',
            primary: '#22C55E',
            primaryContainer: 'rgba(34, 197, 94, 0.15)',
            secondary: '#E8F54A',
            secondaryFixed: '#DFEC42',
            success: '#22C55E',
            warning: '#F59E0B',
            error: '#EF4444',
            text: '#FAFAFA',
            textSecondary: '#A1A1AA',
            textMuted: '#71717A',
            border: 'rgba(255, 255, 255, 0.08)',
            borderStrong: 'rgba(255, 255, 255, 0.16)',
            cardGradientStart: '#141417',
            cardGradientEnd: '#09090B',
            glass: 'rgba(20, 20, 23, 0.85)'
        }
    },
    light: {
        id: 'light',
        name: 'Aydınlık Tema',
        subtitle: 'Ferah saf beyaz ve temiz zümrüt yeşili',
        isDark: false,
        preview: ['#F8FAFC', '#FFFFFF', '#16A34A', '#0F172A'],
        colors: {
            background: '#F8FAFC',
            surface: '#FFFFFF',
            surfaceHigh: '#F1F5F9',
            surfaceHighest: '#E2E8F0',
            primary: '#16A34A',
            primaryContainer: 'rgba(22, 163, 74, 0.12)',
            secondary: '#0284C7',
            secondaryFixed: '#E0F2FE',
            success: '#16A34A',
            warning: '#D97706',
            error: '#DC2626',
            text: '#0F172A',
            textSecondary: '#475569',
            textMuted: '#94A3B8',
            border: '#E2E8F0',
            borderStrong: '#CBD5E1',
            cardGradientStart: '#FFFFFF',
            cardGradientEnd: '#F8FAFC',
            glass: 'rgba(255, 255, 255, 0.95)'
        }
    },
    emerald: {
        id: 'emerald',
        name: 'Zümrüt Doğa',
        subtitle: 'Derin orman yeşili ve organik bereket tonları',
        isDark: true,
        preview: ['#0B1310', '#162520', '#10B981', '#F0FDF4'],
        colors: {
            background: '#0B1310',
            surface: '#162520',
            surfaceHigh: '#1E332C',
            surfaceHighest: '#243E35',
            primary: '#10B981',
            primaryContainer: 'rgba(16, 185, 129, 0.15)',
            secondary: '#F59E0B',
            secondaryFixed: '#FDE68A',
            success: '#10B981',
            warning: '#F59E0B',
            error: '#EF4444',
            text: '#F0FDF4',
            textSecondary: '#86A397',
            textMuted: '#5E7A70',
            border: '#1E382D',
            borderStrong: '#2E5544',
            cardGradientStart: '#162520',
            cardGradientEnd: '#0B1310',
            glass: 'rgba(22, 37, 32, 0.85)'
        }
    },
    ocean: {
        id: 'ocean',
        name: 'Okyanus Derinliği',
        subtitle: 'Pasifik mavisi ve turkuaz deniz esintisi',
        isDark: true,
        preview: ['#07131E', '#10263A', '#0EA5E9', '#F0F9FF'],
        colors: {
            background: '#07131E',
            surface: '#10263A',
            surfaceHigh: '#183854',
            surfaceHighest: '#224D73',
            primary: '#0EA5E9',
            primaryContainer: 'rgba(14, 165, 233, 0.15)',
            secondary: '#06B6D4',
            secondaryFixed: '#CFFAFE',
            success: '#10B981',
            warning: '#F59E0B',
            error: '#EF4444',
            text: '#F0F9FF',
            textSecondary: '#7DD3FC',
            textMuted: '#38BDF8',
            border: '#193A56',
            borderStrong: '#2B5880',
            cardGradientStart: '#10263A',
            cardGradientEnd: '#07131E',
            glass: 'rgba(16, 38, 58, 0.85)'
        }
    }
};

export const DEFAULT_THEME_ID = 'dark';

export const getThemeById = (id) => {
    return THEMES[id] || THEMES[DEFAULT_THEME_ID];
};

// Default initial colors
export const Colors = { ...THEMES[DEFAULT_THEME_ID].colors };

export const Typography = {
    h1: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    h2: { fontSize: 20, fontWeight: '600', letterSpacing: -0.3 },
    body: { fontSize: 14 },
    caption: { fontSize: 11 }
};

export const Layout = {
    screenPadding: 16,
    borderRadius: 16
};
