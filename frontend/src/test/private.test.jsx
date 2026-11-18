import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserProfile from '../components/UserProfile';
import { toProfileUser } from '../api/mappers';
import { I18nProvider } from '../i18n';
import { click, login, renderApp, sidebar } from './utils';

const raw = (extra) => ({
  id: 'u1', username: 'quiet_welder', full_name: 'Quiet Welder', followers_count: 3, following_count: 1, posts_count: 2,
  is_following: false, is_private: true, follow_requested: false, ...extra,
});
const posts = [{ id: 'p1', type: 'milestone', title: 'First weld', caption: 'x', imageUrl: '', createdAt: new Date().toISOString(), likes: 0, comments: 0 }];

function show(user, props = {}) {
  return render(
    <I18nProvider initial="en">
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserProfile user={toProfileUser(user)} posts={posts} qaItems={[]} onToggleFollow={vi.fn()} {...props} />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe('private accounts', () => {
  it('a private account shows a lock instead of posts until you follow it', async () => {
    const { unmount } = show(raw());
    expect(screen.getByRole('button', { name: /^Follow$/ })).toBeTruthy();
    expect(screen.getByText('This account is private')).toBeTruthy();
    expect(screen.queryByText('First weld')).toBeNull();
    unmount();

    show(raw({ follow_requested: true }));
    expect(screen.getByRole('button', { name: /Requested/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/waiting for approval/)).toBeTruthy();
  });

  it('a follower, or the owner, sees the posts', () => {
    const { unmount } = show(raw({ is_following: true }));
    expect(screen.queryByText('This account is private')).toBeNull();
    unmount();
    show(raw(), { isOwnProfile: true });
    expect(screen.queryByText('This account is private')).toBeNull();
  });

  it('accounts are public by default and can be switched to private in Settings', async () => {
    renderApp('/');
    await login('sarah_plumber', 'demo1234');
    await screen.findAllByRole('button', { name: /^Comments \(/ });
    await click(within(sidebar()).getByRole('button', { name: 'Settings' }));
    const sw = await screen.findByRole('switch', { name: 'Private account' });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText(/Anyone can see your posts/)).toBeTruthy();
    await click(sw);
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Private account' }).getAttribute('aria-checked')).toBe('true'));
    expect(screen.getByText(/Only followers you approve/)).toBeTruthy();
  });
});
