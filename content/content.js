// LeetPilot Content Script
// Integrates with LeetCode's Monaco Editor and handles user interactions

console.log('LeetPilot content script loaded');

// Global variables
let monacoEditor = null;
let isInitialized = false;

// Initialize the extension when the page loads
function initializeLeetPilot() {
  if (isInitialized) return;
  
  console.log('Initializing LeetPilot...');
  
  // Detect Monaco Editor with polling
  detectMonacoEditor();
  
  // Set up keyboard event listeners
  setupKeyboardShortcuts();
  
  isInitialized = true;
}

// Detect Monaco Editor instance
function detectMonacoEditor() {
  console.log('Starting Monaco Editor detection...');
  
  let pollAttempts = 0;
  const maxPollAttempts = 30; // 30 seconds with 1 second intervals
  
  // Polling mechanism for editor detection after page load
  const pollForEditor = setInterval(() => {
    pollAttempts++;
    
    // Look for Monaco Editor instances using multiple selectors
    const editorSelectors = [
      '.monaco-editor',
      '.view-lines',
      '[data-mode-id]',
      '.editor-scrollable'
    ];
    
    let foundEditor = null;
    
    for (const selector of editorSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // Find the main code editor (not auxiliary editors like diff viewers)
        for (const element of elements) {
          const editorContainer = element.closest('.monaco-editor');
          if (editorContainer && isMainCodeEditor(editorContainer)) {
            foundEditor = editorContainer;
            break;
          }
        }
        if (foundEditor) break;
      }
    }
    
    if (foundEditor) {
      console.log('Monaco Editor detected:', foundEditor);
      monacoEditor = foundEditor;
      
      // Hook into the editor
      hookIntoMonacoEditor(foundEditor);
      
      clearInterval(pollForEditor);
    } else if (pollAttempts >= maxPollAttempts) {
      console.warn('Monaco Editor not found after', maxPollAttempts, 'attempts');
      clearInterval(pollForEditor);
    }
  }, 1000);
}

// Check if the editor element is the main code editor
function isMainCodeEditor(editorElement) {
  // Check if this is not a diff viewer or auxiliary editor
  const parentClasses = editorElement.parentElement?.className || '';
  const editorClasses = editorElement.className || '';
  
  // Exclude diff viewers and other auxiliary editors
  if (parentClasses.includes('diff') || editorClasses.includes('diff')) {
    return false;
  }
  
  // Look for indicators that this is the main code editor
  const codeArea = editorElement.querySelector('.view-lines');
  const hasTextArea = editorElement.querySelector('textarea');
  
  return codeArea && hasTextArea;
}

// Hook into Monaco Editor and set up event listeners
function hookIntoMonacoEditor(editorElement) {
  console.log('Hooking into Monaco Editor...');
  
  // Set up mutation observer to detect editor content changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        onEditorContentChange();
      }
    });
  });
  
  // Observe changes in the editor content area
  const viewLines = editorElement.querySelector('.view-lines');
  if (viewLines) {
    observer.observe(viewLines, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
  
  // Set up focus and blur event listeners
  const textarea = editorElement.querySelector('textarea');
  if (textarea) {
    textarea.addEventListener('focus', onEditorFocus);
    textarea.addEventListener('blur', onEditorBlur);
    textarea.addEventListener('keyup', onEditorKeyUp);
    textarea.addEventListener('click', onEditorClick);
  }
  
  // Store the observer for cleanup
  monacoEditor._leetpilotObserver = observer;
  
  console.log('Monaco Editor hooks established');
}

// Event handlers for editor state changes
function onEditorContentChange() {
  // Debounce content change events
  clearTimeout(monacoEditor._contentChangeTimeout);
  monacoEditor._contentChangeTimeout = setTimeout(() => {
    console.log('Editor content changed');
    // Update cached context when content changes
    updateCachedContext();
  }, 300);
}

function onEditorFocus() {
  console.log('Editor focused');
  // Update active editor reference when focused
  updateActiveEditor();
}

function onEditorBlur() {
  console.log('Editor blurred');
}

function onEditorKeyUp(event) {
  // Update cursor position tracking
  updateCursorPosition();
}

function onEditorClick(event) {
  // Update cursor position on click
  updateCursorPosition();
}

// Update active editor reference for multiple editor scenarios
function updateActiveEditor() {
  const allEditors = document.querySelectorAll('.monaco-editor');
  
  if (allEditors.length > 1) {
    // Find the currently focused editor
    for (const editor of allEditors) {
      const textarea = editor.querySelector('textarea');
      if (textarea && document.activeElement === textarea) {
        if (isMainCodeEditor(editor)) {
          monacoEditor = editor;
          console.log('Active editor updated:', editor);
          break;
        }
      }
    }
  }
}

// Update cached context (implementation)
function updateCachedContext() {
  if (!monacoEditor) return;
  
  try {
    // Cache the current context for performance
    const context = extractCodeContext();
    monacoEditor._cachedContext = context;
    console.log('Context cached successfully');
  } catch (error) {
    console.error('Error updating cached context:', error);
  }
}

// Update cursor position tracking (implementation)
function updateCursorPosition() {
  if (!monacoEditor) return;
  
  try {
    const position = extractCursorPosition();
    monacoEditor._lastCursorPosition = position;
    console.log('Cursor position updated:', position);
  } catch (error) {
    console.error('Error updating cursor position:', error);
  }
}

// Set up keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    // Ctrl+Space for code completion
    if (event.ctrlKey && event.code === 'Space') {
      event.preventDefault();
      handleCodeCompletion();
    }
    
    // Alt+E for error explanations
    if (event.altKey && event.code === 'KeyE') {
      event.preventDefault();
      handleErrorExplanation();
    }
    
    // Alt+O for optimizations
    if (event.altKey && event.code === 'KeyO') {
      event.preventDefault();
      handleOptimization();
    }
    
    // Alt+H for hints
    if (event.altKey && event.code === 'KeyH') {
      event.preventDefault();
      handleHint();
    }
  });
}

