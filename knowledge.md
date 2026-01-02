# Project knowledge

This file gives Codebuff context about your project: goals, commands, conventions, and gotchas.

## Quickstart
- **Setup**: `npm install`
- **Dev**: `npm run build:dev` then load `dist-dev/` as unpacked extension in Chrome; use `npm run dev` (tsc --watch) for TypeScript changes
- **Test**: `npm test` (Jest)
- **Build**: `npm run build:prod` for production zip (`leetpilot-extension.zip`)

## Architecture
LeetPilot: Chrome Manifest V3 extension for AI code completion/hints in LeetCode Monaco Editor (BYOK privacy).
- **Key directories**:
  - `src/background/`: Service worker (message routing, API orchestration to OpenAI/Anthropic/Gemini)
  - `src/content/`: LeetCode page scripts (Monaco detection, keyboard shortcuts, UI injection)
  - `src/ui/`: Settings popup (API key config)
  - `src/core/`: Shared utils (API client, storage, prompts, validation)
  - `src/utils/`: DOM, logging, etc.
  - `test/`: Jest tests
- **Data flow**: Content script → background messages → direct AI API calls (user keys stored locally)

## Conventions
- **Formatting/linting**: None configured (add ESLint/Prettier?)
- **Patterns to follow**:
  - Manifest V3 service workers (no persistent background)
  - Modular JS (index.js exports), TypeScript strict
  - Jest tests in `test/`, jsdom env
  - Educational prompts (no full solutions)
- **Things to avoid**:
  - Global installs (`npm i -g`)
  - Destructive cmds (git push/commit without ask)
  - Assuming libs (empty deps; verify imports)
  - Breaking editor func (preserve Monaco)

## Gotchas
- Windows cmd.exe: use `dir` not `ls`, etc.
- Build uses custom `scripts/build.js` (copies src/, generates manifest/build-info)
- Tests match `test/**/*.test.js`
- Host perms: leetcode.com + AI APIs + https://*/* (custom providers)

## Keyboard Shortcuts (Recently Fixed - Jan 2, 2026)
**Status**: ✅ FIXED

### Shortcut Definitions
Located in `src/content/keyboard-handler.js` (lines 14-23):
- `Ctrl+Space` → Code completion
- `Alt+E` → Error explanation
- `Alt+O` → Code optimization
- `Alt+H` → Hints

### How It Works
1. **Keyboard Handler** (`src/content/keyboard-handler.js`):
   - Listens for keydown events globally on LeetCode pages
   - Normalizes key combinations (e.g., "ctrl+space" becomes "ctrl+space")
   - Checks if shortcut should be handled based on context (Monaco Editor vs other inputs)
   - Dispatches custom `leetpilot-shortcut` event with action details

2. **Content Orchestrator** (`src/content/content-orchestrator.js`):
   - Listens for `leetpilot-shortcut` custom events
   - Calls `handleShortcutAction()` with the action type
   - Extracts problem title, current code, and language
   - Sends message to background script with request type matching action (completion, explanation, optimization, hint)
   - Displays response as toast notification or fixed popup

3. **Message Router** (`src/background/message-router.js`):
   - Routes messages by type: 'completion', 'explanation', 'optimization', 'hint' → 'ai' service
   - Validates message structure
   - Applies middleware (security, rate limiting)
   - Dispatches to background service for AI processing

### Recent Fix Details
**Problem**: Keyboard shortcuts weren't triggering at all
- Root cause: `content-orchestrator.js:36` was calling `this.keyboardHandler.initialize(this.editorIntegration)` with a parameter, but `KeyboardHandler.initialize()` takes no parameters and sets up its own event listener internally
- Message validation was too strict, rejecting valid requests for missing fields

**Solution**:
1. Removed the parameter from `keyboardHandler.initialize()` call (line 36)
2. Relaxed validation in `validateMessageType()` to allow AI requests without strict field requirements
3. KeyboardHandler already initializes properly in its constructor → no param needed

### Testing Keyboard Shortcuts
1. Open LeetCode problem page with Monaco Editor
2. Open Developer Console (F12)
3. Press any shortcut (e.g., `Ctrl+Space`)
4. Should see:
   - Console log: "Keyboard shortcut triggered: ctrl+space → completion"
   - Toast notification: "Initializing completion..."
   - API response displayed in toast or popup
5. If not working, check:
   - `keyboardHandler.stats` in console: verify shortcuts are registered
   - Content script running: check tab URL (must be on leetcode.com)
   - Background script: check manifest.json service_worker permission

### Configuration/Storage (Recently Added - Jan 2, 2026)
**Import/Export Feature**: Users can now export and import LeetPilot settings including API keys.

