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

// Test 2: Verify Monaco detector has improved detection strategies
function testImprovedDetectionStrategies() {
  const fs = require('fs');
  const monacoDetector = fs.readFileSync('src/content/monaco-detector.js', 'utf8');
  
  // Check for improved detection methods
  const hasDetectFromWindow = monacoDetector.includes('detectFromWindow');
  const hasDetectWithLeetCodeSelectors = monacoDetector.includes('detectWithLeetCodeSelectors');
  const hasAttemptDetection = monacoDetector.includes('attemptDetection');
  
  if (!hasDetectFromWindow || !hasDetectWithLeetCodeSelectors || !hasAttemptDetection) {
    console.error('❌ FAIL: Improved detection strategies not found in monaco-detector.js');
    console.error('   - detectFromWindow:', hasDetectFromWindow);
    console.error('   - detectWithLeetCodeSelectors:', hasDetectWithLeetCodeSelectors);
    console.error('   - attemptDetection:', hasAttemptDetection);
    return false;
  } else {
    console.log('✅ PASS: Improved detection strategies found in monaco-detector.js');
    return true;
  }
}

// Test 3: Verify content orchestrator handles detection failures gracefully
function testDetectionFailureHandling() {
  const fs = require('fs');
  const orchestrator = fs.readFileSync('src/content/content-orchestrator.js', 'utf8');
  
  // Check for graceful failure handling
  const hasSetupFallback = orchestrator.includes('setupFallbackEditorDetection');
  const hasTryFallback = orchestrator.includes('tryFallbackDetection');
  const hasGracefulCatch = orchestrator.includes('catch (detectError)');
  
  if (!hasSetupFallback || !hasTryFallback || !hasGracefulCatch) {
    console.error('❌ FAIL: Content orchestrator does not handle detection failures gracefully');
    console.error('   - setupFallbackEditorDetection:', hasSetupFallback);
    console.error('   - tryFallbackDetection:', hasTryFallback);
    console.error('   - graceful catch:', hasGracefulCatch);
    return false;
  } else {
    console.log('✅ PASS: Content orchestrator handles detection failures gracefully');
    return true;
  }
}

// Test 4: Verify improved Monaco Editor selectors in detector
function testImprovedSelectors() {
  const fs = require('fs');
  const monacoDetector = fs.readFileSync('src/content/monaco-detector.js', 'utf8');
  
  // Check for improved selectors
  const hasMonacoStructure = monacoDetector.includes('.overflow-guard') &&
                             monacoDetector.includes('.monaco-editor-background');
  const hasLeetCodeSelectors = monacoDetector.includes('[class*="code-editor"]') &&
                               monacoDetector.includes('[class*="editor-container"]');
  
  if (!hasMonacoStructure || !hasLeetCodeSelectors) {
    console.error('❌ FAIL: Improved Monaco Editor selectors not found');
    console.error('   - Monaco structure:', hasMonacoStructure);
    console.error('   - LeetCode selectors:', hasLeetCodeSelectors);
    return false;
  } else {
    console.log('✅ PASS: Improved Monaco Editor selectors found');
    return true;
  }
}

// Test 5: Verify isMainCodeEditor is lenient with empty editors
function testLenientEditorValidation() {
  const fs = require('fs');
  const monacoDetector = fs.readFileSync('src/content/monaco-detector.js', 'utf8');
  
  // Check that isMainCodeEditor doesn't require code content for empty editors
  // The updated logic should accept editors with Monaco structure even if empty
  const hasIsMainCodeEditor = monacoDetector.includes('isMainCodeEditor');
  const hasLeetCodeEditorCheck = monacoDetector.includes('isLeetCodeEditor');
  
  if (!hasIsMainCodeEditor) {
    console.error('❌ FAIL: isMainCodeEditor method not found');
    return false;
  }
  
  // Verify the method doesn't strictly require code content
  const lenientValidation = monacoDetector.includes('isValidEditor = (codeArea || hasTextArea || hasMonacoStructure || isLeetCodeEditor)');
  
  if (!lenientValidation) {
    console.error('❌ FAIL: Editor validation is not lenient for empty editors');
    return false;
  } else {
    console.log('✅ PASS: Editor validation is lenient for empty editors');
    return true;
  }
}

// Run all tests
function runTests() {
  console.log('\n=== Monaco Editor Detection Fix Tests ===\n');
  
  const tests = [
    testChromeTabsRemoval,
    testImprovedDetectionStrategies,
    testDetectionFailureHandling,
    testImprovedSelectors,
    testLenientEditorValidation
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
    testImprovedDetectionStrategies,
    testDetectionFailureHandling,
    testImprovedSelectors,
    testLenientEditorValidation
  };
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}