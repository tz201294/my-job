import { describe, expect, it } from 'vitest';
import { fallbackRedirect, restoredPath } from './spaFallback';

describe('GitHub Pages direct links', () => {
  const base = '/my-job/';

  it('sends demo addresses that reached the main app to the demo', () => {
    expect(fallbackRedirect({ pathname: '/my-job/demo/u/elena_lawyer', base, demoPath: 'demo/' }))
      .toBe('/my-job/demo/?p=%2Fu%2Felena_lawyer');
    expect(fallbackRedirect({ pathname: '/my-job/demo/p/post_503', base, demoPath: 'demo/' }))
      .toBe('/my-job/demo/?p=%2Fp%2Fpost_503');
  });

  it('leaves the main app\'s own addresses alone', () => {
    expect(fallbackRedirect({ pathname: '/my-job/u/sam', base, demoPath: 'demo/' })).toBe(null);
    expect(fallbackRedirect({ pathname: '/my-job/demo/', base, demoPath: 'demo/' })).toBe(null);
    expect(fallbackRedirect({ pathname: '/my-job/demonstration', base, demoPath: 'demo/' })).toBe(null);
    expect(fallbackRedirect({ pathname: '/my-job/demo/u/sam', base, demoPath: undefined })).toBe(null);
  });

  it('restores the address inside the demo', () => {
    expect(restoredPath({ search: '?p=%2Fu%2Felena_lawyer', base: '/my-job/demo/' })).toBe('/my-job/demo/u/elena_lawyer');
    expect(restoredPath({ search: '', base: '/my-job/demo/' })).toBe(null);
  });

  it('refuses anything that is not a same-site path', () => {
    for (const p of ['https://evil.example', '//evil.example', 'u/sam', '/\\evil.example']) {
      expect(restoredPath({ search: `?p=${encodeURIComponent(p)}`, base: '/my-job/demo/' })).toBe(null);
    }
  });
});
