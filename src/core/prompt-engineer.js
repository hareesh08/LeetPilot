// LeetPilot Prompt Engineer
// Generates educational prompts for different AI interactions

/**
 * Prompt Engineering System
 * Creates educational prompts for code completion, explanations, optimizations, and hints
 */
export class PromptEngineer {
  constructor() {
    this.promptTemplates = {
      completion: this.getCompletionTemplate(),
      explanation: this.getExplanationTemplate(),
      optimization: this.getOptimizationTemplate(),
      hint: this.getHintTemplate(),
      progressiveHint: this.getProgressiveHintTemplate()
    };
  }

  /**
   * Create code completion prompt
   */
  createCompletionPrompt(context) {
    const { problemTitle, problemDescription, currentCode, language } = context;
    
    return this.promptTemplates.completion
      .replace('{PROBLEM_TITLE}', problemTitle || 'Coding Problem')
      .replace('{PROBLEM_DESCRIPTION}', problemDescription || 'No description available')
      .replace('{CURRENT_CODE}', currentCode || '')
      .replace('{LANGUAGE}', language || 'Python');
  }

  /**
   * Create explanation prompt
   */
  createExplanationPrompt(context) {
    const { problemTitle, currentCode, language } = context;
    
    return this.promptTemplates.explanation
      .replace('{PROBLEM_TITLE}', problemTitle || 'Coding Problem')
      .replace('{CURRENT_CODE}', currentCode || '')
      .replace('{LANGUAGE}', language || 'Python');
  }

  /**
   * Create optimization prompt
   */
  createOptimizationPrompt(context) {
    const { problemTitle, currentCode, language } = context;
    
    return this.promptTemplates.optimization
      .replace('{PROBLEM_TITLE}', problemTitle || 'Coding Problem')
      .replace('{CURRENT_CODE}', currentCode || '')
      .replace('{LANGUAGE}', language || 'Python');
  }

  /**
   * Create progressive hint prompt
   */
  createProgressiveHintPrompt(context, hintLevel, hintContext) {
    const { problemTitle, problemDescription, currentCode, language } = context;
    
    let prompt = this.promptTemplates.progressiveHint
      .replace('{PROBLEM_TITLE}', problemTitle || 'Coding Problem')
      .replace('{PROBLEM_DESCRIPTION}', problemDescription || 'No description available')
      .replace('{CURRENT_CODE}', currentCode || '')
      .replace('{LANGUAGE}', language || 'Python')
      .replace('{HINT_LEVEL}', hintLevel.toString());

    // Add previous hints context if available
    if (hintContext && hintContext.previousHints && hintContext.previousHints.length > 0) {
      const previousHintsText = hintContext.previousHints
        .map((hint, index) => `Hint ${hint.level}: ${hint.content}`)
        .join('\n\n');
      
      prompt += `\n\nPrevious hints given:\n${previousHintsText}`;
    }

    // Add progression guidance
    const progressionGuidance = this.getHintLevelGuidance(hintLevel);
    prompt += `\n\n${progressionGuidance}`;

    return prompt;
  }

  /**
   * Get hint level specific guidance
   */
  getHintLevelGuidance(level) {
    const guidance = {
      1: "Focus on high-level problem understanding and general approach. Help the user understand what the problem is asking and what strategy might work.",
      2: "Provide guidance on algorithm structure and data organization. Suggest what data structures or algorithmic patterns might be useful.",
      3: "Give more specific implementation guidance. Help with the actual coding approach and key implementation details.",
      4: "Address edge cases, optimizations, and advanced considerations. Help refine the solution for completeness and efficiency."
    };

    return guidance[level] || guidance[1];
  }

  /**
   * Filter and validate AI responses
   */
  filterResponse(content, responseType) {
    const result = {
      content: content,
      filtered: false,
      reason: null
    };

    // Check for complete solutions (should be filtered for educational purposes)
    if (this.containsCompleteSolution(content)) {
      result.filtered = true;
      result.reason = 'Contains complete solution - filtered for educational purposes';
      result.content = this.extractEducationalContent(content);
    }

    // Check for inappropriate content
    if (this.containsInappropriateContent(content)) {
      result.filtered = true;
      result.reason = 'Contains inappropriate content';
      result.content = 'I apologize, but I cannot provide that type of response. Let me help you with your coding problem in an educational way.';
    }

    return result;
  }