// Handle code completion request
function handleCodeCompletion() {
  console.log('Code completion triggered');
  
  // Extract code context (will be implemented in task 3.3)
  const context = extractCodeContext();
  
  // Send request to background script
  chrome.runtime.sendMessage({
    type: 'completion',
    context: context
  }, (response) => {
    if (response && response.error) {
      displayError(response.error, response.errorCategory, response.shouldRetry, response);
    } else if (response && response.suggestion) {
      displayCompletion(response.suggestion);
    }
  });
}

// Handle error explanation request
function handleErrorExplanation() {
  console.log('Error explanation triggered');
  
  const context = extractCodeContext();
  
  chrome.runtime.sendMessage({
    type: 'explanation',
    context: context
  }, (response) => {
    if (response && response.error) {
      displayError(response.error, response.errorCategory, response.shouldRetry, response);
    } else if (response && response.explanation) {
      displayExplanation(response.explanation);
    }
  });
}

// Handle optimization request
function handleOptimization() {
  console.log('Optimization triggered');
  
  const context = extractCodeContext();
  
  chrome.runtime.sendMessage({
    type: 'optimization',
    context: context
  }, (response) => {
    if (response && response.error) {
      displayError(response.error, response.errorCategory, response.shouldRetry, response);
    } else if (response && response.optimization) {
      displayOptimization(response.optimization);
    }
  });
}

// Handle hint request
function handleHint() {
  console.log('Hint triggered');
  
  const context = extractCodeContext();
  
  // Get tab ID for session management
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tabId = tabs[0]?.id || 'default';
    
    chrome.runtime.sendMessage({
      type: 'hint',
      context: context,
      tabId: tabId
    }, (response) => {
      if (response && response.error) {
        displayError(response.error, response.errorCategory, response.shouldRetry, response);
      } else if (response && response.hint) {
        displayHint(response);
      }
    });
  });
}

// Extract code context (implementation)
function extractCodeContext() {
  if (!monacoEditor) {
    console.warn('Monaco Editor not available for context extraction');
    return {
      problemTitle: '',
      problemDescription: '',
      currentCode: '',
      cursorPosition: 0,
      language: 'javascript',
      selectedText: ''
    };
  }
  
  try {
    // Extract current code from Monaco Editor
    const currentCode = extractCurrentCode();
    
    // Get cursor position
    const cursorPosition = extractCursorPosition();
    
    // Get selected text
    const selectedText = extractSelectedText();
    
    // Determine programming language
    const language = extractLanguage();
    
    // Parse problem statement from DOM
    const problemInfo = extractProblemStatement();
    
    const context = {
      problemTitle: problemInfo.title,
      problemDescription: problemInfo.description,
      currentCode: currentCode,
      cursorPosition: cursorPosition,
      language: language,
      selectedText: selectedText
    };
    
    // Basic input sanitization to prevent XSS
    const sanitizedContext = sanitizeContext(context);
    
    console.log('Extracted context:', sanitizedContext);
    return sanitizedContext;
    
  } catch (error) {
    console.error('Error extracting code context:', error);
    return {
      problemTitle: '',
      problemDescription: '',
      currentCode: '',
      cursorPosition: 0,
      language: 'javascript',
      selectedText: ''
    };
  }
}

// Sanitize context to prevent XSS and other security issues
function sanitizeContext(context) {
  const sanitized = { ...context };
  
  // Sanitize text fields
  if (sanitized.problemTitle) {
    sanitized.problemTitle = sanitizeText(sanitized.problemTitle);
  }
  
  if (sanitized.problemDescription) {
    sanitized.problemDescription = sanitizeText(sanitized.problemDescription);
  }
  
  if (sanitized.currentCode) {
    // Be more lenient with code sanitization to preserve functionality
    sanitized.currentCode = sanitizeCode(sanitized.currentCode);
  }
  
  if (sanitized.selectedText) {
    sanitized.selectedText = sanitizeText(sanitized.selectedText);
  }
  
  // Ensure cursor position is a valid number
  if (typeof sanitized.cursorPosition !== 'number' || sanitized.cursorPosition < 0) {
    sanitized.cursorPosition = 0;
  }
  
  // Validate language
  const allowedLanguages = [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
    'go', 'rust', 'kotlin', 'swift', 'ruby', 'php', 'scala', 'dart'
  ];
  
  if (!allowedLanguages.includes(sanitized.language)) {
    sanitized.language = 'javascript'; // Default fallback
  }
  
  return sanitized;
}

// Sanitize general text content
function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous content
  let sanitized = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/\x00/g, ''); // Remove null bytes
  
  // Limit length to prevent excessive data
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 9997) + '...';
  }
  
  return sanitized.trim();
}

