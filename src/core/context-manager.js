// LeetPilot Context Manager
// Extracts and manages code context from Monaco Editor

/**
 * Context Manager for extracting and managing code context
 */
export class ContextManager {
  constructor() {
    this.contextCache = new Map();
    this.lastExtractedContext = null;
  }

  /**
   * Extract comprehensive code context from Monaco Editor
   */
  extractCodeContext(monacoEditor) {
    if (!monacoEditor) {
      return this.createEmptyContext(true);
    }

    try {
      // Extract current code from Monaco Editor
      const currentCode = this.extractCurrentCode(monacoEditor);
      
      // Get cursor position
      const cursorPosition = this.extractCursorPosition(monacoEditor);
      
      // Get selected text
      const selectedText = this.extractSelectedText(monacoEditor);
      
      // Determine programming language
      const language = this.extractLanguage(monacoEditor);
      
      // Parse problem statement from DOM
      const problemInfo = this.extractProblemStatement();
      
      const context = {
        problemTitle: problemInfo.title,
        problemDescription: problemInfo.description,
        currentCode: currentCode,
        cursorPosition: cursorPosition,
        language: language,
        selectedText: selectedText,
        editorNotFound: false,
        timestamp: Date.now()
      };
      
      // Cache the context
      this.lastExtractedContext = context;
      this.contextCache.set('latest', context);
      
      console.log('Context extracted successfully:', this.sanitizeContextForLogging(context));
      return context;
      
    } catch (error) {
      console.error('Error extracting code context:', error);
      return this.createEmptyContext(true, error.message);
    }
  }

  /**
   * Create empty context object
   */
  createEmptyContext(editorNotFound = false, errorMessage = null) {
    return {
      problemTitle: '',
      problemDescription: '',
      currentCode: '',
      cursorPosition: 0,
      language: 'javascript',
      selectedText: '',
      editorNotFound: editorNotFound,
      error: errorMessage,
      timestamp: Date.now()
    };
  }

  /**
   * Extract current code from Monaco Editor
   */
  extractCurrentCode(monacoEditor) {
    // Method 1: Get from textarea (most reliable)
    const textarea = monacoEditor.querySelector('textarea');
    if (textarea && textarea.value) {
      return textarea.value;
    }
    
    // Method 2: Get from input area (alternative textarea selector)
    const inputArea = monacoEditor.querySelector('.inputarea textarea');
    if (inputArea && inputArea.value) {
      return inputArea.value;
    }
    
    // Method 3: Get from view lines (visual representation)
    const viewLines = monacoEditor.querySelector('.view-lines') || 
                     monacoEditor.querySelector('.lines-content');
    if (viewLines) {
      return this.extractCodeFromViewLines(viewLines);
    }
    
    // Method 4: Try to find any contenteditable element
    const contentEditable = monacoEditor.querySelector('[contenteditable="true"]');
    if (contentEditable) {
      return contentEditable.textContent || '';
    }
    
    // Method 5: Fallback to entire editor text content
    return this.cleanEditorText(monacoEditor.textContent || '');
  }

  /**
   * Extract code from Monaco's view lines
   */
  extractCodeFromViewLines(viewLines) {
    const lines = viewLines.querySelectorAll('.view-line, [class*="view-line"]');
    const codeLines = [];
    
    lines.forEach(line => {
      // Extract text content, handling Monaco's span structure
      const spans = line.querySelectorAll('span');
      let lineText = '';
      
      if (spans.length > 0) {
        spans.forEach(span => {
          // Skip line numbers and other decorations
          if (!span.classList.contains('line-numbers') && 
              !span.classList.contains('margin') &&
              !span.classList.contains('glyph-margin')) {
            lineText += span.textContent || '';
          }
        });
      } else {
        // Fallback to entire line text content
        lineText = line.textContent || '';
      }
      
      codeLines.push(lineText);
    });
    
    return codeLines.join('\n');
  }

