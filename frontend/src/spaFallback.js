// Direct links on GitHub Pages.
//
// Pages serves one 404.html (a copy of the main app) for every address it doesn't have a file for. That's fine
// for the main app's own addresses, but the demo lives in a sub-folder (/my-job/demo/), so a direct link like
// /my-job/demo/u/elena_lawyer would open the main app. The main app therefore sends such visitors to the demo's
// real index page with the wanted address in ?p=, and the demo puts the address back before it starts.

/**
 * Where the main app should send the visitor instead, or null to carry on.
 * base: this build's base path ("/my-job/"); demoPath: the demo's folder below it ("demo/"), if there is one.
 */
export function fallbackRedirect({ pathname, base, demoPath }) {
  if (!demoPath) return null;
  const demoBase = base + demoPath; // "/my-job/demo/"
  if (!pathname.startsWith(demoBase) || pathname === demoBase) return null;
  const inner = pathname.slice(demoBase.length - 1); // "/u/elena_lawyer"
  return `${demoBase}?p=${encodeURIComponent(inner)}`;
}

/** The address to restore from ?p= (an in-app path like "/u/sam"), or null. Only same-site paths are accepted. */
export function restoredPath({ search, base }) {
  const p = new URLSearchParams(search).get('p');
  if (!p || !p.startsWith('/') || p.startsWith('//') || p.includes('\\')) return null;
  return base.replace(/\/+$/, '') + p;
}
