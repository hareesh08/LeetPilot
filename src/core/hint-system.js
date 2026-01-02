// LeetPilot Progressive Hint System
// Manages multi-step hint requests with state preservation and educational progression

/**
 * Progressive Hint System
 * Manages multi-step hint requests with state preservation and educational progression
 */
export class ProgressiveHintSystem {
  constructor() {
    this.hintSessions = new Map(); // tabId -> session data
    this.maxHintLevel = 4;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes session timeout
    this.maxSessionsPerTab = 5; // Reduced to prevent memory bloat
    
    // Educational progression framework
    this.hintProgression = {
      1: {
        type: 'conceptual',
        description: 'High-level approach and problem understanding',
        maxLength: 200,
        keywords: ['approach', 'strategy', 'think about', 'consider', 'pattern']
      },
      2: {
        type: 'structural',
        description: 'Algorithm structure and data organization',
        maxLength: 300,
        keywords: ['structure', 'organize', 'steps', 'breakdown', 'components']
      },
      3: {
        type: 'implementation',
        description: 'Specific implementation guidance',
        maxLength: 400,
        keywords: ['implement', 'code', 'function', 'method', 'technique']
      },
      4: {
        type: 'optimization',
        description: 'Edge cases and optimization hints',
        maxLength: 500,
        keywords: ['edge case', 'optimize', 'improve', 'efficiency', 'corner case']
      }
    };
  }

  /**
   * Get next hint level for a problem with enhanced logic
   */
  getNextHintLevel(tabId, problemTitle) {
    const sessionKey = `${tabId}_${this.normalizeTitle(problemTitle)}`;
    const session = this.hintSessions.get(sessionKey);
    
    if (!session) {
      // First hint request for this problem
      return 1;
    }
    
    // Check if session has expired
    if (this.isSessionExpired(session)) {
      console.log('Hint session expired, starting fresh');
      this.resetHintSession(tabId, problemTitle);
      return 1;
    }
    
    // Increment hint level, but cap at maximum
    const nextLevel = Math.min(session.currentLevel + 1, this.maxHintLevel);
    
    // Validate progression - ensure we don't skip levels
    if (nextLevel > session.hints.length + 1) {
      console.warn('Hint level progression error, resetting to expected level');
      return session.hints.length + 1;
    }
    
    return nextLevel;
  }

  /**
   * Update hint session state with enhanced context preservation
   */
  updateHintSession(tabId, problemTitle, hintLevel, hintContent, context) {
    const sessionKey = `${tabId}_${this.normalizeTitle(problemTitle)}`;
    
    // Get existing session or create new one
    let session = this.hintSessions.get(sessionKey);
    
    if (!session) {
      session = {
        problemTitle: problemTitle,
        currentLevel: 0,
        hints: [],
        context: {
          initialCode: context.currentCode || '',
          language: context.language || 'javascript',
          problemDescription: context.problemDescription || ''
        },
        progression: {
          conceptsIntroduced: new Set(),
          codeEvolution: [],
          userProgress: []
        },
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };
    }
    
    // Update session with new hint
    session.currentLevel = hintLevel;
    session.lastUpdated = Date.now();
    
    // Track code evolution
    if (context.currentCode && context.currentCode !== session.context.initialCode) {
      session.progression.codeEvolution.push({
        code: context.currentCode,
        timestamp: Date.now(),
        hintLevel: hintLevel
      });
    }
    
    // Add new hint with enhanced metadata
    const hintEntry = {
      level: hintLevel,
      content: hintContent,
      timestamp: Date.now(),
      type: this.hintProgression[hintLevel]?.type || 'general',
      contextSnapshot: {
        codeLength: context.currentCode?.length || 0,
        hasFunction: (context.currentCode || '').includes('function') || (context.currentCode || '').includes('def'),
        hasLoop: (context.currentCode || '').includes('for') || (context.currentCode || '').includes('while'),
        hasConditional: (context.currentCode || '').includes('if')
      }
    };
    
    session.hints.push(hintEntry);
    
    // Extract and track concepts introduced in this hint
    this.extractAndTrackConcepts(hintContent, session.progression.conceptsIntroduced);
    
    // Track user progress
    session.progression.userProgress.push({
      hintLevel: hintLevel,
      timestamp: Date.now(),
      codeComplexity: this.calculateCodeComplexity(context.currentCode || ''),
      progressScore: this.calculateProgressScore(session)
    });
    
    this.hintSessions.set(sessionKey, session);
    
    // Clean up old sessions
    this.cleanupOldSessions(tabId);
    
    return session;
  }

