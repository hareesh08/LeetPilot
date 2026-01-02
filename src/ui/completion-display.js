// LeetPilot Completion Display
// Handles the display and interaction of code completion suggestions

/**
 * Completion Display Manager
 * Handles the display and interaction of code completion suggestions
 */
export class CompletionDisplay {
  constructor() {
    this.activeCompletion = null;
    this.keyHandler = null;
    this.clickHandler = null;
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
    acceptButton.textContent = 'Accept (Tab)';
    acceptButton.title = 'Accept this suggestion';

    const rejectButton = document.createElement('button');
    rejectButton.className = 'leetpilot-btn leetpilot-btn-reject';
    rejectButton.textContent = 'Dismiss (Esc)';
    rejectButton.title = 'Dismiss this suggestion';

    actionButtons.appendChild(acceptButton);
    actionButtons.appendChild(rejectButton);

    completionContent.appendChild(suggestionText);
    completionContent.appendChild(actionButtons);
    completionContainer.appendChild(completionContent);

    return completionContainer;
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
    const acceptButton = completionElement.querySelector('.leetpilot-btn-accept');
    const rejectButton = completionElement.querySelector('.leetpilot-btn-reject');

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

    // Remove completion elements
    const existingCompletions = document.querySelectorAll('.leetpilot-completion');
    existingCompletions.forEach(element => {
      element.remove();
    });

    this.activeCompletion = null;
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