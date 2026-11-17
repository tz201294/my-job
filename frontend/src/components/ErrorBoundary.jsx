import React from 'react';

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
    // Visible in the browser console; a real error-reporting service can be plugged in here later.
    console.error('Prologue crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm text-center bg-white border border-teal-100 rounded-3xl p-8 shadow-sm">
          <h1 className="font-black text-xl text-slate-900">Something went wrong</h1>
          <p className="text-sm text-slate-500 mt-2 mb-5">
            Sorry, this page hit an unexpected problem. Reloading usually fixes it.
          </p>
          <button type="button" onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold">
            Reload Prologue
          </button>
        </div>
      </div>
    );
  }
}
