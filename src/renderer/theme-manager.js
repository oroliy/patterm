const { ipcRenderer } = require('electron');

class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'system';
        this.systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)');

        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);

        // Listen for system changes
        this.systemDarkMode.addEventListener('change', (e) => {
            if (this.currentTheme === 'system') {
                this.applyTheme('system');
            }
        });

        // Expose to window for UI interaction
        window.themeManager = this;

        // Listen for Menu commands
        ipcRenderer.on('theme:set', (event, theme) => {
            this.setTheme(theme);
        });
    }

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme(theme);
    }

    applyTheme(theme) {
        let effectiveTheme = theme;

        if (theme === 'system') {
            effectiveTheme = this.systemDarkMode.matches ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', effectiveTheme);

        // Notify main process to sync other windows/views
        try {
            ipcRenderer.invoke('theme:changed', effectiveTheme);
        } catch (e) {
            console.warn('IPC unavailable (likely in test mode)');
        }

        console.log(`Theme set to: ${theme} (Effective: ${effectiveTheme})`);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
});

if (typeof module !== 'undefined') {
    module.exports = ThemeManager;
}
