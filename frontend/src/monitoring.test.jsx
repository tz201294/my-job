import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createErrorReporter } from './monitoring';

const fakeSentry = () => ({ init: vi.fn(), captureException: vi.fn() });

describe('error reporting', () => {
  it('stays off (and never loads Sentry) without a DSN', () => {
    const load = vi.fn();
    const r = createErrorReporter({ load });
    expect(r.start({ dsn: '', environment: 'production' })).toBe(false);
    r.report(new Error('x'));
    expect(load).not.toHaveBeenCalled();
  });

  it('starts Sentry without personal data, only for this site\'s own scripts', async () => {
    const S = fakeSentry();
    const r = createErrorReporter({ load: async () => S });
    expect(r.start({ dsn: 'https://k@o0.ingest.sentry.io/1', environment: 'demo', release: 'abc' })).toBe(true);
    await vi.waitFor(() => expect(S.init).toHaveBeenCalled());
    expect(S.init).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://k@o0.ingest.sentry.io/1', environment: 'demo', release: 'abc',
      sendDefaultPii: false, allowUrls: [window.location.origin], tracesSampleRate: 0,
    }));
  });

  it('keeps errors reported while Sentry is still loading, and sends them once it is ready', async () => {
    const S = fakeSentry();
    let ready;
    const r = createErrorReporter({ load: () => new Promise((res) => { ready = () => res(S); }) });
    r.start({ dsn: 'https://k@o0.ingest.sentry.io/1' });
    const early = new Error('early');
    r.report(early, { componentStack: 'in App' });
    expect(S.captureException).not.toHaveBeenCalled();
    ready();
    await vi.waitFor(() => expect(S.captureException).toHaveBeenCalledWith(early, { contexts: { react: { componentStack: 'in App' } } }));
    const later = new Error('later');
    r.report(later);
    expect(S.captureException).toHaveBeenLastCalledWith(later, undefined);
  });

  it('carries on quietly if Sentry can\'t load (ad blocker, offline)', async () => {
    const r = createErrorReporter({ load: () => Promise.reject(new Error('blocked')) });
    r.start({ dsn: 'https://k@o0.ingest.sentry.io/1' });
    r.report(new Error('x'));
    await new Promise((res) => setTimeout(res, 0));
    expect(() => r.report(new Error('y'))).not.toThrow();
  });

  it('the crash screen reports the error', async () => {
    vi.resetModules();
    const reportError = vi.fn();
    vi.doMock('./monitoring', () => ({ reportError }));
    const { default: ErrorBoundary } = await import('./components/ErrorBoundary');
    const Boom = () => { throw new Error('render failed'); };
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    quiet.mockRestore();
    vi.doUnmock('./monitoring');
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: 'render failed' }),
      expect.objectContaining({ componentStack: expect.any(String) }));
  });
});