// Sanitize code content (more lenient to preserve functionality)
function sanitizeCode(code) {
  if (!code || typeof code !== 'string') {
    return '';
  }
  
  // Only remove null bytes and extremely dangerous content
  let sanitized = code
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); // Remove script tags
  
  // Limit length to prevent excessive data
  if (sanitized.length > 50000) {
    sanitized = sanitized.substring(0, 49997) + '...';
  }
  
  return sanitized;
}

// Extract current code from Monaco Editor
function extractCurrentCode() {
  if (!monacoEditor) return '';
  
  // Try multiple methods to get the code content
  
  // Method 1: Get from textarea (most reliable)
  const textarea = monacoEditor.querySelector('textarea');
  if (textarea && textarea.value) {
    return textarea.value;
  }
  
  // Method 2: Get from view lines (visual representation)
  const viewLines = monacoEditor.querySelector('.view-lines');
  if (viewLines) {
    const lines = viewLines.querySelectorAll('.view-line');
    const codeLines = [];
    
    lines.forEach(line => {
      // Extract text content, handling Monaco's span structure
      const spans = line.querySelectorAll('span');
      let lineText = '';
      
      spans.forEach(span => {
        // Skip line numbers and other decorations
        if (!span.classList.contains('line-numbers')) {
          lineText += span.textContent || '';
        }
      });
      
      codeLines.push(lineText);
    });
    
    return codeLines.join('\n');
  }
  
  // Method 3: Fallback to entire editor text content
  return monacoEditor.textContent || '';
}

// Extract cursor position from Monaco Editor
function extractCursorPosition() {
  if (!monacoEditor) return 0;
  
  const textarea = monacoEditor.querySelector('textarea');
  if (textarea) {
    return textarea.selectionStart || 0;
  }
  
  // Fallback: try to determine position from visual cursor
  const cursor = monacoEditor.querySelector('.cursor');
  if (cursor) {
    // This is a rough approximation based on cursor position
    const viewLines = monacoEditor.querySelector('.view-lines');
    if (viewLines) {
      const lines = viewLines.querySelectorAll('.view-line');
      let position = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineRect = line.getBoundingClientRect();
        const cursorRect = cursor.getBoundingClientRect();
        
        if (cursorRect.top >= lineRect.top && cursorRect.top <= lineRect.bottom) {
          // Cursor is on this line, estimate character position
          const lineText = line.textContent || '';
          const charWidth = lineRect.width / lineText.length;
          const charPosition = Math.floor((cursorRect.left - lineRect.left) / charWidth);
          position += Math.min(charPosition, lineText.length);
          break;
        } else {
          position += (line.textContent || '').length + 1; // +1 for newline
        }
      }
      
      return position;
    }
  }
  
  return 0;
}

// Extract selected text from Monaco Editor
function extractSelectedText() {
  if (!monacoEditor) return '';
  
  const textarea = monacoEditor.querySelector('textarea');
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      return textarea.value.substring(start, end);
    }
  }
  
  // Fallback: check for browser selection
  const selection = window.getSelection();
  if (selection && selection.toString()) {
    // Verify the selection is within the editor
    const range = selection.getRangeAt(0);
    if (monacoEditor.contains(range.commonAncestorContainer)) {
      return selection.toString();
    }
  }
  
  return '';
}

// Extract programming language from Monaco Editor
function extractLanguage() {
  if (!monacoEditor) return 'javascript';
  
  // Method 1: Check for language indicator in editor attributes
  const languageElement = monacoEditor.querySelector('[data-mode-id]');
  if (languageElement) {
    const modeId = languageElement.getAttribute('data-mode-id');
    if (modeId) {
      return mapMonacoLanguage(modeId);
    }
  }
  
  // Method 2: Check for language selector in the page
  const languageSelector = document.querySelector('[data-cy="lang-select"]') || 
                          document.querySelector('.ant-select-selection-item') ||
                          document.querySelector('[class*="language"]');
  
  if (languageSelector) {
    const languageText = languageSelector.textContent?.toLowerCase() || '';
    return mapLanguageName(languageText);
  }
  
  // Method 3: Try to detect from URL or page context
  const url = window.location.href;
  if (url.includes('python')) return 'python';
  if (url.includes('java')) return 'java';
  if (url.includes('cpp') || url.includes('c++')) return 'cpp';
  
  // Default fallback
  return 'javascript';
}

// Map Monaco Editor language IDs to standard language names
function mapMonacoLanguage(modeId) {
  const languageMap = {
    'javascript': 'javascript',
    'typescript': 'typescript',
    'python': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'csharp': 'csharp',
    'go': 'go',
    'rust': 'rust',
    'kotlin': 'kotlin',
    'swift': 'swift',
    'ruby': 'ruby',
    'php': 'php'
  };
  
  return languageMap[modeId] || modeId;
}

// Map language display names to standard language names
function mapLanguageName(displayName) {
  const nameMap = {
    'javascript': 'javascript',
    'python': 'python',
    'python3': 'python',
    'java': 'java',
    'c++': 'cpp',
    'cpp': 'cpp',
    'c': 'c',
    'c#': 'csharp',
    'csharp': 'csharp',
    'go': 'go',
    'golang': 'go',
    'rust': 'rust',
    'kotlin': 'kotlin',
    'swift': 'swift',
    'ruby': 'ruby',
    'php': 'php',
    'typescript': 'typescript'
  };
  
  return nameMap[displayName] || 'javascript';
}

