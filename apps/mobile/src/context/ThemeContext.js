import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, getThemeById, DEFAULT_THEME_ID, Colors } from '../constants/Theme';

const THEME_STORAGE_KEY = '@monty_theme_id';

const ThemeContext = createContext({
    theme: getThemeById(DEFAULT_THEME_ID),
    themeId: DEFAULT_THEME_ID,
    isDark: true,
    colors: getThemeById(DEFAULT_THEME_ID).colors,
    setThemeId: () => {},
    toggleTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
    const [themeId, setThemeIdState] = useState(DEFAULT_THEME_ID);

    useEffect(() => {
        AsyncStorage.getItem(THEME_STORAGE_KEY)
            .then(saved => {
                if (saved && THEMES[saved]) {
                    setThemeIdState(saved);
                    Object.assign(Colors, THEMES[saved].colors);
                }
            })
            .catch(() => {});
    }, []);

    const setThemeId = async (newId) => {
        if (!THEMES[newId]) return;
        setThemeIdState(newId);
        Object.assign(Colors, THEMES[newId].colors);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newId);
        } catch (e) {
            console.warn('Failed to save theme to storage:', e);
        }
    };

    const toggleTheme = () => {
        setThemeId(themeId === 'light' ? 'dark' : 'light');
    };

    const activeTheme = getThemeById(themeId);

    return (
        <ThemeContext.Provider value={{
            theme: activeTheme,
            themeId,
            isDark: activeTheme.isDark,
            colors: activeTheme.colors,
            setThemeId,
            toggleTheme
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
