// Theme Manager
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('selectedTheme') || 'light';
        this.themes = [];
        this.init();
    }

    async init() {
        try {
            const response = await fetch('/api/themes');
            this.themes = await response.json();
            this.applyTheme(this.currentTheme);
            this.setupThemeSelector();
        } catch (error) {
            console.error('Error loading themes:', error);
        }
    }

    applyTheme(themeId) {
        const theme = this.themes.find(t => t.id === themeId);
        if (!theme) return;

        // Apply CSS variables
        const root = document.documentElement;
        root.style.setProperty('--color-primary', theme.primary);
        root.style.setProperty('--color-secondary', theme.secondary);
        root.style.setProperty('--color-accent', theme.accent);
        root.style.setProperty('--color-text', theme.text);
        root.style.setProperty('--color-background', theme.background);
        root.style.setProperty('--color-success', theme.success);
        root.style.setProperty('--color-error', theme.error);
        root.style.setProperty('--color-warn', theme.warn);

        this.currentTheme = themeId;
        localStorage.setItem('selectedTheme', themeId);

        // Update selector if it exists
        const selector = document.getElementById('themeSelector');
        if (selector) {
            selector.value = themeId;
        }
    }

    setupThemeSelector() {
        const selector = document.getElementById('themeSelector');
        if (!selector) return;

        // Populate options
        this.themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.id;
            option.textContent = theme.name;
            selector.appendChild(option);
        });

        // Set current theme
        selector.value = this.currentTheme;

        // Add event listener
        selector.addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
        });
    }
}

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ThemeManager();
    });
} else {
    new ThemeManager();
}
