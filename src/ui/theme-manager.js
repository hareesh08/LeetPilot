// LeetPilot Theme Manager
// Manages UI themes and styling for different LeetCode themes

/**
 * Theme Manager
 * Manages UI themes and styling for different LeetCode themes
 */
export class ThemeManager {
  constructor() {
    this.currentTheme = 'auto';
    this.styleElement = null;
    this.observers = [];
    
    this.themes = {
      dark: {
        name: 'Dark',
        colors: {
          background: '#1e1e1e',
          surface: '#2d2d30',
          border: '#3c3c3c',
          text: '#d4d4d4',
          textSecondary: '#cccccc',
          accent: '#0e4f88',
          accentHover: '#1f6391',
          success: '#28a745',
          error: '#dc3545',
          warning: '#ffc107'
        }
      },
      light: {
        name: 'Light',
        colors: {
          background: '#ffffff',
          surface: '#f6f8fa',
          border: '#e1e4e8',
          text: '#24292e',
          textSecondary: '#586069',
          accent: '#0366d6',
          accentHover: '#0256cc',
          success: '#28a745',
          error: '#d73a49',
          warning: '#f66a0a'
        }
      }
    };
    
    this.initialize();
  }

  /**
   * Initialize theme manager
   */
  initialize() {
    this.detectCurrentTheme();
    this.createStyleElement();
    this.applyTheme();
    this.setupThemeObserver();
  }

  /**
   * Detect current LeetCode theme
   */
  detectCurrentTheme() {
    // Method 1: Check body class
    const body = document.body;
    if (body.classList.contains('dark')) {
      this.currentTheme = 'dark';
      return;
    }
    if (body.classList.contains('light')) {
      this.currentTheme = 'light';
      return;
    }

    // Method 2: Check for dark theme indicators
    const darkIndicators = [
      () => body.style.backgroundColor && body.style.backgroundColor.includes('rgb(26, 26, 26)'),
      () => document.documentElement.style.colorScheme === 'dark',
      () => window.getComputedStyle(body).backgroundColor === 'rgb(26, 26, 26)',
      () => document.querySelector('[data-theme="dark"]'),
      () => document.querySelector('.dark-theme')
    ];

    for (const indicator of darkIndicators) {
      try {
        if (indicator()) {
          this.currentTheme = 'dark';
          return;
        }
      } catch (e) {
        // Ignore errors in theme detection
      }
    }

    // Method 3: Check computed styles of common elements
    const navbar = document.querySelector('nav') || document.querySelector('.navbar');
    if (navbar) {
      const bgColor = window.getComputedStyle(navbar).backgroundColor;
      // Dark themes typically have dark navigation
      if (bgColor.includes('rgb(26, 26, 26)') || bgColor.includes('rgb(30, 30, 30)')) {
        this.currentTheme = 'dark';
        return;
      }
    }

    // Default to light theme
    this.currentTheme = 'light';
  }