**Files Modified**:
- `src/ui/popup.html`: Added "Data Management" section with Export/Import buttons
- `src/ui/popup-manager.js`: Added `exportConfiguration()` and `importConfiguration()` methods

**How to Use**:
1. Click "Export Settings" button → downloads `leetpilot-config-{timestamp}.json`
2. Click "Import Settings" button → select previously exported JSON file
3. Imported config auto-saves and updates UI

**File Format** (JSON):
```json
{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-4",
  "maxTokens": 1000,
  "temperature": 0.7,
  "customApiUrl": null,
  "exportedAt": "2026-01-02T...",
  "version": "1.0.0"
}
```

**Security Note**: Exported JSON contains plain API key. Users should treat export files like passwords.

## Common Tasks
- **Add new keyboard shortcut**: Edit `defaultShortcuts` in `KeyboardHandler` constructor (line 15-23 in `src/content/keyboard-handler.js`)
- **Add new AI action**: 
  1. Add route in `src/background/message-router.js` → `setupDefaultRoutes()` method
  2. Add handler in `src/background/background-service.js` → `handleAIRequest()` method
  3. Add shortcut in keyboard handler if needed
- **Modify popup UI**: Edit `src/ui/popup.html` (structure/styling) + event handlers in `src/ui/popup-manager.js` (logic)
- **Change encryption**: See `StorageManager` + `EncryptionUtils` in `src/core/storage-manager.js`
- **Debug content script**: Use `chrome://extensions/` → check "Allow access to file URLs" + reload page
- **Check background service logs**: Open service worker (popup → "Inspect views") to see console output

## File Structure Details
```
src/
├── background/
│   ├── background-service.js      # Main AI request handler + config management
│   ├── message-router.js          # Route messages, validate, apply middleware
│   ├── request-orchestrator.js    # Coordinate API calls + error handling
│   └── index.js                   # Exports
├── content/
│   ├── content-orchestrator.js    # Main coordinator (Monaco detection, shortcuts)
│   ├── keyboard-handler.js        # Global keyboard listener + shortcut registration
│   ├── editor-integration.js      # Monaco Editor integration (get/set code)
│   ├── monaco-detector.js         # Detect & wait for Monaco Editor
│   └── index.js                   # Exports
├── core/
│   ├── storage-manager.js         # Encrypt/decrypt API keys, manage config
│   ├── api-client.js              # Make requests to OpenAI/Anthropic/Gemini
│   ├── input-validator.js         # Validate API keys, config, prompts
│   ├── error-handler.js           # Standardized error handling
│   ├── hint-system.js             # Generate educational hints
│   ├── prompt-engineer.js         # Build AI prompts (completion, explanation, etc.)
│   ├── context-manager.js         # Manage code context for requests
│   └── index.js                   # Exports
├── ui/
│   ├── popup.html                 # Popup UI (tabs: Main, Chat, Model, Settings)
│   ├── popup.js                   # Popup initialization
│   ├── popup-manager.js           # Popup logic (config, shortcuts, import/export)
│   ├── popup-modules.js           # Load modules into popup context
│   ├── theme-manager.js           # Dark mode toggle
│   └── index.js                   # Exports
├── utils/
│   ├── dom-utils.js               # DOM manipulation helpers
│   ├── logger.js                  # Logging utility
│   └── index.js                   # Exports
├── background.js                  # Service worker entry point
├── content.js                     # Content script entry point
└── index.js                       # Root exports
```

## API Key Encryption Details
**Location**: `src/core/storage-manager.js`

**How it works**:
1. On first run, generate AES-256-GCM encryption key via Web Crypto API
2. Store encryption key in `chrome.storage.local` (secured by Chrome)
3. When saving API key: encrypt with AES-GCM + IV, store encrypted + IV in storage
4. When retrieving API key: decrypt using stored key and IV

**Note**: API key is shown as `••••••••••••••••••••••••••••••••` in UI after first save for security.

## Debugging Tips
1. **Content script not loading**: Check `manifest.json` → content_scripts[0].matches includes `https://leetcode.com/*`
2. **Keyboard shortcut not firing**: 
   - Check console: `typeof window.LeetPilotModules` should not be undefined
   - Verify `KeyboardHandler` constructor ran (check `getStats()`)
   - Check if inside Monaco Editor (required for most shortcuts)
3. **API key not saving**: Check browser DevTools → Application → Storage → chrome-extension://{id}/
4. **Build fails**: Delete `node_modules`, run `npm install` again, then `npm run build:dev`

## Recent Changes Log
- **Jan 2, 2026**: 
  - Fixed keyboard shortcuts (removed parameter from initialize call)
  - Added import/export config feature
  - Updated knowledge.md with detailed documentation