// Extract problem statement from LeetCode page DOM
function extractProblemStatement() {
  try {
    // Method 1: Look for problem title in common selectors
    let title = '';
    const titleSelectors = [
      '[data-cy="question-title"]',
      '.css-v3d350', // Common LeetCode title class
      'h1[class*="title"]',
      '.question-title',
      'h1'
    ];
    
    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent) {
        title = titleElement.textContent.trim();
        break;
      }
    }
    
    // Method 2: Look for problem description
    let description = '';
    const descriptionSelectors = [
      '[data-cy="question-content"]',
      '.question-content',
      '.css-1jqueqk', // Common LeetCode description class
      '[class*="description"]',
      '.problem-statement'
    ];
    
    for (const selector of descriptionSelectors) {
      const descElement = document.querySelector(selector);
      if (descElement && descElement.textContent) {
        description = descElement.textContent.trim();
        // Limit description length to avoid overly long context
        if (description.length > 2000) {
          description = description.substring(0, 2000) + '...';
        }
        break;
      }
    }
    
    // Fallback: extract from page title if no specific elements found
    if (!title) {
      const pageTitle = document.title;
      if (pageTitle && pageTitle.includes('LeetCode')) {
        // Extract problem name from page title
        const match = pageTitle.match(/(\d+\.\s*[^-|]+)/);
        if (match) {
          title = match[1].trim();
        }
      }
    }
    
    return {
      title: title || 'Unknown Problem',
      description: description || 'Problem description not found'
    };
    
  } catch (error) {
    console.error('Error extracting problem statement:', error);
    return {
      title: 'Unknown Problem',
      description: 'Problem description not found'
    };
  }
}

// Display completion inline within Monaco Editor
function displayCompletion(suggestion) {
  console.log('Displaying completion:', suggestion);
  
  if (!monacoEditor || !suggestion) {
    console.warn('Cannot display completion: editor or suggestion not available');
    return;
  }
  
  try {
    // Remove any existing completion display
    removeExistingCompletion();
    
    // Create and inject the completion UI
    const completionElement = createCompletionElement(suggestion);
    injectCompletionIntoEditor(completionElement);
    
    // Set up completion interaction handlers
    setupCompletionInteractions(completionElement, suggestion);
    
    console.log('Completion displayed successfully');
  } catch (error) {
    console.error('Error displaying completion:', error);
  }
}

// Remove any existing completion displays
function removeExistingCompletion() {
  const existingCompletions = document.querySelectorAll('.leetpilot-completion');
  existingCompletions.forEach(element => {
    // Clean up event listeners
    if (element._keyHandler) {
      document.removeEventListener('keydown', element._keyHandler);
    }
    if (element._clickHandler) {
      document.removeEventListener('click', element._clickHandler);
    }
    element.remove();
  });
}

// Remove any existing displays (completions, explanations, etc.)
function removeExistingDisplays() {
  const existingDisplays = document.querySelectorAll('.leetpilot-display, .leetpilot-completion, .leetpilot-popup, .leetpilot-overlay');
  existingDisplays.forEach(element => {
    // Clean up event listeners
    if (element._keyHandler) {
      document.removeEventListener('keydown', element._keyHandler);
    }
    if (element._clickHandler) {
      document.removeEventListener('click', element._clickHandler);
    }
    element.remove();
  });
}

// Create completion element with LeetCode-matching styling
function createCompletionElement(suggestion) {
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
  
  // Add LeetCode-matching styles
  addCompletionStyles(completionContainer);
  
  return completionContainer;
}

