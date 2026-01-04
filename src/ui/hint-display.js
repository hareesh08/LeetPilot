// LeetPilot Hint Display
// Handles the display of progressive hints with educational progression

/**
 * Hint Display Manager
 * Handles the display of progressive hints with educational progression
 * Features: Scrollable, Draggable, Resizeable, Modern UI
 */
export class HintDisplay {
  constructor() {
    this.activeHint = null;
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
   * Display progressive hint with enhanced information
   */
  displayHint(hintResponse) {
    console.log('Displaying hint:', hintResponse);

    try {
      // Remove any existing displays
      this.removeExistingDisplays();

      // Create and show hint popup with progressive information
      const hintElement = this.createProgressiveHintElement(hintResponse);
      this.injectPopupIntoPage(hintElement);

      this.activeHint = hintElement;

      console.log('Hint displayed successfully');
    } catch (error) {
      console.error('Error displaying hint:', error);
    }
  }

  /**
   * Create progressive hint popup element with enhanced information display
   */
  createProgressiveHintElement(hintResponse) {
    const {
      hint,
      hintLevel,
      totalHints,
      maxHintLevel,
      progression,
      nextHintAvailable,
      nextHintType,
      sessionInfo,
      maxReached
    } = hintResponse;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'leetpilot-overlay leetpilot-display';

    // Create popup container with drag handle and resize handle
    const popup = document.createElement('div');
    popup.className = 'leetpilot-popup leetpilot-hint';

    // Create drag handle (header)
    const dragHandle = this.createDragHandle();
    popup.appendChild(dragHandle);

    // Create header with enhanced progress indicator
    const header = this.createHintHeader(hintLevel, maxHintLevel, maxReached);
    popup.appendChild(header);

    // Create content with scroll
    const contentElement = document.createElement('div');
    contentElement.className = 'leetpilot-popup-content';

    // Enhanced progress indicator
    const progressContainer = this.createProgressIndicator(hintLevel, maxHintLevel);
    contentElement.appendChild(progressContainer);

    // Progress information
    if (progression && (progression.progressScore > 0 || progression.conceptsIntroduced.length > 0)) {
      const progressInfo = this.createProgressInfo(progression);
      contentElement.appendChild(progressInfo);
    }

    // Hint content
    const hintContent = this.createHintContent(hint);
    contentElement.appendChild(hintContent);

    // Next hint guidance
    if (nextHintAvailable && nextHintType && !maxReached) {
      const nextHintInfo = this.createNextHintInfo(hintLevel, nextHintType);
      contentElement.appendChild(nextHintInfo);
    }

    // Action buttons
    const actionContainer = this.createHintActionButtons(hintLevel, maxHintLevel, nextHintAvailable, maxReached);
    contentElement.appendChild(actionContainer);

    // Session info (for debugging/transparency)
    if (sessionInfo && (sessionInfo.hintsRemaining !== undefined)) {
      const sessionInfoElement = this.createSessionInfo(sessionInfo, maxReached);
      contentElement.appendChild(sessionInfoElement);
    }

    // Assemble popup
    popup.appendChild(contentElement);

    // Create resize handle
    const resizeHandle = this.createResizeHandle();
    popup.appendChild(resizeHandle);

    overlay.appendChild(popup);

    // Set up event handlers
    this.setupPopupInteractions(overlay, popup, dragHandle, resizeHandle);

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
    return resizeHandle;
  }

  /**
   * Create hint header with progress indicator
   */
  createHintHeader(hintLevel, maxHintLevel, maxReached) {
    const header = document.createElement('div');
    header.className = 'leetpilot-popup-header';

    // Create container for title and subtitle
    const titleContainer = document.createElement('div');
    titleContainer.style.display = 'flex';
    titleContainer.style.flexDirection = 'column';
    titleContainer.style.gap = '2px';

    const titleElement = document.createElement('h3');
    titleElement.className = 'leetpilot-popup-title';

    if (maxReached) {
      titleElement.textContent = 'All Hints Used';
    } else {
      titleElement.textContent = `Hint ${hintLevel} of ${maxHintLevel}`;
    }

    // Add subtitle with progress
    const subtitleElement = document.createElement('span');
    subtitleElement.style.fontSize = '11px';
    subtitleElement.style.fontWeight = '400';
    subtitleElement.style.opacity = '0.85';
    subtitleElement.style.textShadow = 'none';
    subtitleElement.textContent = maxReached ? 'Max level reached' : 'Progressive hints';

    titleContainer.appendChild(titleElement);
    titleContainer.appendChild(subtitleElement);

    const closeButton = document.createElement('button');
    closeButton.className = 'leetpilot-popup-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close (Esc)';

    header.appendChild(titleContainer);
    header.appendChild(closeButton);

    return header;
  }

  /**
   * Create progress indicator dots
   */
  createProgressIndicator(hintLevel, maxHintLevel) {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'leetpilot-hint-progress';

    for (let i = 1; i <= maxHintLevel; i++) {
      const progressDot = document.createElement('div');
      progressDot.className = 'leetpilot-progress-dot';
      if (i <= hintLevel) {
        progressDot.classList.add('active');
      }

      // Add tooltip for progress dots
      progressDot.title = `Hint ${i}: ${this.getHintLevelDescription(i)}`;

      progressContainer.appendChild(progressDot);
    }

    return progressContainer;
  }

  /**
   * Create progress information display
   */
  createProgressInfo(progression) {
    const progressInfo = document.createElement('div');
    progressInfo.className = 'leetpilot-progress-info';
    progressInfo.style.fontSize = '12px';
    progressInfo.style.color = '#888';
    progressInfo.style.marginBottom = '12px';
    progressInfo.style.textAlign = 'center';

    let progressText = '';
    if (progression.progressScore > 0) {
      progressText += `Learning Progress: ${progression.progressScore}/20`;
    }

    if (progression.conceptsIntroduced.length > 0) {
      if (progressText) progressText += ' • ';
      progressText += `Concepts: ${progression.conceptsIntroduced.length}`;
    }

    if (progression.sessionDuration > 0) {
      const minutes = Math.round(progression.sessionDuration / (1000 * 60));
      if (progressText) progressText += ' • ';
      progressText += `Time: ${minutes}m`;
    }

    if (progressText) {
      progressInfo.textContent = progressText;
      return progressInfo;
    }

    return null;
  }

  /**
   * Create hint content display
   */
  createHintContent(hint) {
    const hintContent = document.createElement('div');
    hintContent.className = 'leetpilot-hint-content';

    // Format hint text with better structure
    const paragraphs = hint.split('\n\n');
    paragraphs.forEach(paragraph => {
      if (paragraph.trim()) {
        const p = document.createElement('p');

        // Check if paragraph contains code-like content
        if (paragraph.includes('`') || paragraph.includes('function') || paragraph.includes('def ')) {
          const pre = document.createElement('pre');
          pre.style.background = '#2d2d30';
          pre.style.padding = '8px';
          pre.style.borderRadius = '4px';
          pre.style.fontSize = '12px';
          pre.textContent = paragraph.trim();
          hintContent.appendChild(pre);
        } else {
          p.textContent = paragraph.trim();
          hintContent.appendChild(p);
        }
      }
    });

    return hintContent;
  }

  /**
   * Create next hint information
   */
  createNextHintInfo(hintLevel, nextHintType) {
    const nextHintInfo = document.createElement('div');
    nextHintInfo.className = 'leetpilot-next-hint-info';
    nextHintInfo.style.background = 'rgba(14, 79, 136, 0.1)';
    nextHintInfo.style.border = '1px solid rgba(14, 79, 136, 0.3)';
    nextHintInfo.style.borderRadius = '4px';
    nextHintInfo.style.padding = '8px';
    nextHintInfo.style.marginTop = '12px';
    nextHintInfo.style.fontSize = '12px';

    const nextHintTitle = document.createElement('div');
    nextHintTitle.style.fontWeight = 'bold';
    nextHintTitle.style.marginBottom = '4px';
    nextHintTitle.textContent = `Next hint will focus on: ${nextHintType}`;

    const nextHintDesc = document.createElement('div');
    nextHintDesc.style.color = '#ccc';
    nextHintDesc.textContent = this.getHintLevelDescription(hintLevel + 1);

    nextHintInfo.appendChild(nextHintTitle);
    nextHintInfo.appendChild(nextHintDesc);

    return nextHintInfo;
  }

  /**
   * Create hint action buttons
   */
  createHintActionButtons(hintLevel, maxHintLevel, nextHintAvailable, maxReached) {
    const actionContainer = document.createElement('div');
    actionContainer.className = 'leetpilot-hint-actions';

    if (!maxReached) {
      // Next hint button (if not at max level)
      if (nextHintAvailable) {
        const nextHintButton = this.createNextHintButton(hintLevel, maxHintLevel);
        actionContainer.appendChild(nextHintButton);
      }

      // Reset hints button
      const resetButton = this.createResetButton();
      actionContainer.appendChild(resetButton);
    } else {
      // Max hints reached - show restart option
      const restartButton = this.createRestartButton();
      actionContainer.appendChild(restartButton);
    }

    return actionContainer;
  }

  /**
   * Create next hint button
   */
  createNextHintButton(hintLevel, maxHintLevel) {
    const nextHintButton = document.createElement('button');
    nextHintButton.className = 'leetpilot-btn leetpilot-btn-next-hint';
    nextHintButton.textContent = `Next Hint (${hintLevel + 1}/${maxHintLevel})`;
    nextHintButton.title = `Get hint level ${hintLevel + 1}: ${this.getHintLevelDescription(hintLevel + 1)}`;

    nextHintButton.addEventListener('click', () => {
      this.removeExistingDisplays();
      this.requestNextHint();
    });

    return nextHintButton;
  }

  /**
   * Create reset button
   */
  createResetButton() {
    const resetButton = document.createElement('button');
    resetButton.className = 'leetpilot-btn leetpilot-btn-reset';
    resetButton.textContent = 'Reset Hints';
    resetButton.title = 'Start over with hints for this problem';

    resetButton.addEventListener('click', () => {
      this.resetHintSession();
      this.removeExistingDisplays();
    });

    return resetButton;
  }

  /**
   * Create restart button for max hints reached
   */
  createRestartButton() {
    const restartButton = document.createElement('button');
    restartButton.className = 'leetpilot-btn leetpilot-btn-reset';
    restartButton.textContent = 'Start New Hint Session';
    restartButton.title = 'Reset and start over with fresh hints';

    restartButton.addEventListener('click', () => {
      this.resetHintSession();
      this.removeExistingDisplays();
      // Automatically request first hint
      setTimeout(() => this.requestNextHint(), 500);
    });

    return restartButton;
  }

  /**
   * Create session information display
   */
  createSessionInfo(sessionInfo, maxReached) {
    const sessionInfoElement = document.createElement('div');
    sessionInfoElement.className = 'leetpilot-session-info';
    sessionInfoElement.style.fontSize = '10px';
    sessionInfoElement.style.color = '#666';
    sessionInfoElement.style.textAlign = 'center';
    sessionInfoElement.style.marginTop = '8px';
    sessionInfoElement.style.paddingTop = '8px';
    sessionInfoElement.style.borderTop = '1px solid #333';

    if (maxReached) {
      sessionInfoElement.textContent = 'All hints for this problem have been used';
    } else {
      sessionInfoElement.textContent = `${sessionInfo.hintsRemaining} hint${sessionInfo.hintsRemaining !== 1 ? 's' : ''} remaining`;
    }

    return sessionInfoElement;
  }

  /**
   * Get description for hint level
   */
  getHintLevelDescription(level) {
    const descriptions = {
      1: 'Problem understanding and high-level approach',
      2: 'Algorithm structure and data organization',
      3: 'Implementation guidance and techniques',
      4: 'Edge cases and optimization strategies'
    };

    return descriptions[level] || 'Additional guidance';
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
  setupPopupInteractions(overlay, popup, dragHandle, resizeHandle) {
    // Close button handler
    const closeButton = popup.querySelector('.leetpilot-popup-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.removeExistingDisplays();
      });
    }

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
   * Remove any existing hint displays
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

    // Remove hint elements
    const existingDisplays = document.querySelectorAll('.leetpilot-display, .leetpilot-popup, .leetpilot-overlay');
    existingDisplays.forEach(element => {
      element.remove();
    });

    this.activeHint = null;
    this.isDragging = false;
    this.isResizing = false;
  }

