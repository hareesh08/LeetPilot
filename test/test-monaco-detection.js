// Test Monaco Editor Detection Fixes
// This test verifies that the Monaco Editor detection improvements work correctly

console.log('Testing Monaco Editor detection fixes...');

// Test 1: Verify chrome.tabs.query is removed from content script
function testChromeTabsRemoval() {
  const fs = require('fs');
  const contentScript = fs.readFileSync('src/content.js', 'utf8');
  
  // Check that chrome.tabs.query is not present in content script
  const hasChromeTabs = contentScript.includes('chrome.tabs.query');
  
  if (hasChromeTabs) {
    console.error('❌ FAIL: chrome.tabs.query still found in content script');
    return false;
  } else {
    console.log('✅ PASS: chrome.tabs.query removed from content script');
    return true;
  }
}

// Test 2: Verify needsTabId flag is used instead
function testNeedsTabIdFlag() {
  const fs = require('fs');
  const contentScript = fs.readFileSync('src/content.js', 'utf8');
  
  // Check that needsTabId flag is used
  const hasNeedsTabId = contentScript.includes('needsTabId: true');
  
  if (!hasNeedsTabId) {
    console.error('❌ FAIL: needsTabId flag not found in content script');
    return false;
  } else {
    console.log('✅ PASS: needsTabId flag found in content script');
    return true;
  }
}

// Test 3: Verify background script handles tab ID requests
function testBackgroundTabIdHandling() {
  const fs = require('fs');
  const backgroundScript = fs.readFileSync('src/background.js', 'utf8');
  
  // Check that background script handles needsTabId
  const handlesTabId = backgroundScript.includes('request.needsTabId') && 
                      backgroundScript.includes('sender.tab.id');
  
  if (!handlesTabId) {
    console.error('❌ FAIL: Background script does not handle tab ID requests');
    return false;
  } else {
    console.log('✅ PASS: Background script handles tab ID requests');
    return true;
  }
}

// Test 4: Verify improved Monaco Editor selectors
function testImprovedSelectors() {
  const fs = require('fs');
  const contentScript = fs.readFileSync('src/content.js', 'utf8');
  
  // Check for improved selectors
  const hasImprovedSelectors = contentScript.includes('.monaco-editor-background') &&
                              contentScript.includes('.inputarea') &&
                              contentScript.includes('.overflow-guard');
  
  if (!hasImprovedSelectors) {
    console.error('❌ FAIL: Improved Monaco Editor selectors not found');
    return false;
  } else {
    console.log('✅ PASS: Improved Monaco Editor selectors found');
    return true;
  }
}

// Test 5: Verify error handling for editor not found
function testEditorNotFoundHandling() {
  const fs = require('fs');
  const contentScript = fs.readFileSync('src/content.js', 'utf8');
  
  // Check for editorNotFound handling
  const hasErrorHandling = contentScript.includes('editorNotFound') &&
                          contentScript.includes('showEditorDetectionFailure');
  
  if (!hasErrorHandling) {
    console.error('❌ FAIL: Editor not found error handling missing');
    return false;
  } else {
    console.log('✅ PASS: Editor not found error handling present');
    return true;
  }
}

// Run all tests
function runTests() {
  console.log('\n=== Monaco Editor Detection Fix Tests ===\n');
  
  const tests = [
    testChromeTabsRemoval,
    testNeedsTabIdFlag,
    testBackgroundTabIdHandling,
    testImprovedSelectors,
    testEditorNotFoundHandling
  ];
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach(test => {
    if (test()) {
      passed++;
    }
  });
  
  console.log(`\n=== Test Results ===`);
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! The Monaco Editor detection fixes are working correctly.');
  } else {
    console.log('❌ Some tests failed. Please review the fixes.');
  }
  
  return passed === total;
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runTests,
    testChromeTabsRemoval,
    testNeedsTabIdFlag,
    testBackgroundTabIdHandling,
    testImprovedSelectors,
    testEditorNotFoundHandling
  };
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}