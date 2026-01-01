# Requirements Document

## Introduction

LeetPilot is a Chrome extension that provides AI-powered code completion and educational hints directly within the LeetCode editor interface. The system uses a Bring Your Own Key (BYOK) approach, allowing users to leverage their own API keys from providers like OpenAI, Anthropic, or Google Gemini while maintaining complete privacy and control over their data. The extension focuses on educational assistance rather than providing complete solutions, helping users learn and improve their coding skills while avoiding potential platform violations.

## Glossary

- **LeetPilot**: The Chrome extension system that provides AI-powered coding assistance
- **BYOK**: Bring Your Own Key - users provide their own API keys for AI services
- **Monaco Editor**: The code editor engine used by LeetCode (based on VSCode)
- **Content Script**: Chrome extension component that runs in the context of web pages
- **Background Service Worker**: Chrome extension component that handles API calls and background processing
- **Inline Completion**: Code suggestions that appear directly within the editor as the user types
- **Step Hint**: Educational guidance that provides the next logical step without revealing the complete solution

## Requirements

### Requirement 1

**User Story:** As a LeetCode user, I want AI-powered code completion within the LeetCode editor, so that I can get intelligent suggestions while solving problems.

#### Acceptance Criteria

1. WHEN a user presses Ctrl+Space in the LeetCode editor, THE LeetPilot SHALL trigger inline code completion
2. WHEN the user is typing code, THE LeetPilot SHALL detect the Monaco Editor instance and capture the current code context
3. WHEN code completion is triggered, THE LeetPilot SHALL extract the current problem statement and user's code
4. WHEN displaying completions, THE LeetPilot SHALL show suggestions inline within the editor interface
5. WHEN generating completions, THE LeetPilot SHALL provide only the next logical code snippet without revealing complete solutions

### Requirement 2

**User Story:** As a developer concerned about privacy, I want to use my own API keys for AI services, so that my code and data never pass through third-party servers.

#### Acceptance Criteria

1. WHEN a user configures their API key, THE LeetPilot SHALL store the key locally using chrome.storage.local
2. WHEN making API calls, THE LeetPilot SHALL use only the user's provided API key from local storage
3. WHEN processing requests, THE LeetPilot SHALL send data directly to the chosen AI provider without intermediate servers
4. WHEN storing sensitive data, THE LeetPilot SHALL ensure API keys never leave the user's browser environment
5. WHERE multiple AI providers are supported, THE LeetPilot SHALL allow users to select between OpenAI, Anthropic, Google Gemini, and custom OpenAI-compatible providers

### Requirement 3

**User Story:** As a LeetCode user, I want error explanations and code optimization suggestions, so that I can learn from my mistakes and improve my solutions.

#### Acceptance Criteria

1. WHEN a user presses Alt+E, THE LeetPilot SHALL analyze the current code and provide error explanations
2. WHEN a user presses Alt+O, THE LeetPilot SHALL suggest optimizations for the current code
3. WHEN providing explanations, THE LeetPilot SHALL focus on educational content rather than direct solutions
4. WHEN analyzing code, THE LeetPilot SHALL consider both syntax errors and logical issues
5. WHEN suggesting optimizations, THE LeetPilot SHALL explain the reasoning behind each suggestion

### Requirement 4

**User Story:** As a learning-focused developer, I want step-by-step hints without complete solutions, so that I can maintain the educational value of solving problems myself.

#### Acceptance Criteria

1. WHEN a user presses Alt+H, THE LeetPilot SHALL provide step hints for the current problem
2. WHEN generating hints, THE LeetPilot SHALL provide guidance on the next logical step without revealing the complete solution
3. WHEN providing educational content, THE LeetPilot SHALL focus on explaining concepts and approaches
4. WHEN users request hints multiple times, THE LeetPilot SHALL provide progressive guidance without giving away the final answer
5. WHEN generating any assistance, THE LeetPilot SHALL avoid content that could trigger LeetCode's anti-cheating measures

### Requirement 5

**User Story:** As a Chrome extension user, I want a simple configuration interface, so that I can easily set up my API keys and preferences.

#### Acceptance Criteria

1. WHEN a user clicks the extension icon, THE LeetPilot SHALL display a popup interface for configuration
2. WHEN configuring the extension, THE LeetPilot SHALL provide input fields for API key entry
3. WHEN selecting AI providers, THE LeetPilot SHALL offer a dropdown menu with supported services
4. WHEN saving configuration, THE LeetPilot SHALL validate API keys before storing them locally
5. WHEN the extension is first installed, THE LeetPilot SHALL guide users through the initial setup process

### Requirement 8

**User Story:** As a developer using custom AI providers, I want to configure my own API base URL, API key, and model name with OpenAI compatibility, so that I can use any OpenAI-compatible service for code assistance.

#### Acceptance Criteria

1. WHEN configuring a custom provider, THE LeetPilot SHALL accept a custom API base URL input field
2. WHEN using custom providers, THE LeetPilot SHALL allow users to specify their own model name
3. WHEN making requests to custom providers, THE LeetPilot SHALL use OpenAI-compatible API format and endpoints
4. WHEN validating custom provider configuration, THE LeetPilot SHALL test the connection using the provided base URL and API key
5. WHEN storing custom provider settings, THE LeetPilot SHALL securely save the base URL, API key, and model name locally

### Requirement 6

**User Story:** As a Chrome extension developer, I want proper integration with LeetCode's Monaco Editor, so that the extension works reliably across different problem types and editor states.

#### Acceptance Criteria

1. WHEN LeetCode loads, THE LeetPilot SHALL detect and hook into the Monaco Editor instance
2. WHEN the editor content changes, THE LeetPilot SHALL maintain proper event listeners for keyboard shortcuts
3. WHEN multiple editor instances exist, THE LeetPilot SHALL target the active code editor
4. WHEN LeetCode updates its interface, THE LeetPilot SHALL maintain compatibility with Monaco Editor integration
5. WHEN injecting suggestions, THE LeetPilot SHALL preserve the editor's existing functionality and formatting

### Requirement 8

**User Story:** As a developer using custom AI providers, I want to configure my own API base URL, API key, and model name with OpenAI compatibility, so that I can use any OpenAI-compatible service for code assistance.

#### Acceptance Criteria

1. WHEN configuring a custom provider, THE LeetPilot SHALL accept a custom API base URL input field
2. WHEN using custom providers, THE LeetPilot SHALL allow users to specify their own model name
3. WHEN making requests to custom providers, THE LeetPilot SHALL use OpenAI-compatible API format and endpoints
4. WHEN validating custom provider configuration, THE LeetPilot SHALL test the connection using the provided base URL and API key
5. WHEN storing custom provider settings, THE LeetPilot SHALL securely save the base URL, API key, and model name locally