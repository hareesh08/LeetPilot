# LeetPilot Extension Design Document

## Overview

LeetPilot is a Chrome extension that provides AI-powered code completion and educational assistance directly within the LeetCode editor. The system uses a privacy-first BYOK (Bring Your Own Key) approach, allowing users to leverage their own API keys from major AI providers while maintaining complete data control. The extension integrates seamlessly with LeetCode's Monaco Editor to provide inline completions, error explanations, optimization suggestions, and step-by-step hints without compromising the educational value of problem-solving.

## Architecture

The extension follows Chrome's Manifest V3 architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    LeetCode Web Page                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Content Script                         │    │
│  │  • Monaco Editor Integration                        │    │
│  │  • Keyboard Event Handling                          │    │
│  │  │  • Code Context Extraction                       │    │
│  │  • UI Injection & Completion Display               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Message Passing
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Background Service Worker                    │
│  • API Request Orchestration                               │
│  • Prompt Engineering & Context Management                 │
│  • AI Provider Communication                               │
│  • Response Processing & Filtering                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Secure Storage
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Chrome Storage (Local)                       │
│  • API Keys (Encrypted)                                    │
│  • User Preferences                                        │
│  • Provider Selection                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Configuration
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Popup Interface                          │
│  • API Key Management                                      │
│  • Provider Selection                                      │
│  • Settings Configuration                                  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Content Script (`content.js`)
- **Purpose**: Integrates with LeetCode's Monaco Editor and handles user interactions
- **Key Functions**:
  - `detectMonacoEditor()`: Locates and hooks into the Monaco Editor instance
  - `extractCodeContext()`: Captures current code, cursor position, and problem statement
  - `handleKeyboardShortcuts()`: Processes Ctrl+Space, Alt+E, Alt+O, Alt+H shortcuts
  - `injectCompletion()`: Displays AI suggestions inline within the editor
  - `extractProblemStatement()`: Parses the current LeetCode problem description

### Background Service Worker (`background.js`)
- **Purpose**: Handles AI API communications and prompt processing
- **Key Functions**:
  - `processCompletionRequest()`: Orchestrates the completion generation workflow
  - `callAIProvider()`: Makes secure API calls to OpenAI/Anthropic/Gemini
  - `engineerPrompt()`: Constructs educational prompts that avoid full solutions
  - `filterResponse()`: Ensures AI responses maintain educational focus
  - `handleAPIErrors()`: Manages API failures and rate limiting gracefully

### Popup Interface (`popup.html`, `popup.js`)
- **Purpose**: Provides user configuration and settings management
- **Key Functions**:
  - `validateAPIKey()`: Tests API key validity before storage
  - `saveConfiguration()`: Securely stores user preferences
  - `displayProviderOptions()`: Shows available AI providers (OpenAI, Anthropic, Gemini)
  - `showSetupGuide()`: Guides new users through initial configuration

### Storage Manager
- **Purpose**: Handles secure local storage of sensitive data
- **Key Functions**:
  - `storeAPIKey()`: Encrypts and stores API keys locally
  - `retrieveConfiguration()`: Safely accesses stored user preferences
  - `clearUserData()`: Removes all stored data on uninstall

## Data Models

### CompletionRequest
```typescript
interface CompletionRequest {
  problemTitle: string;
  problemDescription: string;
  currentCode: string;
  cursorPosition: number;
  language: string;
  requestType: 'completion' | 'explanation' | 'optimization' | 'hint';
}
```

### AIProviderConfig
```typescript
interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}
```

### CompletionResponse
```typescript
interface CompletionResponse {
  suggestion: string;
  confidence: number;
  type: 'code' | 'explanation' | 'hint';
  insertPosition: number;
}
```

