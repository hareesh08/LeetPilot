// Jest setup file for LeetPilot extension tests

// Mock Chrome extension APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  }
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock DOM methods that might not be available in jsdom
Object.defineProperty(window, 'getSelection', {
  writable: true,
  value: jest.fn(() => ({
    toString: jest.fn(() => ''),
    getRangeAt: jest.fn(() => ({
      commonAncestorContainer: document.body
    }))
  }))
});

// Mock getBoundingClientRect for all elements
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
  x: 0,
  y: 0
}));