  /**
   * Get enhanced hint context for prompt engineering
   */
  getHintContext(tabId, problemTitle) {
    const session = this.getHintSession(tabId, problemTitle);
    
    if (!session || session.hints.length === 0) {
      return null;
    }
    
    // Check if session is expired
    if (this.isSessionExpired(session)) {
      console.log('Session expired, returning null context');
      return null;
    }
    
    return {
      previousHints: session.hints.map(hint => ({
        level: hint.level,
        content: hint.content,
        type: hint.type,
        timestamp: hint.timestamp
      })),
      currentLevel: session.currentLevel,
      context: session.context,
      progression: {
        conceptsIntroduced: Array.from(session.progression.conceptsIntroduced),
        codeEvolution: session.progression.codeEvolution.slice(-3), // Last 3 code changes
        progressScore: this.calculateProgressScore(session),
        sessionDuration: Date.now() - session.createdAt
      },
      nextHintGuidance: this.hintProgression[session.currentLevel + 1] || null
    };
  }

  /**
   * Enhanced hint session retrieval with validation
   */
  getHintSession(tabId, problemTitle) {
    const sessionKey = `${tabId}_${this.normalizeTitle(problemTitle)}`;
    const session = this.hintSessions.get(sessionKey);
    
    if (!session) {
      return null;
    }
    
    // Validate session integrity
    if (this.isSessionExpired(session) || !this.validateSessionIntegrity(session)) {
      console.log('Invalid or expired session detected, removing');
      this.hintSessions.delete(sessionKey);
      return null;
    }
    
    return session;
  }

  /**
   * Reset hint session with cleanup
   */
  resetHintSession(tabId, problemTitle) {
    const sessionKey = `${tabId}_${this.normalizeTitle(problemTitle)}`;
    const session = this.hintSessions.get(sessionKey);
    
    if (session) {
      console.log(`Resetting hint session for ${problemTitle}, had ${session.hints.length} hints`);
    }
    
    this.hintSessions.delete(sessionKey);
  }

  /**
   * Check if session has expired
   */
  isSessionExpired(session) {
    if (!session || !session.lastUpdated) {
      return true;
    }
    
    return (Date.now() - session.lastUpdated) > this.sessionTimeout;
  }

