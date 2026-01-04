// LeetPilot Error Display
// Handles the display of error messages and retry interfaces

/**
 * Error Display Manager
 * Handles the display of error messages and retry interfaces
 * Features: Scrollable, Draggable, Resizeable, Modern UI
 */
export class ErrorDisplay {
  constructor() {
    this.activeError = null;
    this.keyHandler = null;
    this.clickHandler = null;
    this.dragHandler = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.resizeHandler = null;
    this.isResizing = false;
    this.resizeStartPos = { x: 0, y: 0 };
    this.popupStartSize = { width: 0, height: 0 };
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

    // Create popup container with drag handle and resize handle
    const popup = document.createElement('div');
    popup.className = 'leetpilot-popup leetpilot-error';

    // Create drag handle (header)
    const dragHandle = this.createDragHandle();
    popup.appendChild(dragHandle);

    // Create header (simplified - logo is now in drag handle)
    const header = document.createElement('div');
    header.className = 'leetpilot-popup-header';
    header.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';

    // Create container for title and subtitle
    const titleContainer = document.createElement('div');
    titleContainer.style.display = 'flex';
    titleContainer.style.flexDirection = 'column';
    titleContainer.style.gap = '2px';

    const titleElement = document.createElement('h3');
    titleElement.className = 'leetpilot-popup-title';

    // Set title based on error category
    titleElement.textContent = this.getErrorTitle(errorCategory);

    // Add subtitle with error category
    const subtitleElement = document.createElement('span');
    subtitleElement.style.fontSize = '11px';
    subtitleElement.style.fontWeight = '400';
    subtitleElement.style.opacity = '0.85';
    subtitleElement.style.textShadow = 'none';
    subtitleElement.textContent = errorCategory ? `${errorCategory} error` : 'Something went wrong';

    titleContainer.appendChild(titleElement);
    titleContainer.appendChild(subtitleElement);

    const closeButton = document.createElement('button');
    closeButton.className = 'leetpilot-popup-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close (Esc)';

    header.appendChild(titleContainer);
    header.appendChild(closeButton);

    // Create content with scroll
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

    // Create resize handle
    const resizeHandle = this.createResizeHandle();
    popup.appendChild(resizeHandle);

    overlay.appendChild(popup);

    // Set up event handlers
    this.setupPopupInteractions(overlay, popup, closeButton, dragHandle, resizeHandle);

    return overlay;
  }

  /**
   * Create drag handle for the popup (logo + brand)
   */
  createDragHandle() {
    const dragHandle = document.createElement('div');
    dragHandle.className = 'leetpilot-drag-handle';
    
    // Create logo container
    const logoContainer = document.createElement('div');
    logoContainer.style.display = 'flex';
    logoContainer.style.alignItems = 'center';
    logoContainer.style.gap = '8px';
    
    // Create logo image
    const logoImg = document.createElement('img');
    logoImg.src = chrome.runtime.getURL('icons/logo-name-128.png');
    logoImg.alt = 'LeetPilot Logo';
    logoImg.style.height = '28px';
    logoImg.style.width = 'auto';
    logoImg.style.objectFit = 'contain';
    logoImg.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))';
    
    logoContainer.appendChild(logoImg);
    dragHandle.appendChild(logoContainer);
    dragHandle.title = 'LeetPilot - Drag to move';
    dragHandle.style.width = 'auto';
    dragHandle.style.padding = '4px 8px';
    dragHandle.style.borderRadius = '8px';
    
    return dragHandle;
  }

  /**
   * Create resize handle for the popup
   */
  createResizeHandle() {
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'leetpilot-resize-handle';
    resizeHandle.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M14 10V14H10V10H14ZM8 14V10H4V14H8ZM10 8V4H14V8H10ZM4 8V4H0V8H4Z"/></svg>';
    resizeHandle.title = 'Drag to resize';
    resizeHandle.style.bottom = '4px';
    resizeHandle.style.right = '4px';
    return resizeHandle;
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
  setupPopupInteractions(overlay, popup, closeButton, dragHandle, resizeHandle) {
    // Close button handler
    closeButton.addEventListener('click', () => {
      this.removeExistingDisplays();
    });

    // Drag functionality
    this.setupDragging(popup, dragHandle);

    // Resize functionality
    this.setupResizing(popup, resizeHandle);

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
   * Setup dragging functionality
   */
  setupDragging(popup, dragHandle) {
    dragHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDragging = true;
      
      const rect = popup.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      popup.style.zIndex = '10000';
      dragHandle.style.cursor = 'grabbing';

      this.dragHandler = (e) => {
        if (!this.isDragging) return;
        
        let newX = e.clientX - this.dragOffset.x;
        let newY = e.clientY - this.dragOffset.y;

        // Keep within viewport
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        popup.style.left = newX + 'px';
        popup.style.top = newY + 'px';
        popup.style.right = 'auto';
      };

      this.dragHandler = this.dragHandler.bind(this);
      document.addEventListener('mousemove', this.dragHandler);

      const stopDrag = () => {
        this.isDragging = false;
        dragHandle.style.cursor = 'grab';
        document.removeEventListener('mousemove', this.dragHandler);
        document.removeEventListener('mouseup', stopDrag);
      };

      document.addEventListener('mouseup', stopDrag);
    });
  }

  /**
   * Setup resizing functionality
   */
  setupResizing(popup, resizeHandle) {
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isResizing = true;

      this.resizeStartPos = { x: e.clientX, y: e.clientY };
      this.popupStartSize = {
        width: popup.offsetWidth,
        height: popup.offsetHeight
      };

      popup.style.zIndex = '10000';
      resizeHandle.style.cursor = 'se-resize';

      this.resizeHandler = (e) => {
        if (!this.isResizing) return;

        const deltaX = e.clientX - this.resizeStartPos.x;
        const deltaY = e.clientY - this.resizeStartPos.y;

        const newWidth = Math.max(280, this.popupStartSize.width + deltaX);
        const newHeight = Math.max(200, this.popupStartSize.height + deltaY);

        popup.style.width = newWidth + 'px';
        popup.style.height = newHeight + 'px';
      };

      this.resizeHandler = this.resizeHandler.bind(this);
      document.addEventListener('mousemove', this.resizeHandler);

      const stopResize = () => {
        this.isResizing = false;
        resizeHandle.style.cursor = 'se-resize';
        document.removeEventListener('mousemove', this.resizeHandler);
        document.removeEventListener('mouseup', stopResize);
      };

      document.addEventListener('mouseup', stopResize);
    });
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

    if (this.dragHandler) {
      document.removeEventListener('mousemove', this.dragHandler);
      this.dragHandler = null;
    }

    if (this.resizeHandler) {
      document.removeEventListener('mousemove', this.resizeHandler);
      this.resizeHandler = null;
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
    this.isDragging = false;
    this.isResizing = false;
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