  /**
   * Create or get style element for LeetPilot styles
   */
  createStyleElement() {
    this.styleElement = document.getElementById('leetpilot-styles');
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'leetpilot-styles';
      document.head.appendChild(this.styleElement);
    }
  }

  /**
   * Apply current theme styles
   */
  applyTheme() {
    const theme = this.themes[this.currentTheme] || this.themes.dark;
    const styles = this.generateStyles(theme);
    
    if (this.styleElement) {
      this.styleElement.textContent = styles;
    }
    
    console.log(`LeetPilot theme applied: ${theme.name}`);
  }

  /**
   * Generate CSS styles for the current theme
   */
  generateStyles(theme) {
    const { colors } = theme;
    
    return `
      /* LeetPilot Base Styles */
      .leetpilot-completion {
        position: absolute;
        z-index: 10000;
        background: ${colors.background};
        border: 1px solid ${colors.border};
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
        line-height: 1.4;
        max-width: 500px;
        min-width: 300px;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.2s ease-out;
      }
      
      .leetpilot-completion.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      .leetpilot-completion-content {
        padding: 12px;
      }
      
      .leetpilot-suggestion-text {
        color: ${colors.text};
        background: ${colors.surface};
        border: 1px solid ${colors.border};
        border-radius: 4px;
        padding: 8px 12px;
        margin: 0 0 12px 0;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .leetpilot-completion-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      
      /* Button Styles */
      .leetpilot-btn {
        background: ${colors.accent};
        border: 1px solid ${colors.accentHover};
        border-radius: 4px;
        color: #ffffff;
        cursor: pointer;
        font-size: 12px;
        padding: 6px 12px;
        transition: all 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .leetpilot-btn:hover {
        background: ${colors.accentHover};
        transform: translateY(-1px);
      }
      
      .leetpilot-btn:active {
        transform: translateY(0);
      }
      
      .leetpilot-btn-accept {
        background: ${colors.success};
        border-color: ${colors.success};
      }
      
      .leetpilot-btn-accept:hover {
        background: ${this.darkenColor(colors.success, 10)};
        border-color: ${this.darkenColor(colors.success, 10)};
      }
      
      .leetpilot-btn-reject {
        background: #6c757d;
        border-color: #868e96;
      }
      
      .leetpilot-btn-reject:hover {
        background: #868e96;
        border-color: #6c757d;
      }
      
      .leetpilot-btn-retry {
        background: ${colors.success};
        border-color: ${colors.success};
      }
      
      .leetpilot-btn-retry:hover {
        background: ${this.darkenColor(colors.success, 10)};
        border-color: ${this.darkenColor(colors.success, 10)};
      }
      
      /* Popup Styles */
      .leetpilot-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10001;
        background: ${colors.background};
        border: 1px solid ${colors.border};
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .leetpilot-popup.leetpilot-error {
        border-color: ${colors.error};
        box-shadow: 0 8px 24px ${this.hexToRgba(colors.error, 0.2)};
      }
      
      .leetpilot-popup-header {
        background: ${colors.surface};
        border-bottom: 1px solid ${colors.border};
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .leetpilot-error .leetpilot-popup-header {
        background: ${colors.error};
        border-bottom-color: ${this.darkenColor(colors.error, 10)};
      }
      
      .leetpilot-popup-title {
        color: ${colors.text};
        font-size: 16px;
        font-weight: 600;
        margin: 0;
      }
      
      .leetpilot-error .leetpilot-popup-title {
        color: #ffffff;
      }
      
      .leetpilot-popup-close {
        background: none;
        border: none;
        color: ${colors.textSecondary};
        cursor: pointer;
        font-size: 18px;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s ease;
      }
      
      .leetpilot-popup-close:hover {
        background: ${colors.border};
        color: ${colors.text};
      }
      
      .leetpilot-error .leetpilot-popup-close {
        color: rgba(255, 255, 255, 0.8);
      }
      
      .leetpilot-error .leetpilot-popup-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }
      
      .leetpilot-popup-content {
        padding: 16px;
        color: ${colors.text};
        line-height: 1.6;
      }
      
      .leetpilot-error-message {
        margin: 0 0 16px 0;
        color: ${colors.text};
        font-weight: 500;
      }
      
      .leetpilot-error .leetpilot-error-message {
        color: ${colors.text};
      }
      
      .leetpilot-error-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }
      
      /* Progressive Hint Styles */
      .leetpilot-hint-progress {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid ${colors.border};
      }
      
      .leetpilot-progress-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${colors.border};
        transition: background-color 0.2s ease;
      }
      
      .leetpilot-progress-dot.active {
        background: ${colors.accent};
      }
      
      .leetpilot-hint-content {
        margin-bottom: 16px;
      }
      
      .leetpilot-hint-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        padding-top: 16px;
        border-top: 1px solid ${colors.border};
      }
      
      .leetpilot-btn-next-hint {
        background: ${colors.accent};
        border-color: ${colors.accentHover};
      }
      
      .leetpilot-btn-next-hint:hover {
        background: ${colors.accentHover};
      }
      
      .leetpilot-btn-reset {
        background: #6c757d;
        border-color: #868e96;
      }
      
      .leetpilot-btn-reset:hover {
        background: #868e96;
        border-color: #6c757d;
      }
      
      .leetpilot-popup-content pre {
        background: ${colors.surface};
        border: 1px solid ${colors.border};
        border-radius: 4px;
        padding: 12px;
        margin: 12px 0;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
        overflow-x: auto;
        color: ${colors.text};
      }
      
      /* Overlay Styles */
      .leetpilot-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .leetpilot-overlay.show {
        opacity: 1;
      }
      
      /* Error Guidance Styles */
      .leetpilot-error-guidance {
        margin-top: 12px;
        padding: 8px;
        background: ${this.hexToRgba(colors.warning, 0.1)};
        border-left: 3px solid ${colors.warning};
        border-radius: 0 4px 4px 0;
        font-size: 13px;
        color: ${colors.text};
      }
      
      .leetpilot-next-hint-info {
        background: ${this.hexToRgba(colors.accent, 0.1)};
        border: 1px solid ${this.hexToRgba(colors.accent, 0.3)};
        border-radius: 4px;
        padding: 8px;
        margin-top: 12px;
        font-size: 12px;
        color: ${colors.text};
      }
      
      /* Progress Info Styles */
      .leetpilot-progress-info {
        font-size: 12px;
        color: ${colors.textSecondary};
        margin-bottom: 12px;
        text-align: center;
      }
      
      .leetpilot-session-info {
        font-size: 10px;
        color: ${colors.textSecondary};
        text-align: center;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid ${colors.border};
      }
      
      /* Responsive Design */
      @media (max-width: 768px) {
        .leetpilot-popup {
          max-width: 90vw;
          margin: 20px;
        }
        
        .leetpilot-completion {
          max-width: 90vw;
          min-width: 250px;
        }
        
        .leetpilot-completion-actions,
        .leetpilot-error-actions,
        .leetpilot-hint-actions {
          flex-direction: column;
        }
        
        .leetpilot-btn {
          width: 100%;
          margin-bottom: 4px;
        }
      }
      
      /* Animation Enhancements */
      .leetpilot-popup {
        animation: leetpilot-popup-enter 0.2s ease-out;
      }
      
      @keyframes leetpilot-popup-enter {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      
      .leetpilot-btn {
        position: relative;
        overflow: hidden;
      }
      
      .leetpilot-btn::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: width 0.3s, height 0.3s;
      }
      
      .leetpilot-btn:active::before {
        width: 300px;
        height: 300px;
      }
    `;
  }

  /**
   * Setup theme observer to detect theme changes
   */
  setupThemeObserver() {
    // Observer for body class changes
    const bodyObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const oldTheme = this.currentTheme;
          this.detectCurrentTheme();
          
          if (oldTheme !== this.currentTheme) {
            console.log(`Theme changed from ${oldTheme} to ${this.currentTheme}`);
            this.applyTheme();
          }
        }
      });
    });

    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    this.observers.push(bodyObserver);

    // Observer for style changes
    const styleObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'data-theme')) {
          const oldTheme = this.currentTheme;
          this.detectCurrentTheme();
          
          if (oldTheme !== this.currentTheme) {
            console.log(`Theme changed from ${oldTheme} to ${this.currentTheme}`);
            this.applyTheme();
          }
        }
      });
    });

    styleObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'data-theme', 'class']
    });

    this.observers.push(styleObserver);
  }

  /**
   * Manually set theme
   */
  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.currentTheme = themeName;
      this.applyTheme();
    }
  }

  /**
   * Get current theme
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get available themes
   */
  getAvailableThemes() {
    return Object.keys(this.themes);
  }

  /**
   * Darken a color by a percentage
   */
  darkenColor(color, percent) {
    // Simple darkening - in production, use a proper color manipulation library
    if (color.startsWith('#')) {
      const num = parseInt(color.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) - amt;
      const G = (num >> 8 & 0x00FF) - amt;
      const B = (num & 0x0000FF) - amt;
      return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    return color;
  }

  /**
   * Convert hex color to rgba
   */
  hexToRgba(hex, alpha) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
  }

  /**
   * Force theme refresh
   */
  refresh() {
    this.detectCurrentTheme();
    this.applyTheme();
  }
}