# Manual Testing Guide: LeetCode Options Fix

## Prerequisites
1. Build the extension: `npm run build:dev`
2. Load the extension in Chrome from the `dist-dev` folder
3. Navigate to any LeetCode problem page

## Test 1: Settings Persistence

### Steps:
1. Click the LeetPilot extension icon to open the popup
2. Go to the "Main" tab
3. Toggle "Auto Code Complete" OFF
4. Toggle "Auto Hints" OFF
5. Close the popup
6. Open the popup again
7. Go to the "Main" tab

### Expected Result:
✅ "Auto Code Complete" should still be OFF  
✅ "Auto Hints" should still be OFF  
✅ Settings should persist across popup opens

## Test 2: Settings Storage in Chrome

### Steps:
1. Open Chrome DevTools (F12)
2. Go to Application tab → Storage → Extension Storage
3. Find your extension ID
4. Look for `leetpilot_settings` key

### Expected Result:
✅ Should see `leetpilot_settings` with your toggle states:
```json
{
  "autoComplete": false,
  "autoHint": false,
  "autoErrorFix": true,
  "autoOptimize": true
}
```

## Test 3: Settings API Endpoint

### Steps:
1. Open the popup
2. Open DevTools Console (F12)
3. Run this command:
```javascript
chrome.runtime.sendMessage({ type: 'getSettings' }, (response) => {
  console.log('Settings:', response);
});
```

### Expected Result:
✅ Should see response with your settings:
```javascript
{
  success: true,
  settings: {
    autoComplete: false,
    autoHint: false,
    autoErrorFix: true,
    autoOptimize: true,
    notifications: true,
    sound: false
  }
}
```

## Test 4: Keyboard Shortcuts Still Work

### Steps:
1. Go to any LeetCode problem page
2. Make sure "Auto Code Complete" is toggled OFF in the popup
3. Press `Ctrl+Space` in the Monaco Editor

### Expected Result:
✅ Code completion should still work (keyboard shortcuts are manual, not affected by auto-toggles)  
✅ Should see toast notification: "Initializing completion..."  
✅ Should receive AI response

## Test 5: Settings Update Message

### Steps:
1. Open the popup
2. Open DevTools Console (F12)
3. Toggle any setting (e.g., "Auto Error Fix")
4. Check the console logs

### Expected Result:
✅ Should see in background service worker console:
```
Updating setting: autoErrorFix = true
Setting autoErrorFix updated to true
```

## Test 6: Background Service Worker Logs

### Steps:
1. Go to `chrome://extensions/`
2. Find LeetPilot extension
3. Click "service worker" link (under "Inspect views")
4. This opens the background service worker console
5. Toggle a setting in the popup
6. Check the console

### Expected Result:
✅ Should see logs confirming setting update:
```
Updating setting: autoComplete = false
```

## Test 7: Settings Reset

### Steps:
1. Open the popup
2. Go to "Settings" tab
3. Click "Reset All Settings"
4. Confirm the reset
5. Popup should reload

### Expected Result:
✅ All settings should return to defaults  
✅ Auto toggles should be back to their default states

## Test 8: Import/Export with Settings

### Steps:
1. Configure some settings (toggle some options)
2. Go to "Settings" tab
3. Click "Export Settings"
4. Save the JSON file
5. Toggle all settings to opposite values
6. Click "Import Settings"
7. Select the exported JSON file

### Expected Result:
✅ Settings should be restored to exported values  
✅ All toggles should match the exported state

## Troubleshooting

### Settings Not Persisting
- Check if extension has storage permissions in manifest.json
- Check browser console for errors
- Try reloading the extension

### Background Service Not Responding
- Go to `chrome://extensions/`
- Click "Reload" on LeetPilot extension
- Check service worker console for errors

### Toggles Not Updating
- Check if popup-manager.js is loaded correctly
- Check browser console for JavaScript errors
- Verify chrome.runtime.sendMessage is working

## Known Limitations

1. **Auto-toggles don't affect keyboard shortcuts**: The toggles are designed for future automatic triggering features (like auto-completion while typing). Manual keyboard shortcuts always work regardless of toggle state.

2. **No automatic triggering yet**: The extension currently only responds to keyboard shortcuts. Automatic features (like showing hints while typing) are not implemented yet.

3. **localStorage fallback**: If chrome.storage fails, settings fall back to localStorage, which is less reliable but ensures the popup remains functional.

## Success Criteria

All tests should pass with ✅. If any test fails, check:
1. Extension is properly built and loaded
2. No JavaScript errors in console
3. Background service worker is running
4. Storage permissions are granted
