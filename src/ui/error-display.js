// LeetPilot Error Display
// Handles the display of error messages and retry interfaces

/**
 * Error Display Manager
 * Handles the display of error messages and retry interfaces
 */
export class ErrorDisplay {
  constructor() {
    this.activeError = null;
    this.keyHandler = null;
    this.clickHandler = null;
  }

  /**
   * Display error message to user with comprehensive error handling
   */
  displayError(errorMessage, errorCategory, shouldRetry, errorResponse = {}) {
    console.log('Displaying error:', errorMessage, 'Category:', errorCategory);

    try {
      // Remove any existing displays
      this.removeExistingDisplays();

      // Create and show error popup with enhanced information
      const errorElement = this.createEnhancedErrorElement(errorMessage, errorCategory, shouldRetry, errorResponse);
      this.injectPopupIntoPage(errorElement);

      this.activeError = errorElement;

      console.log('Error displayed successfully');
    } catch (error) {
      console.error('Error displaying error message:', error);
    }
  }

  /**
   * Create enhanced error popup element with retry information
   */
  createEnhancedErrorElement(errorMessage, errorCategory, shouldRetry, errorResponse = {}) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'leetpilot-overlay leetpilot-display';

    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'leetpilot-popup leetpilot-error';

    // Create header
    const header = document.createElement('div');
    header.className = 'leetpilot-popup-header';

    const titleElement = document.createElement('h3');
    titleElement.className = 'leetpilot-popup-title';

    // Set title based on error category
    titleElement.textContent = this.getErrorTitle(errorCategory);

    const closeButton = document.createElement('button');
    closeButton.className = 'leetpilot-popup-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close (Esc)';

    header.appendChild(titleElement);
    header.appendChild(closeButton);

    // Create content
    const contentElement = document.createElement('div');
    contentElement.className = 'leetpilot-popup-content';

    // Error message
    const messageElement = document.createElement('p');
    messageElement.className = 'leetpilot-error-message';
    messageElement.textContent = errorMessage;
    contentElement.appendChild(messageElement);

    // Add retry information if available
    this.addRetryInformation(contentElement, shouldRetry, errorResponse);

    // Add specific guidance based on error category
    const guidanceElement = this.createErrorGuidance(errorCategory, errorResponse);
    if (guidanceElement) {
      contentElement.appendChild(guidanceElement);
    }

    // Add action buttons
    const actionContainer = this.createActionButtons(errorCategory, shouldRetry, errorResponse);
    if (actionContainer.children.length > 0) {
      contentElement.appendChild(actionContainer);
    }

    // Assemble popup
    popup.appendChild(header);
    popup.appendChild(contentElement);
    overlay.appendChild(popup);

    // Set up event handlers
    this.setupPopupInteractions(overlay, popup, closeButton);

