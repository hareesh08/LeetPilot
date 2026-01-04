# LeetPilot Chrome Extension

<div align="center">

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.2.1-green.svg)](package.json)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)](https://chrome.google.com/webstore)

**AI-powered code completion and educational hints for LeetCode with BYOK (Bring Your Own Key) privacy**

[Features](#features) • [Installation](#installation) • [Contributing](#contributing) • [Issues](#raising-issues) • [Releases](#releases)

</div>

---

## 🌟 Features

LeetPilot enhances your LeetCode experience with powerful AI-driven tools:

| Feature | Shortcut | Description |
|---------|----------|-------------|
| **Code Completion** | `Ctrl+Space` | Get intelligent code suggestions while solving problems |
| **Error Explanations** | `Alt+E` | Understand and fix coding errors with detailed explanations |
| **Optimization Suggestions** | `Alt+O` | Improve your solution's performance and efficiency |
| **Step-by-Step Hints** | `Alt+H` | Get educational guidance without spoiling the solution |

### 🔒 Privacy-First Approach

LeetPilot uses a **Bring Your Own Key (BYOK)** model that prioritizes your privacy:

- ✅ Your API keys are stored locally in your browser
- ✅ Code and data go directly to your chosen AI provider
- ✅ No third-party servers or data collection
- ✅ Complete control over your data and privacy

### 🤖 Supported AI Providers

- **OpenAI** (GPT-4, GPT-3.5)
- **Anthropic** (Claude)
- **Google Gemini**
- **OpenAI-Compatability-Format**

---

## 🚀 Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/leetpilot/extension.git
cd extension

# Install dependencies
npm install

# Build the extension
npm run build:extension

# Load in Chrome:
# 1. Open Chrome → chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" → select the `dist` folder
```

### From Release

Download the latest release from our [Releases page](https://github.com/leetpilot/extension/releases) and follow the Chrome extension installation instructions.

---

## ⚙️ Configuration

1. Click the LeetPilot extension icon in your browser toolbar
2. Select your preferred AI provider (OpenAI, Anthropic, or Google Gemini)
3. Enter your API key (get one from your chosen provider's dashboard)
4. Save the configuration

---

## 📖 Usage

1. Navigate to any LeetCode problem
2. Use keyboard shortcuts while coding:
   - `Ctrl+Space` - Code completion
   - `Alt+E` - Error explanation
   - `Alt+O` - Optimization suggestions
   - `Alt+H` - Step hints

---

## 🤝 Contributing

We welcome contributions from the community! Whether you want to report a bug, suggest a feature, or contribute code, your help is appreciated.

### Ways to Contribute

- 🐛 **Report Bugs**: Help us identify and fix issues
- 💡 **Suggest Features**: Share your ideas for new functionality
- 🔧 **Submit Pull Requests**: Contribute code improvements
- 📝 **Improve Documentation**: Help make our docs better
- 🧪 **Test**: Report issues and verify fixes

### Getting Started

1. **Fork the Repository**

   Click the "Fork" button at the top right of this page to create your own fork.

2. **Clone Your Fork**

   ```bash
   git clone https://github.com/YOUR-USERNAME/extension.git
   cd extension
   ```

3. **Set Upstream Remote**

   ```bash
   git remote add upstream https://github.com/leetpilot/extension.git
   ```

4. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/your-bug-fix
   ```

5. **Make Changes & Test**

   ```bash
   # Install dependencies
   npm install

   # Make your changes
   
   # Run tests
   npm test

   # Build to verify
   npm run build:extension
   ```

6. **Submit a Pull Request**

   - Push your branch to your fork
   - Create a Pull Request against the `main` branch
   - Fill in the PR template with details about your changes

### Contribution Guidelines

- Follow existing code style and conventions
- Write clear commit messages
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting

---

## 🐛 Raising Issues

Found a bug or have a feature request? We appreciate your feedback!

### Before Submitting

- Search existing [issues](https://github.com/leetpilot/extension/issues) to avoid duplicates
- Check if the issue is already reported or being worked on

### How to Submit an Issue

1. Go to our [Issues page](https://github.com/leetpilot/extension/issues)
2. Click **New Issue**
3. Choose the appropriate template:

#### Bug Report Template

```markdown
## Bug Description
Describe the bug clearly and concisely.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened (include screenshots if applicable).

## Environment
- OS: [e.g., Windows 11, macOS]
- Browser: [e.g., Chrome 120+]
- Extension Version: [e.g., 1.2.1]

## Additional Context
Any other context about the problem.
```

#### Feature Request Template

```markdown
## Feature Description
Describe the feature you'd like to see.

## Problem Statement
What problem does this solve?

## Proposed Solution
Describe your proposed solution.

## Alternatives Considered
What alternatives have you considered?

## Additional Context
Any other context or screenshots.
```

---

## 📦 Releases

### Version History

All releases are available on our [Releases page](https://github.com/leetpilot/extension/releases).

| Version | Date | Changelog |
|---------|------|-----------|
| [v1.2.1](https://github.com/leetpilot/extension/releases/tag/v1.2.1) | 2024-01-04 | Latest stable release |
| [v1.2.0](https://github.com/leetpilot/extension/releases/tag/v1.2.0) | 2024-01-01 | Feature release |
| [v1.1.0](https://github.com/leetpilot/extension/releases/tag/v1.1.0) | 2023-12-15 | Bug fixes |

### Automatic Releases

This project uses GitHub Actions for automated releases:

- **Build & Test**: Runs on every push to validate code
- **Release**: Creates releases automatically when tags are pushed
- **Version Tagging**: Uses semantic versioning (MAJOR.MINOR.PATCH)

#### Creating a Release

```bash
# Patch release (bug fixes)
npm run version:patch

# Minor release (new features)
npm run version:minor

# Major release (breaking changes)
npm run version:major

# Push the tag
git push origin v1.2.1
```

This triggers the GitHub Actions workflow to:
1. Build the extension
2. Run all tests
3. Create a GitHub release
4. Upload the extension package (`.zip`)
5. Create a version tag

---

## 🙏 Credits

### Developers

- **LeetPilot Team** - [GitHub](https://github.com/leetpilot)

### Open Source Libraries

This project uses the following open source software:

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [TypeScript](https://www.typescriptlang.org/) | ^5.5.3 | Apache-2.0 | Type-safe JavaScript |
| [Webpack](https://webpack.js.org/) | ^5.104.1 | MIT | Module bundler |
| [Jest](https://jestjs.io/) | ^29.7.0 | MIT | Testing framework |
| [Terser Webpack Plugin](https://terser.org/) | ^5.3.16 | BSD-2-Clause | Code minification |

### Special Thanks

- [LeetCode](https://leetcode.com/) - For providing an amazing platform
- [All Contributors](https://github.com/leetpilot/extension/graphs/contributors) - For their contributions
- The open source community for making this project possible

---

## 📁 Project Structure

```
leetpilot/
├── .github/
│   └── workflows/           # GitHub Actions workflows
├── src/
│   ├── background/          # Background service worker
│   │   ├── background-service.js
│   │   ├── index.js
│   │   ├── message-router.js
│   │   └── request-orchestrator.js
│   ├── content/             # Content scripts for LeetCode
│   │   ├── content-orchestrator.js
│   │   ├── editor-integration.js
│   │   ├── index.js
│   │   ├── keyboard-handler.js
│   │   └── monaco-detector.js
│   ├── core/                # Core functionality
│   │   ├── api-client.js
│   │   ├── context-manager.js
│   │   ├── error-handler.js
│   │   ├── hint-system.js
│   │   ├── index.js
│   │   ├── input-validator.js
│   │   ├── prompt-engineer.js
│   │   ├── rate-limiter.js
│   │   ├── security-monitor.js
│   │   ├── service-container.js
│   │   ├── storage-manager.js
│   │   └── validation-utils.js
│   ├── ui/                  # User interface
│   │   ├── completion-display.js
│   │   ├── error-display.js
│   │   ├── hint-display.js
│   │   ├── index.js
│   │   ├── popup-manager.js
│   │   ├── popup-modules.js
│   │   ├── popup-styles.css
│   │   ├── popup.html
│   │   ├── popup.js
│   │   ├── theme-manager.js
│   │   └── markdown-viewer.js
│   ├── utils/               # Utilities
│   │   ├── dom-utils.js
│   │   ├── index.js
│   │   ├── logger.js
│   │   └── validation-utils.js
│   ├── background.js         # Background entry point
│   ├── content.js           # Content script entry point
│   └── index.js             # Main entry point
├── test/                    # Test files
├── scripts/                 # Build and utility scripts
├── icons/                   # Extension icons
├── docs/                    # Documentation
├── manifest.json            # Chrome extension manifest
├── package.json             # NPM configuration
├── tsconfig.json            # TypeScript configuration
└── webpack.config.js        # Webpack configuration
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📧 Contact

- **GitHub Issues**: [Report bugs or suggest features](https://github.com/leetpilot/extension/issues)
- **Repository**: [https://github.com/leetpilot/extension](https://github.com/leetpilot/extension)

---

<div align="center">

**Made with ❤️ by the LeetPilot Team**

</div>