  /**
   * Clean editor text by removing UI elements
   */
  cleanEditorText(text) {
    const lines = text.split('\n');
    const cleanedLines = lines.filter(line => {
      // Filter out line numbers and empty lines
      const trimmed = line.trim();
      return trimmed && !(/^\d+$/.test(trimmed));
    });
    
    return cleanedLines.join('\n');
  }

  /**
   * Extract cursor position from Monaco Editor
   */
  extractCursorPosition(monacoEditor) {
    const textarea = monacoEditor.querySelector('textarea');
    if (textarea) {
      return textarea.selectionStart || 0;
    }
    
    // Fallback: try to determine position from visual cursor
    const cursor = monacoEditor.querySelector('.cursor');
    if (cursor) {
      return this.estimateCursorPosition(monacoEditor, cursor);
    }
    
    return 0;
  }

  /**
   * Estimate cursor position from visual cursor element
   */
  estimateCursorPosition(monacoEditor, cursor) {
    const viewLines = monacoEditor.querySelector('.view-lines');
    if (!viewLines) return 0;
    
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

  /**
   * Extract selected text from Monaco Editor
   */
  extractSelectedText(monacoEditor) {
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

  /**
   * Extract programming language from Monaco Editor
   */
  extractLanguage(monacoEditor) {
    // Method 1: Check for language indicator in editor attributes
    const languageElement = monacoEditor.querySelector('[data-mode-id]');
    if (languageElement) {
      const modeId = languageElement.getAttribute('data-mode-id');
      if (modeId) {
        return this.mapMonacoLanguage(modeId);
      }
    }
    
    // Method 2: Check for language selector in the page
    const languageSelector = document.querySelector('[data-cy="lang-select"]') || 
                            document.querySelector('.ant-select-selection-item') ||
                            document.querySelector('[class*="language"]');
    
    if (languageSelector) {
      const languageText = languageSelector.textContent?.toLowerCase() || '';
      return this.mapLanguageName(languageText);
    }
    
    // Method 3: Try to detect from URL or page context
    const url = window.location.href;
    if (url.includes('python')) return 'python';
    if (url.includes('java')) return 'java';
    if (url.includes('cpp') || url.includes('c++')) return 'cpp';
    
    // Default fallback
    return 'javascript';
  }

  /**
   * Map Monaco Editor language IDs to standard language names
   */
  mapMonacoLanguage(modeId) {
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

  /**
   * Map language display names to standard language names
   */
  mapLanguageName(displayName) {
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

  /**
   * Extract problem statement from LeetCode page DOM
   */
  extractProblemStatement() {
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

  /**
   * Get cached context
   */
  getCachedContext(key = 'latest') {
    return this.contextCache.get(key);
  }

  /**
   * Update cached context
   */
  updateCachedContext(context, key = 'latest') {
    this.contextCache.set(key, context);
    this.lastExtractedContext = context;
  }

  /**
   * Clear context cache
   */
  clearCache() {
    this.contextCache.clear();
    this.lastExtractedContext = null;
  }

  /**
   * Sanitize context for logging (remove sensitive data)
   */
  sanitizeContextForLogging(context) {
    const sanitized = { ...context };
    
    // Truncate long fields for logging
    if (sanitized.currentCode && sanitized.currentCode.length > 200) {
      sanitized.currentCode = sanitized.currentCode.substring(0, 200) + '...';
    }
    
    if (sanitized.problemDescription && sanitized.problemDescription.length > 200) {
      sanitized.problemDescription = sanitized.problemDescription.substring(0, 200) + '...';
    }
    
    return sanitized;
  }

  /**
   * Validate extracted context
   */
  validateContext(context) {
    const errors = [];
    
    if (!context || typeof context !== 'object') {
      errors.push('Context must be an object');
      return { valid: false, errors };
    }
    
    // Check required fields
    const requiredFields = ['problemTitle', 'currentCode', 'language'];
    for (const field of requiredFields) {
      if (!(field in context)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate data types
    if (context.cursorPosition !== undefined && typeof context.cursorPosition !== 'number') {
      errors.push('cursorPosition must be a number');
    }
    
    if (context.language && typeof context.language !== 'string') {
      errors.push('language must be a string');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}