### MonacoEditorContext
```typescript
interface MonacoEditorContext {
  editor: any; // Monaco Editor instance
  model: any; // Editor model
  currentCode: string;
  language: string;
  cursorPosition: number;
  selectedText: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Keyboard shortcut activation
*For any* LeetCode editor state, pressing Ctrl+Space should trigger the code completion function
**Validates: Requirements 1.1**

### Property 2: Monaco Editor detection consistency
*For any* LeetCode page load, the extension should successfully detect and hook into the Monaco Editor instance
**Validates: Requirements 1.2, 6.1**

### Property 3: Code context extraction completeness
*For any* editor state when completion is triggered, the system should extract both the current code and problem statement
**Validates: Requirements 1.3**

### Property 4: Educational content filtering
*For any* AI-generated response, the content should not contain complete problem solutions or direct answers
**Validates: Requirements 1.5, 3.3, 4.2, 4.5**

### Property 5: API key storage round-trip
*For any* valid API key, storing and then retrieving it should return the same key value
**Validates: Requirements 2.1**

### Property 6: Direct provider communication
*For any* API request, the network call should go directly to the selected AI provider without intermediate servers
**Validates: Requirements 2.3**

### Property 7: Data locality preservation
*For any* stored API key, it should never appear in network requests except to authorized AI providers
**Validates: Requirements 2.4**

### Property 8: Shortcut handling consistency
*For any* keyboard shortcut (Alt+E, Alt+O, Alt+H), pressing it should trigger the corresponding function
**Validates: Requirements 3.1, 3.2, 4.1**

### Property 9: Progressive hint behavior
*For any* sequence of hint requests on the same problem, each subsequent hint should build upon previous hints without revealing the complete solution
**Validates: Requirements 4.4**

### Property 10: API key validation
*For any* API key input, the system should validate it before storage and reject invalid keys
**Validates: Requirements 5.4**

### Property 11: Active editor targeting
*For any* LeetCode page with multiple editors, the extension should target the currently active code editor
**Validates: Requirements 6.3**

### Property 12: Editor functionality preservation
*For any* suggestion injection, the Monaco Editor's existing functionality and formatting should remain unchanged
**Validates: Requirements 6.5**

### Property 13: HTTPS communication enforcement
*For any* API request to AI providers, the connection should use HTTPS protocol
**Validates: Requirements 7.1**

### Property 14: Response validation
*For any* API response, the data should be validated and sanitized before processing
**Validates: Requirements 7.2**

### Property 15: Secure error handling
*For any* API error, the error message should not expose sensitive information like API keys
**Validates: Requirements 7.3**

## Error Handling

### API Communication Errors
- **Network Failures**: Implement exponential backoff retry logic with maximum 3 attempts
- **Rate Limiting**: Detect 429 responses and implement appropriate delays
- **Invalid API Keys**: Provide clear user feedback and guide to reconfiguration
- **Malformed Responses**: Validate all AI provider responses and fallback gracefully

### Monaco Editor Integration Errors
- **Editor Not Found**: Implement polling mechanism to detect editor after page load
- **Multiple Editors**: Use focus detection and DOM hierarchy to identify active editor
- **Editor State Changes**: Re-establish event listeners when editor content or structure changes
- **Injection Failures**: Validate editor state before attempting to inject completions

### Storage and Configuration Errors
- **Storage Quota Exceeded**: Implement data cleanup and user notification
- **Corrupted Configuration**: Provide configuration reset functionality
- **Missing API Keys**: Guide users to configuration when keys are not found
- **Invalid Provider Selection**: Fallback to default provider with user notification

### Content Filtering Errors
- **Inappropriate Content**: Implement content filters to block potentially harmful suggestions
- **Solution Leakage**: Use pattern matching to detect and filter complete solutions
- **Context Misunderstanding**: Provide fallback responses when AI context is unclear

## Testing Strategy

### Unit Testing Approach
The extension will use Jest for unit testing with the following focus areas:
- **Content Script Functions**: Test Monaco Editor detection, code extraction, and UI injection
- **Background Service Functions**: Test API communication, prompt engineering, and response processing
- **Storage Operations**: Test secure storage and retrieval of configuration data
- **Popup Interface**: Test configuration validation and user interaction handling

### Property-Based Testing Approach
The extension will use fast-check for property-based testing with a minimum of 100 iterations per property:
- **Input Validation**: Generate random API keys, code snippets, and configuration data
- **Content Filtering**: Generate various AI responses to test solution detection and filtering
- **Editor Integration**: Generate different editor states to test consistent behavior
- **Security Properties**: Generate various network scenarios to test data locality and HTTPS enforcement

Each property-based test will be tagged with comments explicitly referencing the correctness property from this design document using the format: **Feature: leetpilot-extension, Property {number}: {property_text}**

### Integration Testing
- **End-to-End Workflows**: Test complete user journeys from installation to code completion
- **Cross-Browser Compatibility**: Verify functionality across Chrome, Edge, and other Chromium-based browsers
- **LeetCode Integration**: Test against different LeetCode problem types and editor configurations
- **AI Provider Integration**: Test with all supported AI providers (OpenAI, Anthropic, Gemini)

### Security Testing
- **Data Leakage Prevention**: Verify API keys never appear in unintended network requests
- **Input Sanitization**: Test response validation against malicious or malformed AI responses
- **Storage Security**: Verify proper encryption and secure handling of sensitive data
- **Network Security**: Confirm all communications use HTTPS and proper certificate validation