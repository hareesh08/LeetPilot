// LeetPilot Completion Display
// Handles the display and interaction of code completion suggestions

/**
 * Completion Display Manager
 * Handles the display and interaction of code completion suggestions
 * Features: Scrollable, Draggable, Resizeable, Modern UI
 */
export class CompletionDisplay {
  constructor() {
    this.activeCompletion = null;
    this.keyHandler = null;
    this.clickHandler = null;
    this.dragHandler = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.resizeHandler = null;
    this.isResizing = false;
    this.resizeStartPos = { x: 0, y: 0 };
    this.completionStartSize = { width: 0, height: 0 };
  }

  /**
   * Display completion suggestion in Monaco Editor
   */
  displayCompletion(suggestion, monacoEditor) {
    if (!monacoEditor || !suggestion) {
      console.warn('Cannot display completion: editor or suggestion not available');
      return;
    }

    try {
      // Remove any existing completion display
      this.removeExistingCompletion();

      // Create and inject the completion UI
      const completionElement = this.createCompletionElement(suggestion);
      this.injectCompletionIntoEditor(completionElement, monacoEditor);

      // Set up completion interaction handlers
      this.setupCompletionInteractions(completionElement, suggestion, monacoEditor);

      this.activeCompletion = completionElement;

      console.log('Completion displayed successfully');
    } catch (error) {
      console.error('Error displaying completion:', error);
    }
  }

  /**
   * Create completion element with LeetCode-matching styling
   */
  createCompletionElement(suggestion) {
    const completionContainer = document.createElement('div');
    completionContainer.className = 'leetpilot-completion leetpilot-display';

    // Create drag handle with logo
    const dragHandle = this.createDragHandle();
    completionContainer.appendChild(dragHandle);

    // Create header (simplified - no logo since it's in drag handle)
    const header = document.createElement('div');
    header.className = 'leetpilot-popup-header';
    header.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

    // Create container for title and subtitle
    const titleContainer = document.createElement('div');
    titleContainer.style.display = 'flex';
    titleContainer.style.flexDirection = 'column';
    titleContainer.style.gap = '2px';

    const titleElement = document.createElement('h3');
    titleElement.className = 'leetpilot-popup-title';
    titleElement.textContent = 'Code Completion';

    // Add subtitle
    const subtitleElement = document.createElement('span');
    subtitleElement.style.fontSize = '11px';
    subtitleElement.style.fontWeight = '400';
    subtitleElement.style.opacity = '0.85';
    subtitleElement.style.textShadow = 'none';
    subtitleElement.textContent = 'AI-powered suggestion';

    titleContainer.appendChild(titleElement);
    titleContainer.appendChild(subtitleElement);

    const closeButton = document.createElement('button');
    closeButton.className = 'leetpilot-popup-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Dismiss (Esc)';

    header.appendChild(titleContainer);
    header.appendChild(closeButton);
    completionContainer.appendChild(header);

    // Create the main completion content
    const completionContent = document.createElement('div');
    completionContent.className = 'leetpilot-completion-content';

    // Add suggestion text
    const suggestionText = document.createElement('pre');
    suggestionText.className = 'leetpilot-suggestion-text';
    suggestionText.textContent = suggestion.suggestion || suggestion;

    // Add action buttons
    const actionButtons = document.createElement('div');
    actionButtons.className = 'leetpilot-completion-actions';

    const acceptButton = document.createElement('button');
    acceptButton.className = 'leetpilot-btn leetpilot-btn-accept';
    acceptButton.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><polyline points="20 6 9 17 4 12"/></svg>Accept (Tab)`;
    acceptButton.title = 'Accept this suggestion';

    const rejectButton = document.createElement('button');
    rejectButton.className = 'leetpilot-btn leetpilot-btn-reject';
    rejectButton.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Dismiss (Esc)`;
    rejectButton.title = 'Dismiss this suggestion';

    actionButtons.appendChild(acceptButton);
    actionButtons.appendChild(rejectButton);

    completionContent.appendChild(suggestionText);
    completionContent.appendChild(actionButtons);
    completionContainer.appendChild(completionContent);

    // Create resize handle
    const resizeHandle = this.createResizeHandle();
    completionContainer.appendChild(resizeHandle);

    return completionContainer;
  }