// Add CSS styles that match LeetCode's interface
function addCompletionStyles(element) {
  // Create or get existing style element
  let styleElement = document.getElementById('leetpilot-styles');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'leetpilot-styles';
    document.head.appendChild(styleElement);
  }
  
  // Add comprehensive styles for completion display
  const styles = `
    .leetpilot-completion {
      position: absolute;
      z-index: 10000;
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
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
      color: #d4d4d4;
      background: #2d2d30;
      border: 1px solid #3e3e42;
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
    
    .leetpilot-btn {
      background: #0e4f88;
      border: 1px solid #1f6391;
      border-radius: 4px;
      color: #ffffff;
      cursor: pointer;
      font-size: 12px;
      padding: 6px 12px;
      transition: all 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .leetpilot-btn:hover {
      background: #1f6391;
      border-color: #2980b9;
    }
    
    .leetpilot-btn:active {
      background: #0d4377;
      transform: translateY(1px);
    }
    
    .leetpilot-btn-accept {
      background: #28a745;
      border-color: #34ce57;
    }
    
    .leetpilot-btn-accept:hover {
      background: #34ce57;
      border-color: #28a745;
    }
    
    .leetpilot-btn-reject {
      background: #6c757d;
      border-color: #868e96;
    }
    
    .leetpilot-btn-reject:hover {
      background: #868e96;
      border-color: #6c757d;
    }
    
    /* Popup styles for explanations, optimizations, and hints */
    .leetpilot-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10001;
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .leetpilot-popup.leetpilot-error {
      border-color: #dc3545;
      box-shadow: 0 8px 24px rgba(220, 53, 69, 0.2);
    }
    
    .leetpilot-popup-header {
      background: #2d2d30;
      border-bottom: 1px solid #3c3c3c;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .leetpilot-error .leetpilot-popup-header {
      background: #dc3545;
      border-bottom-color: #c82333;
    }
    
    .leetpilot-popup-title {
      color: #ffffff;
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    
    .leetpilot-popup-close {
      background: none;
      border: none;
      color: #cccccc;
      cursor: pointer;
      font-size: 18px;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }
    
    .leetpilot-popup-close:hover {
      background: #3c3c3c;
      color: #ffffff;
    }
    
    .leetpilot-error .leetpilot-popup-close:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .leetpilot-popup-content {
      padding: 16px;
      color: #d4d4d4;
      line-height: 1.6;
    }
    
    .leetpilot-error-message {
      margin: 0 0 16px 0;
      color: #ffffff;
      font-weight: 500;
    }
    
    .leetpilot-error-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
    }
    
    .leetpilot-btn-retry {
      background: #28a745;
      border-color: #34ce57;
    }
    
    .leetpilot-btn-retry:hover {
      background: #34ce57;
      border-color: #28a745;
    }
    
    /* Progressive hint styles */
    .leetpilot-hint-progress {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #3c3c3c;
    }
    
    .leetpilot-progress-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #3c3c3c;
      transition: background-color 0.2s ease;
    }
    
    .leetpilot-progress-dot.active {
      background: #0e4f88;
    }
    
    .leetpilot-hint-content {
      margin-bottom: 16px;
    }
    
    .leetpilot-hint-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid #3c3c3c;
    }
    
    .leetpilot-btn-next-hint {
      background: #0e4f88;
      border-color: #1f6391;
    }
    
    .leetpilot-btn-next-hint:hover {
      background: #1f6391;
      border-color: #2980b9;
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
      background: #2d2d30;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      padding: 12px;
      margin: 12px 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      overflow-x: auto;
    }
    
    /* Overlay for popups */
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
    
    /* Dark theme adjustments for LeetCode */
    .dark .leetpilot-completion,
    .dark .leetpilot-popup {
      background: #1a1a1a;
      border-color: #333333;
    }
    
    .dark .leetpilot-suggestion-text,
    .dark .leetpilot-popup-content pre {
      background: #262626;
      border-color: #404040;
    }
    
    .dark .leetpilot-popup-header {
      background: #262626;
      border-color: #333333;
    }
    
    /* Light theme adjustments */
    .light .leetpilot-completion,
    .light .leetpilot-popup {
      background: #ffffff;
      border-color: #e1e4e8;
      color: #24292e;
    }
    
    .light .leetpilot-suggestion-text,
    .light .leetpilot-popup-content pre {
      background: #f6f8fa;
      border-color: #e1e4e8;
      color: #24292e;
    }
    
    .light .leetpilot-popup-header {
      background: #f6f8fa;
      border-color: #e1e4e8;
    }
    
    .light .leetpilot-popup-title {
      color: #24292e;
    }
    
    .light .leetpilot-popup-close {
      color: #586069;
    }
    
    .light .leetpilot-popup-close:hover {
      background: #e1e4e8;
      color: #24292e;
    }
  `;
  
  styleElement.textContent = styles;
}

// Inject completion element into the Monaco Editor
function injectCompletionIntoEditor(completionElement) {
  if (!monacoEditor || !completionElement) {
    console.warn('Cannot inject completion: editor or element not available');
    return;
  }
  
  // Find the best position to inject the completion
  const cursorPosition = getCursorScreenPosition();
  
  // Position the completion element
  if (cursorPosition) {
    completionElement.style.left = cursorPosition.x + 'px';
    completionElement.style.top = (cursorPosition.y + 20) + 'px'; // 20px below cursor
  } else {
    // Fallback positioning relative to editor
    const editorRect = monacoEditor.getBoundingClientRect();
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
      removeExistingCompletion();
    }
  }, 30000);
}

// Get cursor screen position for positioning completion
function getCursorScreenPosition() {
  if (!monacoEditor) return null;
  
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

// Set up completion interaction handlers
function setupCompletionInteractions(completionElement, suggestion) {
  if (!completionElement) return;
  
  const acceptButton = completionElement.querySelector('.leetpilot-btn-accept');
  const rejectButton = completionElement.querySelector('.leetpilot-btn-reject');
  
  // Accept button handler
  if (acceptButton) {
    acceptButton.addEventListener('click', () => {
      acceptCompletion(suggestion);
      removeExistingCompletion();
    });
  }
  
  // Reject button handler
  if (rejectButton) {
    rejectButton.addEventListener('click', () => {
      removeExistingCompletion();
    });
  }
  
  // Keyboard shortcuts
  const keyHandler = (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      acceptCompletion(suggestion);
      removeExistingCompletion();
      document.removeEventListener('keydown', keyHandler);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      removeExistingCompletion();
      document.removeEventListener('keydown', keyHandler);
    }
  };
  
  document.addEventListener('keydown', keyHandler);
  
  // Store the handler for cleanup
  completionElement._keyHandler = keyHandler;
  
  // Click outside to dismiss
  const clickHandler = (event) => {
    if (!completionElement.contains(event.target)) {
      removeExistingCompletion();
      document.removeEventListener('click', clickHandler);
    }
  };
  
  // Add click handler after a short delay to prevent immediate dismissal
  setTimeout(() => {
    document.addEventListener('click', clickHandler);
    completionElement._clickHandler = clickHandler;
  }, 100);
}

// Accept and insert completion into editor
function acceptCompletion(suggestion) {
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
    simulateTyping(suggestionText);
    
  } catch (error) {
    console.error('Error accepting completion:', error);
  }
}

