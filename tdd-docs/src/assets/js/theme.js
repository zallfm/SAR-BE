/**
 * Theme Manager
 * Handles dark/light mode switching
 */

class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.init();
    }

    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    }

    getStoredTheme() {
        try {
            return localStorage.getItem('tdd-theme');
        } catch (e) {
            return null;
        }
    }

    setStoredTheme(theme) {
        try {
            localStorage.setItem('tdd-theme', theme);
        } catch (e) {
            console.warn('Could not save theme preference:', e);
        }
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.setStoredTheme(theme);
        this.updateToggleButton();
        this.updatePrismTheme(theme);
    }

    updateToggleButton() {
        const toggle = document.getElementById('themeToggle');
        if (!toggle) return;

        const icon = toggle.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = this.currentTheme === 'dark' ? '🌙' : '☀️';
        }

        toggle.setAttribute('aria-label', 
            `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode`
        );
    }

    updatePrismTheme(theme) {
        // Update Prism theme based on current theme
        const existingLink = document.querySelector('link[href*="prism"]');
        if (existingLink) {
            const newTheme = theme === 'dark' 
                ? 'prism-tomorrow.min.css' 
                : 'prism.min.css';
            
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/${newTheme}`;
            
            existingLink.parentNode.replaceChild(newLink, existingLink);
        }
    }

    toggle() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    init() {
        // Apply initial theme
        this.applyTheme(this.currentTheme);

        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
            try {
                mediaQuery.addEventListener('change', (e) => {
                    // Only auto-switch if user hasn't manually set a preference
                    const stored = this.getStoredTheme();
                    if (!stored) {
                        this.applyTheme(e.matches ? 'light' : 'dark');
                    }
                });
            } catch (e) {
                // Fallback for older browsers
                try {
                    mediaQuery.addListener((e) => {
                        const stored = this.getStoredTheme();
                        if (!stored) {
                            this.applyTheme(e.matches ? 'light' : 'dark');
                        }
                    });
                } catch (err) {
                    // Ignore if addListener is not available
                }
            }
        }

        // Setup toggle button
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.addEventListener('click', () => this.toggle());
        }
    }
}

// Apply theme immediately to prevent flash (before DOM is ready)
(function() {
    try {
        const storedTheme = localStorage.getItem('tdd-theme');
        const systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        const theme = storedTheme || systemTheme;
        if (document.documentElement) {
            document.documentElement.setAttribute('data-theme', theme);
        }
    } catch (e) {
        // Ignore if localStorage is not available
    }
})();

// Initialize theme manager when DOM is ready
let themeManager = null;

function initTheme() {
    if (!themeManager) {
        themeManager = new ThemeManager();
        if (typeof window !== 'undefined') {
            window.themeManager = themeManager;
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}

export default ThemeManager;
