export function getEffectiveTheme(savedTheme) {
    if (savedTheme === 'system' || !savedTheme) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return savedTheme;
}

export function applyTheme(theme) {
    const effectiveTheme = getEffectiveTheme(theme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);
}

export function cycleTheme(currentTheme) {
    const themes = ['system', 'dark', 'light'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    return themes[nextIndex];
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
