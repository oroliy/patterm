import { THEME_VARIANTS } from './constants.js';

export function getEffectiveTheme(savedTheme) {
    if (savedTheme === 'system' || !savedTheme) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return savedTheme;
}

export function getThemeVariant(variant) {
    return THEME_VARIANTS.find((item) => item.value === variant)?.value || 'default';
}

export function applyTheme(theme, variant = 'default') {
    const effectiveTheme = getEffectiveTheme(theme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.setAttribute('data-theme-variant', getThemeVariant(variant));
}

export function cycleTheme(currentTheme) {
    const themes = ['system', 'dark', 'light'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    return themes[nextIndex];
}

export function cycleThemeVariant(currentVariant) {
    const currentIndex = THEME_VARIANTS.findIndex((item) => item.value === currentVariant);
    const nextIndex = (currentIndex + 1 + THEME_VARIANTS.length) % THEME_VARIANTS.length;
    return THEME_VARIANTS[nextIndex].value;
}

export function saveTheme(theme) {
    try {
        localStorage.setItem('patterm-theme', theme);
        return true;
    } catch (error) {
        console.error('Failed to save theme:', error);
        return false;
    }
}

export function loadTheme() {
    try {
        return localStorage.getItem('patterm-theme') || 'system';
    } catch (error) {
        console.error('Failed to load theme:', error);
        return 'system';
    }
}

export function saveThemeVariant(themeVariant) {
    try {
        localStorage.setItem('patterm-theme-variant', getThemeVariant(themeVariant));
        return true;
    } catch (error) {
        console.error('Failed to save theme variant:', error);
        return false;
    }
}

export function loadThemeVariant() {
    try {
        return getThemeVariant(localStorage.getItem('patterm-theme-variant') || 'default');
    } catch (error) {
        console.error('Failed to load theme variant:', error);
        return 'default';
    }
}
