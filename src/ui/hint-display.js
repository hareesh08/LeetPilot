// LeetPilot Hint Display
// Handles the display of progressive hints with educational progression

/**
 * Hint Display Manager
 * Handles the display of progressive hints with educational progression
 */
export class HintDisplay {
  constructor() {
    this.activeHint = null;
    this.keyHandler = null;
    this.clickHandler = null;
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

    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'leetpilot-popup leetpilot-hint';

    // Create header with enhanced progress indicator
    const header = this.createHintHeader(hintLevel, maxHintLevel, maxReached);
    popup.appendChild(header);

    // Create content
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
    overlay.appendChild(popup);

    // Set up event handlers
    this.setupPopupInteractions(overlay, popup);

    return overlay;
  }

  /**
   * Create hint header with progress indicator
   */
  createHintHeader(hintLevel, maxHintLevel, maxReached) {
    const header = document.createElement('div');
    header.className = 'leetpilot-popup-header';

    const titleElement = document.createElement('h3');
    titleElement.className = 'leetpilot-popup-title';

    if (maxReached) {
      titleElement.textContent = `All Hints Used (${maxHintLevel}/${maxHintLevel})`;
    } else {
      titleElement.textContent = `Hint ${hintLevel} of ${maxHintLevel}`;
    }

    const closeButton = document.createElement('button');
    closeButton.className = 'leetpilot-popup-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close (Esc)';

    header.appendChild(titleElement);
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
  setupPopupInteractions(overlay, popup) {
    // Close button handler
    const closeButton = popup.querySelector('.leetpilot-popup-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.removeExistingDisplays();
      });
    }

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
   * Remove any existing hint displays
   */
  removeExistingDisplays() {
    // Clean up event listeners
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    // Remove hint elements
    const existingDisplays = document.querySelectorAll('.leetpilot-display, .leetpilot-popup, .leetpilot-overlay');
    existingDisplays.forEach(element => {
      element.remove();
    });

    this.activeHint = null;
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