// Simulate typing for completion insertion
function simulateTyping(text) {
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

// Display error message to user with comprehensive error handling
function displayError(errorMessage, errorCategory, shouldRetry, errorResponse = {}) {
  console.log('Displaying error:', errorMessage, 'Category:', errorCategory);
  
  if (!monacoEditor || !errorMessage) {
    console.warn('Cannot display error: editor or message not available');
    return;
  }
  
  try {
    // Remove any existing displays
    removeExistingDisplays();
    
    // Create and show error popup with enhanced information
    const errorElement = createEnhancedErrorElement(errorMessage, errorCategory, shouldRetry, errorResponse);
    injectPopupIntoEditor(errorElement, 'error');
    
    console.log('Error displayed successfully');
  } catch (error) {
    console.error('Error displaying error message:', error);
  }
}

// Create enhanced error popup element with retry information
function createEnhancedErrorElement(errorMessage, errorCategory, shouldRetry, errorResponse = {}) {
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
  switch (errorCategory) {
    case 'network':
      titleElement.textContent = 'Connection Error';
      break;
    case 'auth':
      titleElement.textContent = 'Authentication Error';
      break;
    case 'rate_limit':
      titleElement.textContent = 'Rate Limit Exceeded';
      break;
    case 'quota':
      titleElement.textContent = 'Usage Limit Reached';
      break;
    case 'config':
      titleElement.textContent = 'Configuration Required';
      break;
    case 'validation':
      titleElement.textContent = 'Invalid Request';
      break;
    case 'timeout':
      titleElement.textContent = 'Request Timeout';
      break;
    default:
      titleElement.textContent = 'LeetPilot Error';
  }
  
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
  
  // Add specific guidance based on error category
  const guidanceElement = createErrorGuidance(errorCategory, errorResponse);
  if (guidanceElement) {
    contentElement.appendChild(guidanceElement);
  }
  
  // Add action buttons
  const actionContainer = document.createElement('div');
  actionContainer.className = 'leetpilot-error-actions';
  
  // Retry button if applicable
  if (shouldRetry && errorResponse.retryDelay !== undefined) {
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
      removeExistingDisplays();
      retryLastAction();
    });
    
    actionContainer.appendChild(retryButton);
  }
  
  // Configuration button for config errors
  if (errorCategory === 'config' || errorCategory === 'auth') {
    const configButton = document.createElement('button');
    configButton.className = 'leetpilot-btn leetpilot-btn-config';
    configButton.textContent = 'Open Settings';
    configButton.title = 'Open extension configuration';
    configButton.style.background = '#28a745';
    configButton.style.borderColor = '#34ce57';
    
    configButton.addEventListener('click', () => {
      // Open extension popup for configuration
      chrome.runtime.sendMessage({ type: 'openConfiguration' });
      removeExistingDisplays();
    });
    
    actionContainer.appendChild(configButton);
  }
  
  if (actionContainer.children.length > 0) {
    contentElement.appendChild(actionContainer);
  }
  
  // Assemble popup
  popup.appendChild(header);
  popup.appendChild(contentElement);
  overlay.appendChild(popup);
  
  // Set up event handlers
  setupPopupInteractions(overlay, popup, closeButton);
  
  return overlay;
}

// Create error-specific guidance
function createErrorGuidance(errorCategory, errorResponse) {
  const guidanceContainer = document.createElement('div');
  guidanceContainer.className = 'leetpilot-error-guidance';
  guidanceContainer.style.marginTop = '12px';
  guidanceContainer.style.padding = '8px';
  guidanceContainer.style.background = 'rgba(255, 193, 7, 0.1)';
  guidanceContainer.style.borderLeft = '3px solid #ffc107';
  guidanceContainer.style.fontSize = '13px';
  
  let guidanceText = '';
  
  switch (errorCategory) {
    case 'network':
      guidanceText = 'Check your internet connection and try again. If the problem persists, the AI service might be experiencing issues.';
      break;
    case 'auth':
      guidanceText = 'Verify your API key is correct and has the necessary permissions. You can update it in the extension settings.';
      break;
    case 'rate_limit':
      if (errorResponse.retryDelay) {
        const waitMinutes = Math.ceil(errorResponse.retryDelay / 60000);
        guidanceText = `Please wait ${waitMinutes} minute(s) before making another request. Consider upgrading your API plan for higher limits.`;
      } else {
        guidanceText = 'You\'ve made too many requests recently. Please wait before trying again.';
      }
      break;
    case 'quota':
      guidanceText = 'You\'ve reached your usage limit. Check your account billing or upgrade your plan to continue using the service.';
      break;
    case 'config':
      guidanceText = 'Configure your AI provider settings by clicking the extension icon and entering your API key.';
      break;
    case 'validation':
      guidanceText = 'There was an issue with your request. Try selecting different code or rephrasing your request.';
      break;
    case 'timeout':
      guidanceText = 'The request took too long to complete. The AI service might be experiencing high load.';
      break;
    default:
      return null; // No guidance for unknown errors
  }
  
  if (guidanceText) {
    const guidanceP = document.createElement('p');
    guidanceP.textContent = guidanceText;
    guidanceP.style.margin = '0';
    guidanceContainer.appendChild(guidanceP);
    return guidanceContainer;
  }
  
  return null;
}

