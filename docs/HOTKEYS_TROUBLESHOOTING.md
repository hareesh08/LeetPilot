# LeetPilot Hotkeys Troubleshooting Guide

## Fixed Issues

The hotkeys were not working because:
1. The `commands` API was missing from `manifest.json`
2. The background service wasn't listening for command events
3. The content script wasn't receiving command messages from the background

## Changes Made

### 1. Added Commands to manifest.json
Added the `commands` section with keyboard shortcuts:
- **Ctrl+Space**: Trigger code completion
- **Alt+E**: Get code explanation
- **Alt+O**: Get optimization suggestions
- **Alt+H**: Get progressive hint

### 2. Updated Background Service
Added command listener in `src/background/background-service.js`:
- Listens for `chrome.commands.onCommand` events
- Maps commands to actions
- Sends messages to content script on active LeetCode tabs

### 3. Updated Content Orchestrator
Added command message listener in `src/content/content-orchestrator.js`:
- Listens for `trigger-shortcut` messages from background
- Executes the corresponding action

## How to Test

1. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Click the reload button on LeetPilot
   - Or use the developer reload shortcut

2. **Navigate to LeetCode**:
   - Open any problem on leetcode.com
   - Wait for the Monaco editor to load

3. **Test the hotkeys**:
   - Press **Ctrl+Space** for code completion
   - Press **Alt+E** for explanation
   - Press **Alt+O** for optimization
   - Press **Alt+H** for hints

4. **Check the console**:
   - Open DevTools (F12)
   - Look for messages like "Command received: trigger-completion"
   - Check for any errors

## Customizing Hotkeys

Users can customize keyboard shortcuts:
1. Go to `chrome://extensions/shortcuts`
2. Find "LeetPilot" in the list
3. Click the edit icon next to each command
4. Set custom key combinations

## Additional Keyboard Shortcuts

The extension also has in-page shortcuts (defined in `keyboard-handler.js`):
- **Escape**: Dismiss popups
- **Tab**: Accept completion
- **Ctrl+Shift+R**: Reset hints

These work within the LeetCode page context and don't need manifest registration.

## Troubleshooting

### Hotkeys still not working?

1. **Check if extension is loaded**:
   - Verify the extension icon appears in Chrome toolbar
   - Check `chrome://extensions/` shows LeetPilot as enabled

2. **Check if on LeetCode**:
   - Hotkeys only work on leetcode.com pages
   - Make sure you're on a problem page with the editor

3. **Check for conflicts**:
   - Other extensions might be using the same shortcuts
   - Try disabling other extensions temporarily
   - Check `chrome://extensions/shortcuts` for conflicts

4. **Check console logs**:
   - Open DevTools on LeetCode page
   - Press a hotkey
   - Look for "Command received" or error messages

5. **Verify API configuration**:
   - Click the extension icon
   - Make sure API key is configured
   - Test the connection

6. **Hard reload**:
   - Remove and re-add the extension
   - Clear browser cache
   - Restart Chrome

## Known Limitations

- Global shortcuts (Ctrl+Space, Alt+E, etc.) only work when Chrome is focused
- Some shortcuts may conflict with browser or OS shortcuts
- Shortcuts don't work in Chrome's special pages (chrome://, chrome-extension://)
- The extension must be loaded and the content script must be initialized

## Debug Mode

To enable detailed logging:
1. Open DevTools on LeetCode page
2. Check console for initialization messages
3. Look for "Keyboard handler initialized"
4. Test shortcuts and watch for event logs
