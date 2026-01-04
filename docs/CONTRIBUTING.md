# Contributing to LeetPilot

Thank you for your interest in contributing to LeetPilot! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Submitting Changes](#submitting-changes)
- [Style Guidelines](#style-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please be respectful and inclusive.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Google Chrome (for testing)
- Git

### Setting Up Development Environment

1. **Fork the Repository**

   Click the "Fork" button on the [repository page](https://github.com/leetpilot/extension) to create your own fork.

2. **Clone Your Fork**

   ```bash
   git clone https://github.com/YOUR-USERNAME/extension.git
   cd extension
   ```

3. **Set Up Upstream Remote**

   ```bash
   git remote add upstream https://github.com/leetpilot/extension.git
   ```

4. **Install Dependencies**

   ```bash
   npm install
   ```

5. **Sync with Upstream**

   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

---

## 🔧 Development Process

### Creating a Branch

Create a new branch for your work:

```bash
# For new features
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b fix/your-bug-fix

# For documentation changes
git checkout -b docs/your-docs-update
```

### Making Changes

1. Write your code following our [style guidelines](#style-guidelines)
2. Add or update tests as needed
3. Update documentation
4. Test your changes

### Building the Extension

```bash
# Development build (faster, no minification)
npm run build:dev

# Production build (minified, optimized)
npm run build:prod

# Build extension package
npm run build:extension
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Validate build artifacts
npm run validate:all
```

### Loading the Extension in Chrome

1. Build the extension: `npm run build:extension`
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist` folder

### Live Development

For active development, use TypeScript's watch mode:

```bash
npm run dev
```

Then reload the extension in Chrome after each change.

---

## 📤 Submitting Changes

### Pull Request Process

1. **Ensure your branch is up to date**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your branch**

   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request**

   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select your branch as the "compare" branch
   - Fill in the PR template completely

4. **Address Review Feedback**

   Make changes if requested and push additional commits.

### PR Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran to verify your changes.

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

---

## 📝 Style Guidelines

### JavaScript/TypeScript

- Use TypeScript for all new code
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use ESLint configuration (if available)
- Prefer `const` over `let`, avoid `var`

### Code Formatting

```javascript
// Good
const calculateSum = (a, b) => {
  return a + b;
};

// Bad
var calculateSum = function(a,b) { return a+b; }
```

### Naming Conventions

```javascript
// Variables and functions: camelCase
const userName = 'john';
function getUserData() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Classes: PascalCase
class UserService {}

// Files: kebab-case
// user-service.js (not userService.js or user_service.js)
```

### Comments

```javascript
// Single line comment

/**
 * Multi-line comment
 * Use JSDoc for functions
 * @param {string} name - Parameter description
 * @returns {string} Return value description
 */
```

---

## 🧪 Testing

### Writing Tests

All new features should include tests:

```javascript
// test/example.test.js
describe('Feature', () => {
  it('should do something', () => {
    const result = doSomething();
    expect(result).toBe(expected);
  });
});
```

### Test Structure

- Put tests in the `test/` directory
- Use the same filename as the source file with `.test.js` extension
- Aim for meaningful test coverage

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/your-test.test.js

# Generate coverage report
npm test -- --coverage
```

---

## 📚 Documentation

### Updating README

If your changes affect:

- **Features**: Update the [Features](#features) section
- **Installation**: Update the [Installation](#installation) section
- **Usage**: Update the [Usage](#usage) section
- **Configuration**: Update the [Configuration](#configuration) section

### Code Documentation

- Document all public functions with JSDoc
- Explain complex algorithms
- Document configuration options

---

## 🐛 Reporting Issues

### Before Submitting

1. Search existing [issues](https://github.com/leetpilot/extension/issues)
2. Check if a similar issue exists
3. Update to the latest version to see if the issue is resolved

### Issue Templates

Use the appropriate template when creating issues:

- **Bug Report**: For software defects
- **Feature Request**: For new features or improvements
- **Question**: For general questions

---

## 💬 Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community discussion
- **Pull Request Comments**: For specific questions about your PR

---

## 📄 License

By contributing to LeetPilot, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing! 🎉