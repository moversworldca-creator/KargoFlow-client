import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Automatically clean up DOM nodes after each test case
afterEach(() => {
  cleanup();
});

// Mock any window APIs not supported by jsdom
window.scrollTo = vi.fn();
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

// Prevent JSDOM from crashing on CSS nesting/stylesheets by stubbing style element content in tests
const originalStyleTextContent = Object.getOwnPropertyDescriptor(HTMLStyleElement.prototype, 'textContent');
Object.defineProperty(HTMLStyleElement.prototype, 'textContent', {
  set(_value) {
    if (originalStyleTextContent && originalStyleTextContent.set) {
      originalStyleTextContent.set.call(this, '');
    }
  },
  get() {
    return originalStyleTextContent && originalStyleTextContent.get ? originalStyleTextContent.get.call(this) : '';
  }
});

const originalStyleInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
Object.defineProperty(HTMLStyleElement.prototype, 'innerHTML', {
  set(_value) {
    if (originalStyleInnerHTML && originalStyleInnerHTML.set) {
      originalStyleInnerHTML.set.call(this, '');
    }
  },
  get() {
    return originalStyleInnerHTML && originalStyleInnerHTML.get ? originalStyleInnerHTML.get.call(this) : '';
  }
});

const originalAppendChild = HTMLStyleElement.prototype.appendChild;
HTMLStyleElement.prototype.appendChild = function(node) {
  if (node && node.nodeType === 3) { // TEXT_NODE
    node.nodeValue = '';
  }
  return originalAppendChild.call(this, node);
};

