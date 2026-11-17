import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Content Security Policy for production builds only (the dev server needs inline scripts for hot reload).
// Images and video may come from any https host because posts link to media on other sites; API calls may go
// to VITE_API_URL's origin, or to a backend on :8000 of the same machine (docker compose).
function contentSecurityPolicy(apiUrl) {
  let apiOrigin = '';
  try {
    apiOrigin = apiUrl ? new URL(apiUrl).origin : '';
  } catch {
    apiOrigin = '';
  }
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    `connect-src 'self' https: http://localhost:8000 http://127.0.0.1:8000${apiOrigin ? ` ${apiOrigin}` : ''}`,
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return {
    name: 'myjob-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    // Where the app is served from. '/' by default; the GitHub Pages build sets VITE_BASE=/my-job/.
    base: process.env.VITE_BASE || '/',
    plugins: [react(), contentSecurityPolicy(process.env.VITE_API_URL || env.VITE_API_URL)],
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        }
      }
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      include: ['src/**/*.test.{js,jsx}'],
      // Tests run the app in demo mode (no backend needed).
      env: { VITE_DEMO_MODE: 'true' },
      testTimeout: 30000,
    },
  };
})