  /**
   * Create drag handle for the completion (logo + brand)
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
   * Create resize handle for the completion
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
   * Inject completion element into the Monaco Editor
   */
  injectCompletionIntoEditor(completionElement, monacoEditor) {
    // Find the best position to inject the completion
    const cursorPosition = this.getCursorScreenPosition(monacoEditor);

    // Position the completion element
    if (cursorPosition) {
      completionElement.style.position = 'absolute';
      completionElement.style.left = cursorPosition.x + 'px';
      completionElement.style.top = (cursorPosition.y + 20) + 'px'; // 20px below cursor
    } else {
      // Fallback positioning relative to editor
      const editorRect = monacoEditor.getBoundingClientRect();
      completionElement.style.position = 'absolute';
      completionElement.style.left = (editorRect.left + 20) + 'px';
      completionElement.style.top = (editorRect.top + 50) + 'px';
    }

    // Inject into the page
    document.body.appendChild(completionElement);

    // Trigger animation
    setTimeout(() => {
      completionElement.classList.add('show');
    }, 10);

    // Auto-dismiss after 30 seconds
    setTimeout(() => {
      if (completionElement.parentNode) {
        this.removeExistingCompletion();
      }
    }, 30000);
  }

  /**
   * Get cursor screen position for positioning completion
   */
  getCursorScreenPosition(monacoEditor) {
    try {
      // Method 1: Use Monaco's cursor element
      const cursor = monacoEditor.querySelector('.cursor');
      if (cursor) {
        const rect = cursor.getBoundingClientRect();
        return {
          x: rect.left,
          y: rect.top
        };
      }

      // Method 2: Use textarea selection position (approximation)
      const textarea = monacoEditor.querySelector('textarea');
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        return {
          x: rect.left + 10, // Small offset
          y: rect.top + 10
        };
      }

      // Method 3: Fallback to editor position
      const rect = monacoEditor.getBoundingClientRect();
      return {
        x: rect.left + 20,
        y: rect.top + 20
      };

    } catch (error) {
      console.error('Error getting cursor position:', error);
      return null;
    }
  }

  /**
   * Set up completion interaction handlers
   */
  setupCompletionInteractions(completionElement, suggestion, monacoEditor) {
    const dragHandle = completionElement.querySelector('.leetpilot-drag-handle');
    const resizeHandle = completionElement.querySelector('.leetpilot-resize-handle');
    const acceptButton = completionElement.querySelector('.leetpilot-btn-accept');
    const rejectButton = completionElement.querySelector('.leetpilot-btn-reject');

    // Drag functionality
    this.setupDragging(completionElement, dragHandle);

    // Resize functionality
    this.setupResizing(completionElement, resizeHandle);

    // Accept button handler
    if (acceptButton) {
      acceptButton.addEventListener('click', () => {
        this.acceptCompletion(suggestion, monacoEditor);
        this.removeExistingCompletion();
      });
    }

    // Reject button handler
    if (rejectButton) {
      rejectButton.addEventListener('click', () => {
        this.removeExistingCompletion();
      });
    }

    // Keyboard shortcuts
    this.keyHandler = (event) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        this.acceptCompletion(suggestion, monacoEditor);
        this.removeExistingCompletion();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.removeExistingCompletion();
      }
    };

    document.addEventListener('keydown', this.keyHandler);

    // Click outside to dismiss
    this.clickHandler = (event) => {
      if (!completionElement.contains(event.target)) {
        this.removeExistingCompletion();
      }
    };

    // Add click handler after a short delay to prevent immediate dismissal
    setTimeout(() => {
      document.addEventListener('click', this.clickHandler);
    }, 100);
  }

  /**
   * Setup dragging functionality
   */
  setupDragging(completionElement, dragHandle) {
    dragHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDragging = true;
      
      const rect = completionElement.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      completionElement.style.zIndex = '10000';
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

        completionElement.style.left = newX + 'px';
        completionElement.style.top = newY + 'px';
        completionElement.style.right = 'auto';
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
  setupResizing(completionElement, resizeHandle) {
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isResizing = true;

      this.resizeStartPos = { x: e.clientX, y: e.clientY };
      this.completionStartSize = {
        width: completionElement.offsetWidth,
        height: completionElement.offsetHeight
      };

      completionElement.style.zIndex = '10000';
      resizeHandle.style.cursor = 'se-resize';

      this.resizeHandler = (e) => {
        if (!this.isResizing) return;

        const deltaX = e.clientX - this.resizeStartPos.x;
        const deltaY = e.clientY - this.resizeStartPos.y;

        const newWidth = Math.max(250, this.completionStartSize.width + deltaX);
        const newHeight = Math.max(150, this.completionStartSize.height + deltaY);

        completionElement.style.width = newWidth + 'px';
        completionElement.style.height = newHeight + 'px';
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
   * Accept and insert completion into editor
   */
  acceptCompletion(suggestion, monacoEditor) {
    if (!monacoEditor) {
      console.warn('Cannot accept completion: editor not available');
      return;
    }

    try {
      const suggestionText = suggestion.suggestion || suggestion;

      // Method 1: Try to insert via textarea
      const textarea = monacoEditor.querySelector('textarea');
      if (textarea) {
        const cursorPos = textarea.selectionStart;
        const currentValue = textarea.value;

        // Insert the suggestion at cursor position
        const newValue = currentValue.slice(0, cursorPos) + suggestionText + currentValue.slice(cursorPos);

        // Update textarea value
        textarea.value = newValue;

        // Move cursor to end of inserted text
        const newCursorPos = cursorPos + suggestionText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);

        // Trigger input event to notify Monaco Editor
        const inputEvent = new Event('input', { bubbles: true });
        textarea.dispatchEvent(inputEvent);

        // Focus back to textarea
        textarea.focus();

        console.log('Completion accepted and inserted');
        return;
      }

      // Method 2: Fallback - try to simulate typing
      this.simulateTyping(suggestionText, monacoEditor);

    } catch (error) {
      console.error('Error accepting completion:', error);
    }
  }

  /**
   * Simulate typing for completion insertion
   */
  simulateTyping(text, monacoEditor) {
    if (!monacoEditor || !text) return;

    const textarea = monacoEditor.querySelector('textarea');
    if (!textarea) return;

    // Focus the textarea
    textarea.focus();

    // Simulate typing each character
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Create and dispatch keyboard events
      const keydownEvent = new KeyboardEvent('keydown', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true
      });

      const keypressEvent = new KeyboardEvent('keypress', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true
      });

      const inputEvent = new InputEvent('input', {
        data: char,
        inputType: 'insertText',
        bubbles: true
      });

      textarea.dispatchEvent(keydownEvent);
      textarea.dispatchEvent(keypressEvent);
      textarea.dispatchEvent(inputEvent);
    }
  }

  /**
   * Remove any existing completion displays
   */
  removeExistingCompletion() {
    // Clean up event listeners
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }

    if (this.dragHandler) {
      document.removeEventListener('mousemove', this.dragHandler);
      this.dragHandler = null;
    }

    if (this.resizeHandler) {
      document.removeEventListener('mousemove', this.resizeHandler);
      this.resizeHandler = null;
    }

    // Remove completion elements
    const existingCompletions = document.querySelectorAll('.leetpilot-completion');
    existingCompletions.forEach(element => {
      element.remove();
    });

    this.activeCompletion = null;
    this.isDragging = false;
    this.isResizing = false;
  }

  /**
   * Check if completion is currently displayed
   */
  isDisplayed() {
    return this.activeCompletion !== null && this.activeCompletion.parentNode;
  }

  /**
   * Get current completion element
   */
  getCurrentCompletion() {
    return this.activeCompletion;
  }

  /**
   * Update completion position (useful for editor scrolling)
   */
  updatePosition(monacoEditor) {
    if (!this.activeCompletion || !monacoEditor) return;

    const cursorPosition = this.getCursorScreenPosition(monacoEditor);
    if (cursorPosition) {
      this.activeCompletion.style.left = cursorPosition.x + 'px';
      this.activeCompletion.style.top = (cursorPosition.y + 20) + 'px';
    }
  }
}