  /**
   * Request next hint (placeholder - should be implemented by caller)
   */
  requestNextHint() {
    console.log('Requesting next hint...');
    // This should be overridden by the caller or use a callback system
    document.dispatchEvent(new CustomEvent('leetpilot-request-hint'));
  }

  /**
   * Reset hint session (placeholder - should be implemented by caller)
   */
  resetHintSession() {
    console.log('Resetting hint session...');
    // This should be overridden by the caller or use a callback system
    document.dispatchEvent(new CustomEvent('leetpilot-reset-hints'));
  }

  /**
   * Check if hint is currently displayed
   */
  isDisplayed() {
    return this.activeHint !== null && this.activeHint.parentNode;
  }

  /**
   * Set callback functions
   */
  setCallbacks(callbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Override request next hint with callback
   */
  requestNextHint() {
    if (this.callbacks && this.callbacks.requestHint) {
      this.callbacks.requestHint();
    } else {
      document.dispatchEvent(new CustomEvent('leetpilot-request-hint'));
    }
  }

  /**
   * Override reset hint session with callback
   */
  resetHintSession() {
    if (this.callbacks && this.callbacks.resetHints) {
      this.callbacks.resetHints();
    } else {
      document.dispatchEvent(new CustomEvent('leetpilot-reset-hints'));
    }
  }
}