// Create error popup element
function createErrorElement(errorMessage, errorCategory, shouldRetry) {
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
  titleElement.textContent = 'LeetPilot Error';
  
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
  
  // Add retry button if applicable
  if (shouldRetry) {
    const retryButton = document.createElement('button');
    retryButton.className = 'leetpilot-btn leetpilot-btn-retry';
    retryButton.textContent = 'Try Again';
    retryButton.title = 'Retry the last action';
    
    retryButton.addEventListener('click', () => {
      removeExistingDisplays();
      // Retry the last action based on category
      retryLastAction();
    });
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'leetpilot-error-actions';
    buttonContainer.appendChild(retryButton);
    contentElement.appendChild(buttonContainer);
  }
  
  // Assemble popup
  popup.appendChild(header);
  popup.appendChild(contentElement);
  overlay.appendChild(popup);
  
  // Set up event handlers
  setupPopupInteractions(overlay, popup, closeButton);
  
  return overlay;
}

// Retry the last action (simple implementation)
function retryLastAction() {
  // This is a simple retry mechanism - in a more sophisticated implementation,
  // we would track the last action and retry it specifically
  console.log('Retrying last action...');
  
  // For now, we'll just trigger code completion as it's the most common action
  setTimeout(() => {
    handleCodeCompletion();
  }, 1000);
}

// Display explanation (placeholder)
function displayExplanation(explanation) {
  
  if (!monacoEditor || !explanation) {
    console.warn('Cannot display explanation: editor or explanation not available');
    return;
  }
  
  try {
    // Remove any existing displays
    removeExistingDisplays();
    
    // Create and show explanation popup
    const explanationElement = createExplanationElement(explanation);
    injectPopupIntoEditor(explanationElement, 'explanation');
    
    console.log('Explanation displayed successfully');
  } catch (error) {
    console.error('Error displaying explanation:', error);
  }
}

// Display optimization (placeholder)
function displayOptimization(optimization) {
  console.log('Displaying optimization:', optimization);
  
  if (!monacoEditor || !optimization) {
    console.warn('Cannot display optimization: editor or optimization not available');
    return;
  }
  
  try {
    // Remove any existing displays
    removeExistingDisplays();
    
    // Create and show optimization popup
    const optimizationElement = createOptimizationElement(optimization);
    injectPopupIntoEditor(optimizationElement, 'optimization');
    
    console.log('Optimization displayed successfully');
  } catch (error) {
    console.error('Error displaying optimization:', error);
  }
}

// Display hint (placeholder)
function displayHint(hintResponse) {
  console.log('Displaying hint:', hintResponse);
  
  if (!monacoEditor || !hintResponse) {
    console.warn('Cannot display hint: editor or hint not available');
    return;
  }
  
  try {
    // Remove any existing displays
    removeExistingDisplays();
    
    // Create and show hint popup with progressive information
    const hintElement = createProgressiveHintElement(hintResponse);
    injectPopupIntoEditor(hintElement, 'hint');
    
    console.log('Hint displayed successfully');
  } catch (error) {
    console.error('Error displaying hint:', error);
  }
}

// Create progressive hint popup element with enhanced information display
function createProgressiveHintElement(hintResponse) {
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
  
  // Create content
  const contentElement = document.createElement('div');
  contentElement.className = 'leetpilot-popup-content';
  
  // Enhanced progress indicator
  const progressContainer = document.createElement('div');
  progressContainer.className = 'leetpilot-hint-progress';
  
  for (let i = 1; i <= maxHintLevel; i++) {
    const progressDot = document.createElement('div');
    progressDot.className = 'leetpilot-progress-dot';
    if (i <= hintLevel) {
      progressDot.classList.add('active');
    }
    
    // Add tooltip for progress dots
    progressDot.title = `Hint ${i}: ${getHintLevelDescription(i)}`;
    
    progressContainer.appendChild(progressDot);
  }
  
  contentElement.appendChild(progressContainer);
  
  // Progress information
  if (progression && (progression.progressScore > 0 || progression.conceptsIntroduced.length > 0)) {
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
      contentElement.appendChild(progressInfo);
    }
  }
  
  // Hint content
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
  
  contentElement.appendChild(hintContent);
  
  // Next hint guidance
  if (nextHintAvailable && nextHintType && !maxReached) {
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
    nextHintDesc.textContent = getHintLevelDescription(hintLevel + 1);
    
    nextHintInfo.appendChild(nextHintTitle);
    nextHintInfo.appendChild(nextHintDesc);
    contentElement.appendChild(nextHintInfo);
  }
  
  // Action buttons
  const actionContainer = document.createElement('div');
  actionContainer.className = 'leetpilot-hint-actions';
  
  if (!maxReached) {
    // Next hint button (if not at max level)
    if (nextHintAvailable) {
      const nextHintButton = document.createElement('button');
      nextHintButton.className = 'leetpilot-btn leetpilot-btn-next-hint';
      nextHintButton.textContent = `Next Hint (${hintLevel + 1}/${maxHintLevel})`;
      nextHintButton.title = `Get hint level ${hintLevel + 1}: ${getHintLevelDescription(hintLevel + 1)}`;
      
      nextHintButton.addEventListener('click', () => {
        removeExistingDisplays();
        handleHint(); // Request next hint
      });
      
      actionContainer.appendChild(nextHintButton);
    }
    
    // Reset hints button
    const resetButton = document.createElement('button');
    resetButton.className = 'leetpilot-btn leetpilot-btn-reset';
    resetButton.textContent = 'Reset Hints';
    resetButton.title = 'Start over with hints for this problem';
    
    resetButton.addEventListener('click', () => {
      resetHintSession();
      removeExistingDisplays();
    });
    
    actionContainer.appendChild(resetButton);
  } else {
    // Max hints reached - show restart option
    const restartButton = document.createElement('button');
    restartButton.className = 'leetpilot-btn leetpilot-btn-reset';
    restartButton.textContent = 'Start New Hint Session';
    restartButton.title = 'Reset and start over with fresh hints';
    
    restartButton.addEventListener('click', () => {
      resetHintSession();
      removeExistingDisplays();
      // Automatically request first hint
      setTimeout(() => handleHint(), 500);
    });
    
    actionContainer.appendChild(restartButton);
  }
  
  contentElement.appendChild(actionContainer);
  
  // Session info (for debugging/transparency)
  if (sessionInfo && (sessionInfo.hintsRemaining !== undefined)) {
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
    
    contentElement.appendChild(sessionInfoElement);
  }
  
  // Assemble popup
  popup.appendChild(header);
  popup.appendChild(contentElement);
  overlay.appendChild(popup);
  
  // Set up event handlers
  setupPopupInteractions(overlay, popup, closeButton);
  
  return overlay;
}

