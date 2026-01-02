# LeetPilot Chrome Extension

AI-powered code completion and educational hints for LeetCode with BYOK (Bring Your Own Key) privacy.

## Features

- **Code Completion** (Ctrl+Space): Get intelligent code suggestions while solving problems
- **Error Explanations** (Alt+E): Understand and fix coding errors
- **Optimization Suggestions** (Alt+O): Improve your solution's performance
- **Step-by-Step Hints** (Alt+H): Get educational guidance without spoiling the solution

## Privacy-First Approach

LeetPilot uses a Bring Your Own Key (BYOK) model:
- Your API keys are stored locally in your browser
- Code and data go directly to your chosen AI provider
- No third-party servers or data collection
- Complete control over your data and privacy

## Supported AI Providers

- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google Gemini

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build:extension` to build the extension
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the `dist` folder

## Configuration

1. Click the LeetPilot extension icon in your browser toolbar
2. Select your preferred AI provider
3. Enter your API key (get one from your chosen provider)
4. Save the configuration

## Usage

1. Navigate to any LeetCode problem
2. Use the keyboard shortcuts while coding:
   - **Ctrl+Space**: Code completion
   - **Alt+E**: Error explanation
   - **Alt+O**: Optimization suggestions
   - **Alt+H**: Step hints

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Build extension for Chrome
npm run build:extension

# Development mode (watch for changes)
npm run dev
```

## Project Structure

```
├── manifest.json          # Chrome extension manifest
├── background/            # Background service worker
│   └── background.js
├── content/              # Content scripts for LeetCode integration
│   └── content.js
├── popup/                # Extension popup interface (moved to src/ui/)
│   ├── popup.html        # Now at src/ui/popup.html
│   └── popup.js          # Now at src/ui/popup.js
├── icons/                # Extension icons
└── src/                  # TypeScript source files
```

## Requirements

- Chrome browser (Manifest V3 compatible)
- API key from supported AI provider
- Active internet connection for AI requests

## License

Private project - All rights reserved.