import React from 'react';
import { reportError } from '../monitoring';
import { tNow } from '../i18n';

// Last line of defence: if rendering crashes, show a friendly page with a reload button instead of a blank screen.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Visible in the browser console, and sent to Sentry when error reporting is on (see monitoring.js).
    console.error('Prologue crashed:', error, info?.componentStack);
    reportError(error, { componentStack: info?.componentStack });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm text-center bg-white border border-teal-100 rounded-3xl p-8 shadow-sm">
          <h1 className="font-black text-xl text-slate-900">{tNow('crash.title')}</h1>
          <p className="text-sm text-slate-500 mt-2 mb-5">
            {tNow('crash.text')}
          </p>
          <button type="button" onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold">
            {tNow('crash.reload')}
          </button>
        </div>
      </div>
    );
  }
}