// Get description for hint level
function getHintLevelDescription(level) {
  const descriptions = {
    1: 'Problem understanding and high-level approach',
    2: 'Algorithm structure and data organization', 
    3: 'Implementation guidance and techniques',
    4: 'Edge cases and optimization strategies'
  };
  
  return descriptions[level] || 'Additional guidance';
}

// Reset hint session for current problem
function resetHintSession() {
  const context = extractCodeContext();
  
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tabId = tabs[0]?.id || 'default';
    
    chrome.runtime.sendMessage({
      type: 'resetHints',
      problemTitle: context.problemTitle,
      tabId: tabId
    });
  });
}

// Create explanation popup element
function createExplanationElement(explanation) {
  return createPopupElement('Error Explanation', explanation.explanation || explanation, 'explanation');
}

// Create optimization popup element
function createOptimizationElement(optimization) {
  return createPopupElement('Code Optimization', optimization.optimization || optimization, 'optimization');
}

// Create hint popup element
function createHintElement(hint) {
  return createPopupElement('Hint', hint.hint || hint, 'hint');
}

// Create generic popup element
function createPopupElement(title, content, type) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'leetpilot-overlay leetpilot-display';
  
  // Create popup container
  const popup = document.createElement('div');
  popup.className = `leetpilot-popup leetpilot-${type}`;
  
  // Create header
  const header = document.createElement('div');
  header.className = 'leetpilot-popup-header';
  
  const titleElement = document.createElement('h3');
  titleElement.className = 'leetpilot-popup-title';
  titleElement.textContent = title;
  
  const closeButton = document.createElement('button');
  closeButton.className = 'leetpilot-popup-close';
  closeButton.innerHTML = '×';
  closeButton.title = 'Close (Esc)';
  
  header.appendChild(titleElement);
  header.appendChild(closeButton);
  
  // Create content
  const contentElement = document.createElement('div');
  contentElement.className = 'leetpilot-popup-content';
  
  // Format content based on type
  if (typeof content === 'string') {
    // Check if content looks like code
    if (content.includes('\n') && (content.includes('{') || content.includes('def ') || content.includes('function'))) {
      const preElement = document.createElement('pre');
      preElement.textContent = content;
      contentElement.appendChild(preElement);
    } else {
      // Regular text content
      const paragraphs = content.split('\n\n');
      paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
          const p = document.createElement('p');
          p.textContent = paragraph.trim();
          contentElement.appendChild(p);
        }
      });
    }
  } else {
    // Handle object content
    const preElement = document.createElement('pre');
    preElement.textContent = JSON.stringify(content, null, 2);
    contentElement.appendChild(preElement);
  }
  
  // Assemble popup
  popup.appendChild(header);
  popup.appendChild(contentElement);
  overlay.appendChild(popup);
  
  // Set up event handlers
  setupPopupInteractions(overlay, popup, closeButton);
  
  return overlay;
}

// Inject popup into the page
function injectPopupIntoEditor(popupElement, type) {
  if (!popupElement) {
    console.warn('Cannot inject popup: element not available');
    return;
  }
  
  // Add to page
  document.body.appendChild(popupElement);
  
  // Trigger animation
  setTimeout(() => {
    popupElement.classList.add('show');
  }, 10);
  
  // Auto-dismiss after 60 seconds for popups (longer than completions)
  setTimeout(() => {
    if (popupElement.parentNode) {
      removeExistingDisplays();
    }
  }, 60000);
}

// Set up popup interaction handlers
function setupPopupInteractions(overlay, popup, closeButton) {
  if (!overlay || !popup || !closeButton) return;
  
  // Close button handler
  closeButton.addEventListener('click', () => {
    removeExistingDisplays();
  });
  
  // Overlay click to close
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      removeExistingDisplays();
    }
  });
  
  // Keyboard shortcuts
  const keyHandler = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      removeExistingDisplays();
      document.removeEventListener('keydown', keyHandler);
    }
  };
  
  document.addEventListener('keydown', keyHandler);
  
  // Store the handler for cleanup
  overlay._keyHandler = keyHandler;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLeetPilot);
} else {
  initializeLeetPilot();
}