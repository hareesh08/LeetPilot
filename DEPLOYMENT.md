# LeetPilot Extension Deployment Guide

## Overview

This guide covers the complete process for packaging and deploying the LeetPilot Chrome extension to the Chrome Web Store.

## Prerequisites

- Node.js and npm installed
- Chrome browser for testing
- Chrome Web Store Developer account ($5 registration fee)
- Designed extension icons (replace placeholders)

## Build Process

### Development Build
```bash
npm run package:dev
```
This creates a development package for local testing.

### Production Build
```bash
npm run package:prod
```
This creates a production-ready package with full validation.

### Chrome Web Store Preparation
```bash
npm run prepare:store
```
This runs all validations and creates the final package for store submission.

## Version Management

### Patch Version (1.0.0 → 1.0.1)
```bash
npm run version:patch
```

### Minor Version (1.0.0 → 1.1.0)
```bash
npm run version:minor
```

### Major Version (1.0.0 → 2.0.0)
```bash
npm run version:major
```

All version commands automatically update both package.json and manifest.json.

## Pre-Submission Checklist

### 1. Icons
- [ ] Replace placeholder icons with actual designed icons
- [ ] Ensure all icons (16x16, 32x32, 48x48, 128x128) are present
- [ ] Icons are PNG format with transparent backgrounds
- [ ] Icons follow Chrome extension design guidelines

### 2. Metadata
- [ ] Extension name is appropriate and not trademarked
- [ ] Description is clear and under 132 characters
- [ ] Homepage URL is valid (if provided)
- [ ] Author information is correct

### 3. Functionality
- [ ] Extension works on LeetCode.com
- [ ] All keyboard shortcuts function correctly
- [ ] API key configuration works with all providers
- [ ] No console errors in production build

### 4. Privacy & Security
- [ ] Privacy policy is available (required for extensions handling user data)
- [ ] All API communications use HTTPS
- [ ] No sensitive data is logged or exposed
- [ ] Permissions are minimal and justified

### 5. Testing
- [ ] All unit tests pass: `npm test`
- [ ] Manual testing on different LeetCode problems
- [ ] Testing with all supported AI providers
- [ ] Cross-browser testing (Chrome, Edge, etc.)

## Chrome Web Store Submission

### 1. Package Creation
```bash
npm run prepare:store
```

### 2. Developer Dashboard
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Click "Add new item"
3. Upload `leetpilot-extension.zip`

### 3. Store Listing
- **Category**: Productivity
- **Language**: English
- **Visibility**: Public
- **Pricing**: Free

### 4. Required Assets
- **Screenshots**: 1280x800 or 640x400 pixels (at least 1 required)
- **Promotional images**: 440x280 pixels (optional but recommended)
- **Detailed description**: Comprehensive feature explanation

### 5. Privacy Practices
- Declare data usage (API keys stored locally)
- Link to privacy policy
- Justify all permissions

## Update Handling

### Automatic Updates
Chrome automatically updates extensions when new versions are published to the store.

### Update Notifications
The extension includes update_url in manifest.json for Chrome's automatic update system.

### Version Compatibility
- Maintain backward compatibility for stored user data
- Handle API changes gracefully
- Test updates with existing user configurations

## Rollback Strategy

### If Issues Arise
1. Unpublish current version in Developer Dashboard
2. Fix issues in codebase
3. Increment version number
4. Re-submit with fixes

### Emergency Rollback
1. Revert to previous working version
2. Update version number appropriately
3. Submit emergency update

## Monitoring

### Post-Launch Monitoring
- Monitor Chrome Web Store reviews
- Check error reports in Developer Dashboard
- Monitor API usage patterns
- Track user feedback

### Analytics (Optional)
Consider adding privacy-compliant analytics to understand:
- Feature usage patterns
- Error rates
- Performance metrics

## Support

### User Support Channels
- Chrome Web Store reviews
- GitHub issues (if open source)
- Support email (if provided)

### Documentation
- Keep README.md updated
- Maintain changelog
- Document known issues

## Legal Considerations

### Required Policies
- Privacy Policy (required for data handling)
- Terms of Service (recommended)
- DMCA compliance

### Intellectual Property
- Ensure no trademark violations
- Respect LeetCode's terms of service
- Comply with AI provider terms

## Troubleshooting

### Common Issues
- **Icons not displaying**: Check PNG format and file sizes
- **Permissions rejected**: Justify all requested permissions
- **Policy violations**: Review Chrome Web Store policies
- **Update failures**: Check version numbering and manifest validity

### Validation Failures
Run diagnostic commands:
```bash
npm run validate:icons
npm run validate:package
```

## Resources

- [Chrome Extension Developer Guide](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store Developer Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating/)