  /**
   * Check if response contains a complete solution
   */
  containsCompleteSolution(content) {
    const solutionPatterns = [
      /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*return[\s\S]*\}/i,
      /def\s+\w+\s*\([^)]*\):[\s\S]*return/i,
      /class\s+Solution[\s\S]*def[\s\S]*return/i,
      /var\s+\w+\s*=\s*function[\s\S]*return/i
    ];

    return solutionPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check for inappropriate content
   */
  containsInappropriateContent(content) {
    const inappropriatePatterns = [
      /\b(hack|cheat|steal|copy)\b/i,
      /<script/i,
      /javascript:/i,
      /eval\s*\(/i
    ];

    return inappropriatePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Extract educational content from complete solutions
   */
  extractEducationalContent(content) {
    // Remove complete function implementations but keep explanations
    let educational = content
      .replace(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/gi, '[Implementation details removed for educational purposes]')
      .replace(/def\s+\w+\s*\([^)]*\):[\s\S]*?(?=\n\n|\n[A-Z]|$)/gi, '[Implementation details removed for educational purposes]');

    return educational.trim() || 'Let me guide you through the approach step by step instead of providing the complete solution.';
  }

  /**
   * Sanitize content for security
   */
  sanitizeContent(content) {
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Remove potentially dangerous content
    let sanitized = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/\x00/g, ''); // Remove null bytes

    // Limit length
    if (sanitized.length > 5000) {
      sanitized = sanitized.substring(0, 4997) + '...';
    }

    return sanitized.trim();
  }

  /**
   * Get completion prompt template
   */
  getCompletionTemplate() {
    return `You are an educational coding assistant helping a student learn to solve coding problems. 

Problem: {PROBLEM_TITLE}
Description: {PROBLEM_DESCRIPTION}
Language: {LANGUAGE}
Current Code:
{CURRENT_CODE}

Provide a helpful code suggestion that guides the student's learning. Focus on:
1. Educational value over complete solutions
2. Explaining the reasoning behind suggestions
3. Encouraging good coding practices
4. Building understanding step by step

Do not provide complete solutions. Instead, suggest the next logical step or improvement.`;
  }

  /**
   * Get explanation prompt template
   */
  getExplanationTemplate() {
    return `You are an educational coding assistant. Explain the following code in a clear, educational manner.

Problem: {PROBLEM_TITLE}
Language: {LANGUAGE}
Code to explain:
{CURRENT_CODE}

Provide a clear explanation that covers:
1. What the code does
2. How it works step by step
3. Key concepts and patterns used
4. Potential improvements or considerations

Focus on helping the student understand the underlying concepts.`;
  }

  /**
   * Get optimization prompt template
   */
  getOptimizationTemplate() {
    return `You are an educational coding assistant helping a student optimize their code.

Problem: {PROBLEM_TITLE}
Language: {LANGUAGE}
Current Code:
{CURRENT_CODE}

Analyze the code and suggest optimizations focusing on:
1. Time and space complexity improvements
2. Code readability and maintainability
3. Best practices for {LANGUAGE}
4. Edge case handling

Explain your suggestions educationally, helping the student understand why each optimization matters.`;
  }

  /**
   * Get progressive hint template
   */
  getProgressiveHintTemplate() {
    return `You are an educational coding assistant providing progressive hints to help a student solve a coding problem.

Problem: {PROBLEM_TITLE}
Description: {PROBLEM_DESCRIPTION}
Language: {LANGUAGE}
Current Code:
{CURRENT_CODE}

This is hint level {HINT_LEVEL} of 4. Provide an educational hint that:
1. Builds on previous understanding
2. Guides toward the solution without giving it away
3. Encourages critical thinking
4. Explains key concepts relevant to this level

Keep the hint concise but educational, appropriate for this progression level.`;
  }

  /**
   * Get hint prompt template (basic)
   */
  getHintTemplate() {
    return `You are an educational coding assistant providing a helpful hint.

Problem: {PROBLEM_TITLE}
Language: {LANGUAGE}
Current Code:
{CURRENT_CODE}

Provide a helpful hint that guides the student toward the solution without giving it away completely. Focus on:
1. Key insights or approaches
2. Relevant algorithms or data structures
3. Important edge cases to consider
4. Next steps in the problem-solving process

Be encouraging and educational in your response.`;
  }
}