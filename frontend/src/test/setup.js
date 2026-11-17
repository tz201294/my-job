// Runs before every test file (see vite.config.js). Tests use demo mode, so the whole app runs in-browser.
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetDemoData } from '../api/demoBackend';

beforeEach(() => {
  localStorage.clear();
  resetDemoData();
  window.scrollTo = () => {};
  window.confirm = () => true;
});

afterEach(() => {
  cleanup();
});
