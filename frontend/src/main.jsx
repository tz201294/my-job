import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { fallbackRedirect, restoredPath } from './spaFallback';
import { startErrorReporting } from './monitoring';
import { IS_DEMO } from './api/client';
import { I18nProvider } from './i18n';
// The font is served from this site (not Google Fonts), so visitors' addresses aren't sent to Google.
import '@fontsource-variable/plus-jakarta-sans';
import './index.css';

// Vite's base ('/' normally, '/my-job/' or '/my-job/demo/' on GitHub Pages) is where the app lives; routes are
// relative to it.
const base = import.meta.env.BASE_URL;
const basename = base.replace(/\/+$/, '') || '/';

const redirect = fallbackRedirect({
  pathname: window.location.pathname, base, demoPath: import.meta.env.VITE_DEMO_PATH,
});

if (redirect) {
  // A direct link into the demo reached the main app (see spaFallback.js): hand it to the demo.
  window.location.replace(redirect);
} else {
  startErrorReporting(IS_DEMO);

  const restored = restoredPath({ search: window.location.search, base });
  if (restored) window.history.replaceState(null, '', restored);

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <I18nProvider>
        <ErrorBoundary>
          <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </I18nProvider>
    </React.StrictMode>
  );
}