  /**
   * Validate session data integrity
   */
  validateSessionIntegrity(session) {
    if (!session || typeof session !== 'object') {
      return false;
    }
    
    // Check required fields
    const requiredFields = ['problemTitle', 'currentLevel', 'hints', 'context', 'createdAt'];
    for (const field of requiredFields) {
      if (!(field in session)) {
        console.warn(`Session missing required field: ${field}`);
        return false;
      }
    }
    
    // Validate hints array
    if (!Array.isArray(session.hints)) {
      return false;
    }
    
    // Validate hint progression (levels should be sequential)
    for (let i = 0; i < session.hints.length; i++) {
      const expectedLevel = i + 1;
      if (session.hints[i].level !== expectedLevel) {
        console.warn(`Hint level mismatch at index ${i}: expected ${expectedLevel}, got ${session.hints[i].level}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Extract and track concepts from hint content
   */
  extractAndTrackConcepts(hintContent, conceptsSet) {
    if (!hintContent || typeof hintContent !== 'string') {
      return;
    }
    
    const conceptKeywords = [
      'recursion', 'iteration', 'dynamic programming', 'greedy', 'backtracking',
      'binary search', 'two pointers', 'sliding window', 'hash map', 'hash table',
      'stack', 'queue', 'heap', 'tree', 'graph', 'dfs', 'bfs',
      'sorting', 'searching', 'divide and conquer', 'memoization',
      'time complexity', 'space complexity', 'optimization'
    ];
    
    const lowerContent = hintContent.toLowerCase();
    conceptKeywords.forEach(concept => {
      if (lowerContent.includes(concept)) {
        conceptsSet.add(concept);
      }
    });
  }

  /**
   * Calculate code complexity score
   */
  calculateCodeComplexity(code) {
    if (!code || typeof code !== 'string') {
      return 0;
    }
    
    let complexity = 0;
    
    // Basic complexity indicators
    complexity += (code.match(/function|def|class/g) || []).length * 2;
    complexity += (code.match(/if|else|elif/g) || []).length;
    complexity += (code.match(/for|while/g) || []).length * 2;
    complexity += (code.match(/try|catch|except/g) || []).length;
    complexity += Math.floor(code.length / 100); // Length factor
    
    return Math.min(complexity, 20); // Cap at 20
  }

  /**
   * Calculate user progress score
   */
  calculateProgressScore(session) {
    if (!session || !session.progression) {
      return 0;
    }
    
    let score = 0;
    
    // Progress through hint levels
    score += session.currentLevel * 2;
    
    // Code evolution (user is making changes)
    score += Math.min(session.progression.codeEvolution.length, 5);
    
    // Concepts learned
    score += session.progression.conceptsIntroduced.size;
    
    // Time factor (longer engagement = higher score)
    const sessionMinutes = (Date.now() - session.createdAt) / (1000 * 60);
    score += Math.min(sessionMinutes / 5, 3); // Up to 3 points for time
    
    return Math.round(score * 10) / 10; // Round to 1 decimal
  }

  /**
   * Get hint progression guidance for next level
   */
  getProgressionGuidance(currentLevel) {
    const nextLevel = Math.min(currentLevel + 1, this.maxHintLevel);
    return this.hintProgression[nextLevel] || null;
  }

  /**
   * Normalize problem title for consistent session keys
   */
  normalizeTitle(title) {
    if (!title) return 'unknown';
    
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50); // Limit length
  }

  /**
   * Enhanced cleanup with better memory management
   */
  cleanupOldSessions(tabId) {
    const now = Date.now();
    
    // Remove expired sessions first
    for (const [key, session] of this.hintSessions.entries()) {
      if (this.isSessionExpired(session)) {
        console.log(`Removing expired session: ${key}`);
        this.hintSessions.delete(key);
      }
    }
    
    // Then limit sessions per tab
    const tabSessions = Array.from(this.hintSessions.entries())
      .filter(([key]) => key.startsWith(`${tabId}_`))
      .sort(([, a], [, b]) => b.lastUpdated - a.lastUpdated);
    
    if (tabSessions.length > this.maxSessionsPerTab) {
      const sessionsToRemove = tabSessions.slice(this.maxSessionsPerTab);
      sessionsToRemove.forEach(([key]) => {
        console.log(`Removing old session to maintain limit: ${key}`);
        this.hintSessions.delete(key);
      });
    }
  }

  /**
   * Clear all sessions for a tab
   */
  clearTabSessions(tabId) {
    const keysToRemove = Array.from(this.hintSessions.keys())
      .filter(key => key.startsWith(`${tabId}_`));
    
    keysToRemove.forEach(key => {
      this.hintSessions.delete(key);
    });
    
    console.log(`Cleared ${keysToRemove.length} sessions for tab ${tabId}`);
  }

  /**
   * Get comprehensive hint statistics for debugging and monitoring
   */
  getHintStats() {
    const stats = {
      totalSessions: this.hintSessions.size,
      sessionsByTab: new Map(),
      averageHintLevel: 0,
      averageProgressScore: 0,
      conceptsTracked: new Set(),
      sessionAges: [],
      memoryUsage: this.estimateMemoryUsage()
    };
    
    let totalLevels = 0;
    let totalProgress = 0;
    let sessionCount = 0;
    
    for (const [key, session] of this.hintSessions.entries()) {
      const tabId = key.split('_')[0];
      
      // Count sessions by tab
      if (!stats.sessionsByTab.has(tabId)) {
        stats.sessionsByTab.set(tabId, 0);
      }
      stats.sessionsByTab.set(tabId, stats.sessionsByTab.get(tabId) + 1);
      
      // Aggregate statistics
      totalLevels += session.currentLevel;
      totalProgress += this.calculateProgressScore(session);
      sessionCount++;
      
      // Track concepts
      if (session.progression && session.progression.conceptsIntroduced) {
        session.progression.conceptsIntroduced.forEach(concept => {
          stats.conceptsTracked.add(concept);
        });
      }
      
      // Track session age
      stats.sessionAges.push(Date.now() - session.createdAt);
    }
    
    if (sessionCount > 0) {
      stats.averageHintLevel = Math.round((totalLevels / sessionCount) * 10) / 10;
      stats.averageProgressScore = Math.round((totalProgress / sessionCount) * 10) / 10;
    }
    
    // Convert Set to Array for JSON serialization
    stats.conceptsTracked = Array.from(stats.conceptsTracked);
    
    return stats;
  }

  /**
   * Estimate memory usage of hint sessions
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, session] of this.hintSessions.entries()) {
      // Rough estimation of memory usage
      totalSize += key.length * 2; // Key string
      totalSize += JSON.stringify(session).length * 2; // Session data
    }
    
    return {
      estimatedBytes: totalSize,
      estimatedKB: Math.round(totalSize / 1024 * 10) / 10,
      sessionCount: this.hintSessions.size
    };
  }
}