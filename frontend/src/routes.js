// Page addresses. The URL decides which page is shown; these helpers build and read it.
//
//   /                     Home ("For you")        /following, /saved   other feed filters
//   /live-work            Live Work               /live-work/<id>      a specific challenge
//   /qa                   Q&A                      /qa/inbox            questions waiting for my answer
//   /reels  /activity  /notifications  /settings
//   /u/<username>         a profile                /p/<postId>          a single post with its comments

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
  profile: (username) => `/u/${enc(username)}`,
  post: (id) => `/p/${enc(id)}`,
};

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
  if (!b && ['reels', 'activity', 'notifications', 'settings'].includes(a)) return { page: a };
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
  if (['challenges', 'qa', 'reels', 'activity', 'notifications', 'settings'].includes(route.page)) return route.page;
  return null;
}

// Browser tab title for a route (profile/post titles are filled in once loaded).
export function titleForRoute(route, extra) {
  const base = 'MyJob';
  const names = {
    challenges: 'Live Work', qa: route.qaView === 'inbox' ? 'Waiting for my answer' : 'Q&A', reels: 'Reels',
    activity: 'My activity', notifications: 'Notifications', settings: 'Settings', notFound: 'Page not found',
  };
  if (route.page === 'feed') {
    return route.feedView === 'all' ? `${base} — Discover How the World Works`
      : `${route.feedView === 'saved' ? 'Saved' : 'Following'} · ${base}`;
  }
  if ((route.page === 'profile' || route.page === 'post') && extra) return `${extra} · ${base}`;
  return names[route.page] ? `${names[route.page]} · ${base}` : base;
}
