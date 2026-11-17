// The only parts of Sentry the app uses. Loaded on demand by monitoring.js; importing just these (rather than the
// whole package) keeps session replay, the feedback widget and the rest out of the download.
export { captureException, init } from '@sentry/browser';
