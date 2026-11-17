// Error reporting (Sentry). Off unless the build sets VITE_SENTRY_DSN.
//
// With it on, crashes (the "Something went wrong" screen) and unhandled errors in the browser are sent to Sentry
// with a stack trace, so they show up there instead of only in a visitor's console. The Sentry code is loaded
// only when reporting is on, so builds without a DSN don't download it at all.
//
// Privacy: no personal data. Sentry's defaults already leave out IP addresses, cookies and request bodies; on top
// of that only errors from this site's own scripts are sent (not from browser extensions), and no session
// replays or performance traces are recorded.

const MAX_QUEUED = 10;

export function createErrorReporter({ load = () => import('./sentry') } = {}) {
  let sentry = null;
  let started = false;
  const queued = [];

  return {
    /** Starts reporting if a DSN is given. Returns whether it did. Errors reported while Sentry loads are kept. */
    start({ dsn, environment, release }) {
      if (!dsn || started) return false;
      started = true;
      load()
        .then((S) => {
          S.init({
            dsn,
            environment,
            release: release || undefined,
            sendDefaultPii: false,
            allowUrls: [window.location.origin],
            tracesSampleRate: 0,
          });
          sentry = S;
          queued.splice(0).forEach(([error, extra]) => S.captureException(error, extra));
        })
        .catch(() => {
          // Blocked by an ad blocker or offline: carry on without reporting.
          started = false;
          queued.length = 0;
        });
      return true;
    },

    /** Reports an error that the app caught itself (unhandled ones are picked up automatically). */
    report(error, context) {
      const extra = context ? { contexts: { react: context } } : undefined;
      if (sentry) sentry.captureException(error, extra);
      else if (started && queued.length < MAX_QUEUED) queued.push([error, extra]);
    },
  };
}

const reporter = createErrorReporter();

export function startErrorReporting(isDemo) {
  return reporter.start({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    // Errors from the in-browser demo are kept apart from the real app's.
    environment: isDemo ? 'demo' : 'production',
    release: import.meta.env.VITE_SENTRY_RELEASE,
  });
}

export const reportError = (error, context) => reporter.report(error, context);
