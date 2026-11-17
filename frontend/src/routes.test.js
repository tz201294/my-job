import { describe, expect, it } from 'vitest';
import { menuKeyForRoute, parseRoute, pathForMenuKey, paths, titleForRoute } from './routes';

describe('parseRoute', () => {
  it.each([
    ['/', { page: 'feed', feedView: 'all' }],
    ['', { page: 'feed', feedView: 'all' }],
    ['/following', { page: 'feed', feedView: 'following' }],
    ['/saved/', { page: 'feed', feedView: 'saved' }],
    ['/live-work', { page: 'challenges', challengeId: null }],
    ['/live-work/chal_01', { page: 'challenges', challengeId: 'chal_01' }],
    ['/qa', { page: 'qa', qaView: 'all' }],
    ['/qa/inbox', { page: 'qa', qaView: 'inbox' }],
    ['/reels', { page: 'reels' }],
    ['/activity', { page: 'activity' }],
    ['/notifications', { page: 'notifications' }],
    ['/settings', { page: 'settings' }],
    ['/u/Sarah_Plumber', { page: 'profile', username: 'sarah_plumber' }],
    ['/p/post%20503', { page: 'post', postId: 'post 503' }],
  ])('%s', (path, expected) => {
    expect(parseRoute(path)).toEqual(expected);
  });

  it.each(['/nope', '/qa/other', '/u', '/u/a/b', '/settings/x', '/following/x', '/p/%E0%A4%A'])(
    'unknown address %s is not found', (path) => {
      expect(parseRoute(path)).toEqual({ page: 'notFound' });
    }
  );

  it('round-trips the path builders', () => {
    expect(parseRoute(paths.profile('elena_lawyer'))).toEqual({ page: 'profile', username: 'elena_lawyer' });
    expect(parseRoute(paths.post('a/b?c'))).toEqual({ page: 'post', postId: 'a/b?c' });
    expect(parseRoute(paths.challenge('x y'))).toEqual({ page: 'challenges', challengeId: 'x y' });
  });
});

describe('menus and titles', () => {
  it('maps menu keys to addresses', () => {
    expect(pathForMenuKey('feed')).toBe('/');
    expect(pathForMenuKey('saved')).toBe('/saved');
    expect(pathForMenuKey('challenges')).toBe('/live-work');
    expect(pathForMenuKey('profile', 'sam')).toBe('/u/sam');
  });

  it('highlights the right menu item', () => {
    expect(menuKeyForRoute(parseRoute('/saved'), 'me')).toBe('saved');
    expect(menuKeyForRoute(parseRoute('/following'), 'me')).toBe('feed');
    expect(menuKeyForRoute(parseRoute('/u/me'), 'me')).toBe('profile');
    expect(menuKeyForRoute(parseRoute('/u/someone'), 'me')).toBe(null);
    expect(menuKeyForRoute(parseRoute('/live-work/x'), 'me')).toBe('challenges');
  });

  it('titles pages', () => {
    expect(titleForRoute(parseRoute('/settings'))).toBe('Settings · Prologue');
    expect(titleForRoute(parseRoute('/qa/inbox'))).toBe('Waiting for my answer · Prologue');
    expect(titleForRoute(parseRoute('/u/sam'), 'Sam (@sam)')).toBe('Sam (@sam) · Prologue');
    expect(titleForRoute(parseRoute('/nope'))).toBe('Page not found · Prologue');
  });
});
