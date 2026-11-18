// Page addresses. The URL decides which page is shown; these helpers build and read it.
//
//   /                     Home ("For you")        /following, /saved   other feed filters
//   /live-work            Live Work               /live-work/<id>      a specific challenge
//   /qa                   Q&A                      /qa/inbox            questions waiting for my answer
//   /reels  /activity  /notifications  /settings  /moderation (moderators only)
//   /u/<username>         a profile                /p/<postId>          a single post with its comments
//   /reset-password#token=…  /verify-email#token=…   links from emails (work logged in or out)
//   /privacy  /terms         the Privacy Policy and Terms of Service (work logged in or out)

import { tNow } from './i18n';

const enc = encodeURIComponent;

export const paths = {
  home: '/',
  following: '/following',
  saved: '/saved',
  liveWork: '/live-work',
  challenge: (id) => `/live-work/${enc(id)}`,
  qa: '/qa',
  qaInbox: '/qa/inbox',
  reels: '/reels',
  activity: '/activity',
  notifications: '/notifications',
  settings: '/settings',
  moderation: '/moderation',
  profile: (username) => `/u/${enc(username)}`,
  post: (id) => `/p/${enc(id)}`,
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  privacy: '/privacy',
  terms: '/terms',
};

// Pages shown on their own, whether or not someone is logged in: links from emails, and the legal pages.
export const STANDALONE_PAGES = ['resetPassword', 'verifyEmail', 'privacy', 'terms'];

// The menus' item keys -> addresses ('profile' needs the signed-in username).
export function pathForMenuKey(key, myUsername) {
  switch (key) {
    case 'feed': return paths.home;
    case 'saved': return paths.saved;
    case 'challenges': return paths.liveWork;
    case 'qa': return paths.qa;
    case 'reels': return paths.reels;
    case 'activity': return paths.activity;
    case 'notifications': return paths.notifications;
    case 'settings': return paths.settings;
    case 'moderation': return paths.moderation;
    case 'profile': return paths.profile(myUsername);
    default: return paths.home;
  }
}

const dec = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
};

/**
 * Reads a pathname (without the deploy base) into what to show:
 * { page: 'feed', feedView } | { page: 'challenges', challengeId } | { page: 'qa', qaView }
 * | { page: 'profile', username } | { page: 'post', postId } | { page: 'reels'|'activity'|'notifications'|'settings' }
 * | { page: 'notFound' }
 */
export function parseRoute(pathname) {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const [a, b, ...rest] = parts;
  if (rest.length) return { page: 'notFound' };
  if (!a) return { page: 'feed', feedView: 'all' };
  if (!b && (a === 'following' || a === 'saved')) return { page: 'feed', feedView: a };
  if (a === 'live-work') {
    if (!b) return { page: 'challenges', challengeId: null };
    const id = dec(b);
    return id ? { page: 'challenges', challengeId: id } : { page: 'notFound' };
  }
  if (a === 'qa' && (!b || b === 'inbox')) return { page: 'qa', qaView: b ? 'inbox' : 'all' };
  if (!b && ['reels', 'activity', 'notifications', 'settings', 'moderation'].includes(a)) return { page: a };
  if (!b && a === 'reset-password') return { page: 'resetPassword' };
  if (!b && a === 'verify-email') return { page: 'verifyEmail' };
  if (!b && (a === 'privacy' || a === 'terms')) return { page: a };
  if ((a === 'u' || a === 'p') && b) {
    const v = dec(b);
    if (!v) return { page: 'notFound' };
    return a === 'u' ? { page: 'profile', username: v.toLowerCase() } : { page: 'post', postId: v };
  }
  return { page: 'notFound' };
}

// What the menus highlight for a route.
export function menuKeyForRoute(route, myUsername) {
  if (route.page === 'feed') return route.feedView === 'saved' ? 'saved' : 'feed';
  if (route.page === 'profile') return route.username === myUsername ? 'profile' : null;
  if (['challenges', 'qa', 'reels', 'activity', 'notifications', 'settings', 'moderation'].includes(route.page)) return route.page;
  return null;
}

// Browser tab title for a route (profile/post titles are filled in once loaded).
export function titleForRoute(route, extra) {
  const base = 'Prologue';
  const names = {
    challenges: 'nav.liveWork', qa: route.qaView === 'inbox' ? 'qa.inboxTitle' : 'nav.qa', reels: 'nav.reels',
    activity: 'nav.activity', notifications: 'nav.notifications', settings: 'nav.settings', notFound: 'notFound.title',
    resetPassword: 'reset.title', verifyEmail: 'verify.title', moderation: 'nav.moderation',
    privacy: 'legal.privacy', terms: 'legal.terms',
  };
  if (route.page === 'feed') {
    return route.feedView === 'all' ? `${base} — ${tNow('brand.tagline')}`
      : `${tNow(route.feedView === 'saved' ? 'feed.saved' : 'feed.following')} · ${base}`;
  }
  if ((route.page === 'profile' || route.page === 'post') && extra) return `${extra} · ${base}`;
  return names[route.page] ? `${tNow(names[route.page])} · ${base}` : base;
}