    return overlay;
  }

  /**
   * Get error title based on category
   */
  getErrorTitle(errorCategory) {
    const titles = {
      'network': 'Connection Error',
      'auth': 'Authentication Error',
      'rate_limit': 'Rate Limit Exceeded',
      'quota': 'Usage Limit Reached',
      'config': 'Configuration Required',
      'validation': 'Invalid Request',
      'timeout': 'Request Timeout',
      'api_error': 'Service Error'
    };

    return titles[errorCategory] || 'LeetPilot Error';
  }

  /**
   * Add retry information to content element
   */
  addRetryInformation(contentElement, shouldRetry, errorResponse) {
    if (errorResponse.retryAttempt !== undefined && errorResponse.maxRetries !== undefined) {
      const retryInfo = document.createElement('p');
      retryInfo.className = 'leetpilot-retry-info';
      retryInfo.style.fontSize = '12px';
      retryInfo.style.color = '#888';
      retryInfo.style.marginTop = '8px';

      if (errorResponse.retryAttempt > 0) {
        retryInfo.textContent = `Retry attempt ${errorResponse.retryAttempt} of ${errorResponse.maxRetries}`;
      } else if (shouldRetry) {
        retryInfo.textContent = `Will retry automatically in ${Math.ceil((errorResponse.retryDelay || 1000) / 1000)} seconds`;
      }

      if (retryInfo.textContent) {
        contentElement.appendChild(retryInfo);
      }
    }
  }

  /**
   * Create error-specific guidance
   */
  createErrorGuidance(errorCategory, errorResponse) {
    const guidanceContainer = document.createElement('div');
    guidanceContainer.className = 'leetpilot-error-guidance';
    guidanceContainer.style.marginTop = '12px';
    guidanceContainer.style.padding = '8px';
    guidanceContainer.style.background = 'rgba(255, 193, 7, 0.1)';
    guidanceContainer.style.borderLeft = '3px solid #ffc107';
    guidanceContainer.style.fontSize = '13px';

    const guidanceText = this.getGuidanceText(errorCategory, errorResponse);

    if (guidanceText) {
      const guidanceP = document.createElement('p');
      guidanceP.textContent = guidanceText;
      guidanceP.style.margin = '0';
      guidanceContainer.appendChild(guidanceP);
      return guidanceContainer;
    }

    return null;
  }

  /**
   * Get guidance text for error category
   */
  getGuidanceText(errorCategory, errorResponse) {
    switch (errorCategory) {
      case 'network':
        return 'Check your internet connection and try again. If the problem persists, the AI service might be experiencing issues.';
      case 'auth':
        return 'Verify your API key is correct and has the necessary permissions. You can update it in the extension settings.';
      case 'rate_limit':
        if (errorResponse.retryDelay) {
          const waitMinutes = Math.ceil(errorResponse.retryDelay / 60000);
          return `Please wait ${waitMinutes} minute(s) before making another request. Consider upgrading your API plan for higher limits.`;
        } else {
          return 'You\'ve made too many requests recently. Please wait before trying again.';
        }
      case 'quota':
        return 'You\'ve reached your usage limit. Check your account billing or upgrade your plan to continue using the service.';
      case 'config':
        return 'Configure your AI provider settings by clicking the extension icon and entering your API key.';
      case 'validation':
        return 'There was an issue with your request. Try selecting different code or rephrasing your request.';
      case 'timeout':
        return 'The request took too long to complete. The AI service might be experiencing high load.';
      default:
        return null;
    }
  }

  /**
   * Create action buttons for error popup
   */
  createActionButtons(errorCategory, shouldRetry, errorResponse) {
    const actionContainer = document.createElement('div');
    actionContainer.className = 'leetpilot-error-actions';

    // Retry button if applicable
    if (shouldRetry && errorResponse.retryDelay !== undefined) {
      const retryButton = this.createRetryButton(errorResponse);
      actionContainer.appendChild(retryButton);
    }

    // Configuration button for config errors
    if (errorCategory === 'config' || errorCategory === 'auth') {
      const configButton = this.createConfigButton();
      actionContainer.appendChild(configButton);
    }

    return actionContainer;
  }

  /**
   * Create retry button with countdown
   */
  createRetryButton(errorResponse) {
    const retryButton = document.createElement('button');
    retryButton.className = 'leetpilot-btn leetpilot-btn-retry';

    if (errorResponse.retryDelay > 0) {
      retryButton.textContent = `Retry in ${Math.ceil(errorResponse.retryDelay / 1000)}s`;
      retryButton.disabled = true;

      // Countdown timer
      let countdown = Math.ceil(errorResponse.retryDelay / 1000);
      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          retryButton.textContent = `Retry in ${countdown}s`;
        } else {
          retryButton.textContent = 'Try Again';
          retryButton.disabled = false;
          clearInterval(countdownInterval);
        }
      }, 1000);

      // Store interval for cleanup
      retryButton._countdownInterval = countdownInterval;
    } else {
      retryButton.textContent = 'Try Again';
    }

    retryButton.title = 'Retry the last action';

    retryButton.addEventListener('click', () => {
      if (retryButton._countdownInterval) {
        clearInterval(retryButton._countdownInterval);
      }
      this.removeExistingDisplays();
      this.retryLastAction();
    });

    return retryButton;
  }

  /**
   * Create configuration button
   */
  createConfigButton() {
    const configButton = document.createElement('button');
    configButton.className = 'leetpilot-btn leetpilot-btn-config';
    configButton.textContent = 'Open Settings';
    configButton.title = 'Open extension configuration';
    configButton.style.background = '#28a745';
    configButton.style.borderColor = '#34ce57';

    configButton.addEventListener('click', () => {
      // Open extension popup for configuration
      chrome.runtime.sendMessage({ type: 'openConfiguration' });
      this.removeExistingDisplays();
    });

    return configButton;
  }

  /**
   * Inject popup into page
   */
  injectPopupIntoPage(popupElement) {
    document.body.appendChild(popupElement);

    // Trigger animation
    setTimeout(() => {
      popupElement.classList.add('show');
    }, 10);
  }

  /**
   * Set up popup interaction handlers
   */
  setupPopupInteractions(overlay, popup, closeButton) {
    // Close button handler
    closeButton.addEventListener('click', () => {
      this.removeExistingDisplays();
    });

    // Overlay click to close
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.removeExistingDisplays();
      }
    });

    // Keyboard shortcuts
    this.keyHandler = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.removeExistingDisplays();
      }
    };

    document.addEventListener('keydown', this.keyHandler);
  }

  /**
   * Remove any existing error displays
   */
  removeExistingDisplays() {
    // Clean up event listeners
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    // Remove error elements
    const existingDisplays = document.querySelectorAll('.leetpilot-display, .leetpilot-popup, .leetpilot-overlay');
    existingDisplays.forEach(element => {
      // Clean up any countdown intervals
      const retryButton = element.querySelector('.leetpilot-btn-retry');
      if (retryButton && retryButton._countdownInterval) {
        clearInterval(retryButton._countdownInterval);
      }
      element.remove();
    });

    this.activeError = null;
  }

  /**
   * Retry the last action (placeholder - should be implemented by caller)
   */
  retryLastAction() {
    console.log('Retrying last action...');
    // This should be overridden by the caller or use a callback system
    // For now, we'll dispatch a custom event
    document.dispatchEvent(new CustomEvent('leetpilot-retry-action'));
  }

  /**
   * Check if error is currently displayed
   */
  isDisplayed() {
    return this.activeError !== null && this.activeError.parentNode;
  }

  /**
   * Set retry callback
   */
  setRetryCallback(callback) {
    this.retryCallback = callback;
  }

  /**
   * Override retry action with callback
   */
  retryLastAction() {
    if (this.retryCallback && typeof this.retryCallback === 'function') {
      this.retryCallback();
    } else {
      console.log('No retry callback set, dispatching event');
      document.dispatchEvent(new CustomEvent('leetpilot-retry-action'));
    }
  }
}