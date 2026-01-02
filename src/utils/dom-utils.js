// LeetPilot DOM Utilities
// Helper functions for DOM manipulation and element detection

export class DOMUtils {
  /**
   * Wait for element to appear in DOM
   */
  static waitForElement(selector, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Timeout after specified time
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Wait for multiple elements to appear
   */
  static waitForElements(selectors, timeout = 30000) {
    const promises = selectors.map(selector => 
      this.waitForElement(selector, timeout).catch(() => null)
    );
    return Promise.all(promises);
  }

  /**
   * Check if element is visible
   */
  static isElementVisible(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      style.opacity !== '0'
    );
  }

  /**
   * Get element's position relative to viewport
   */
  static getElementPosition(element) {
    if (!element) return null;
    
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2
    };
  }

  /**
   * Create element with attributes and styles
   */
  static createElement(tag, attributes = {}, styles = {}) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'textContent') {
        element.textContent = value;
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // Set styles
    Object.entries(styles).forEach(([key, value]) => {
      element.style[key] = value;
    });
    
    return element;
  }

  /**
   * Remove element safely
   */
  static removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * Add CSS styles to document head
   */
  static addStyles(css, id = null) {
    let styleElement = id ? document.getElementById(id) : null;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      if (id) styleElement.id = id;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = css;
    return styleElement;
  }

  /**
   * Debounce function calls
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function calls
   */
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Get text content from element, handling nested structures
   */
  static getTextContent(element) {
    if (!element) return '';
    
    // For Monaco Editor view lines, extract text more carefully
    if (element.classList.contains('view-line') || element.classList.contains('view-lines')) {
      const spans = element.querySelectorAll('span');
      if (spans.length > 0) {
        return Array.from(spans)
          .filter(span => !span.classList.contains('line-numbers'))
          .map(span => span.textContent || '')
          .join('');
      }
    }
    
    return element.textContent || '';
  }

  /**
   * Simulate user events
   */
  static simulateEvent(element, eventType, options = {}) {
    const event = new Event(eventType, {
      bubbles: true,
      cancelable: true,
      ...options
    });
    
    element.dispatchEvent(event);
  }

  /**
   * Check if element matches any of the selectors
   */
  static matchesAny(element, selectors) {
    if (!element || !selectors) return false;
    
    return selectors.some(selector => {
      try {
        return element.matches(selector);
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Find closest parent matching selector
   */
  static findClosestParent(element, selector) {
    if (!element) return null;
    
    try {
      return element.closest(selector);
    } catch (e) {
      return null;
    }
  }

  /**
   * Get all text nodes within an element
   */
  static getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) {
        textNodes.push(node);
      }
    }
    
    return textNodes;
  }
}