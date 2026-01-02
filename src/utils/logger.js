// LeetPilot Centralized Logger
// Provides structured logging with different levels and security-aware output

export class Logger {
  constructor(component = 'LeetPilot') {
    this.component = component;
    this.logLevel = this.getLogLevel();
    this.sensitivePatterns = [
      /sk-[a-zA-Z0-9]+/g,
      /Bearer\s+[a-zA-Z0-9-_]+/g,
      /api[_-]?key[:\s=]+[a-zA-Z0-9-_]+/gi,
      /password[:\s=]+[^\s]+/gi,
      /token[:\s=]+[a-zA-Z0-9-_]+/gi
    ];
  }

  /**
   * Get current log level from storage or default
   */
  getLogLevel() {
    try {
      // Try to get from chrome storage or localStorage
      return localStorage.getItem('leetpilot-log-level') || 'info';
    } catch (error) {
      return 'info';
    }
  }

  /**
   * Set log level
   */
  setLogLevel(level) {
    const validLevels = ['debug', 'info', 'warn', 'error'];
    if (validLevels.includes(level)) {
      this.logLevel = level;
      try {
        localStorage.setItem('leetpilot-log-level', level);
      } catch (error) {
        // Ignore storage errors
      }
    }
  }

  /**
   * Check if message should be logged based on level
   */
  shouldLog(messageLevel) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[messageLevel] >= levels[this.logLevel];
  }

  /**
   * Sanitize message to remove sensitive information
   */
  sanitizeMessage(message) {
    if (typeof message !== 'string') {
      try {
        message = JSON.stringify(message);
      } catch (error) {
        message = String(message);
      }
    }

    // Remove sensitive patterns
    let sanitized = message;
    this.sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized;
  }

  /**
   * Format log message with timestamp and component
   */
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.component}] [${level.toUpperCase()}]`;
    
    let formattedMessage = `${prefix} ${message}`;
    
    if (data) {
      try {
        const sanitizedData = this.sanitizeMessage(JSON.stringify(data, null, 2));
        formattedMessage += `\nData: ${sanitizedData}`;
      } catch (error) {
        formattedMessage += `\nData: [Unable to serialize]`;
      }
    }
    
    return formattedMessage;
  }

  /**
   * Debug level logging
   */
  debug(message, data = null) {
    if (this.shouldLog('debug')) {
      const sanitizedMessage = this.sanitizeMessage(message);
      const formatted = this.formatMessage('debug', sanitizedMessage, data);
      console.debug(formatted);
    }
  }

  /**
   * Info level logging
   */
  info(message, data = null) {
    if (this.shouldLog('info')) {
      const sanitizedMessage = this.sanitizeMessage(message);
      const formatted = this.formatMessage('info', sanitizedMessage, data);
      console.info(formatted);
    }
  }

  /**
   * Warning level logging
   */
  warn(message, data = null) {
    if (this.shouldLog('warn')) {
      const sanitizedMessage = this.sanitizeMessage(message);
      const formatted = this.formatMessage('warn', sanitizedMessage, data);
      console.warn(formatted);
    }
  }

  /**
   * Error level logging
   */
  error(message, error = null, data = null) {
    if (this.shouldLog('error')) {
      const sanitizedMessage = this.sanitizeMessage(message);
      let errorData = data;
      
      if (error instanceof Error) {
        errorData = {
          ...data,
          error: {
            name: error.name,
            message: this.sanitizeMessage(error.message),
            stack: error.stack ? this.sanitizeMessage(error.stack) : undefined
          }
        };
      }
      
      const formatted = this.formatMessage('error', sanitizedMessage, errorData);
      console.error(formatted);
    }
  }

  /**
   * Performance timing
   */
  time(label) {
    console.time(`[${this.component}] ${label}`);
  }

  /**
   * End performance timing
   */
  timeEnd(label) {
    console.timeEnd(`[${this.component}] ${label}`);
  }

  /**
   * Group related log messages
   */
  group(label) {
    console.group(`[${this.component}] ${label}`);
  }

  /**
   * End log group
   */
  groupEnd() {
    console.groupEnd();
  }

  /**
   * Log API request (with automatic sanitization)
   */
  logApiRequest(method, url, data = null) {
    const sanitizedUrl = this.sanitizeMessage(url);
    const message = `API Request: ${method} ${sanitizedUrl}`;
    
    if (data) {
      const sanitizedData = this.sanitizeMessage(JSON.stringify(data));
      this.debug(message, { requestData: sanitizedData });
    } else {
      this.debug(message);
    }
  }

  /**
   * Log API response (with automatic sanitization)
   */
  logApiResponse(status, data = null, duration = null) {
    const message = `API Response: ${status}${duration ? ` (${duration}ms)` : ''}`;
    
    if (data) {
      const sanitizedData = this.sanitizeMessage(JSON.stringify(data));
      this.debug(message, { responseData: sanitizedData });
    } else {
      this.debug(message);
    }
  }

  /**
   * Log user action
   */
  logUserAction(action, context = null) {
    const message = `User Action: ${action}`;
    this.info(message, context);
  }

  /**
   * Log security event
   */
  logSecurityEvent(event, details = null) {
    const message = `Security Event: ${event}`;
    this.warn(message, details);
  }

  /**
   * Create child logger for specific component
   */
  createChild(childComponent) {
    return new Logger(`${this.component}:${childComponent}`);
  }
}

// Create default logger instance
export const logger = new Logger();

// Create component-specific loggers
export const contentLogger = new Logger('Content');
export const backgroundLogger = new Logger('Background');
export const uiLogger = new Logger('UI');
export const apiLogger = new Logger('API');
export const securityLogger = new Logger('Security');