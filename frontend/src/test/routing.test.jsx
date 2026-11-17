import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import {
  click, currentPath, login, loginAndWaitForFeed, renderApp, sidebar,
} from './utils';

describe('page addresses', () => {
  it('a link opened while signed out lands on that page after logging in', async () => {
    renderApp('/u/elena_lawyer');
    await login('sarah_plumber');
    await screen.findByText(/Commercial Litigation Partner @ Vance/);
    expect(currentPath()).toBe('/u/elena_lawyer');
    await waitFor(() => expect(document.title).toBe('Elena Vance, Esq. (@elena_lawyer) · MyJob'));
  });

  it('a post address shows that post with its comments', async () => {
    renderApp('/p/post_503');
    await login('sarah_plumber');
    const comments = await screen.findByRole('region', { name: 'Comments' });
    await within(comments).findByText(/Saving this for my Civil Procedure exam/);
    await waitFor(() => expect(document.title).toMatch(/^Mastering the Subpoena Duces Tecum/));
    // Opened directly, so "Back" goes home
    await click(screen.getByRole('button', { name: 'Back' }));
    expect(currentPath()).toBe('/');
  });

  it('unknown posts, profiles and addresses get a clear page', async () => {
    renderApp('/p/nope');
    await login('sarah_plumber');
    await screen.findByRole('heading', { name: 'Post not found' });
    await click(within(sidebar()).getByRole('button', { name: 'Home' }));
    await screen.findAllByRole('button', { name: /^Comments \(/ });
  });

  it('shows "Profile not found" for a missing user', async () => {
    renderApp('/u/ghost');
    await login('sarah_plumber');
    await screen.findByRole('heading', { name: 'Profile not found' });
    expect(screen.getByText(/no one called @ghost/)).toBeTruthy();
  });

  it('shows "Page not found" for a made-up address, with a way home', async () => {
    renderApp('/this/does/not/exist');
    await login('sarah_plumber');
    await screen.findByRole('heading', { name: 'Page not found' });
    expect(document.title).toBe('Page not found · MyJob');
    await click(screen.getByRole('link', { name: 'Go to the home page' }));
    expect(currentPath()).toBe('/');
  });

  it('the selected challenge and the Q&A inbox are part of the address', async () => {
    renderApp('/live-work/chal_02');
    await login('sarah_plumber');
    await screen.findByRole('heading', { level: 3, name: /Jurisdictional Conflict/ });
    await click(screen.getAllByText(/Water Hammer Knocking/i)[0]);
    expect(currentPath()).toBe('/live-work/chal_01');
    await screen.findByRole('heading', { level: 3, name: /Water Hammer Knocking/i });

    await click(within(sidebar()).getByRole('button', { name: 'Q&A' }));
    expect(currentPath()).toBe('/qa');
    await click(screen.getByRole('tab', { name: /Waiting for my answer/ }));
    expect(currentPath()).toBe('/qa/inbox');
    await screen.findByText(/master plumber licence/);
  });

  it('opening a profile from a post and going back returns to the feed', async () => {
    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    await click(screen.getAllByText('Elena Vance, Esq.')[0]);
    expect(currentPath()).toBe('/u/elena_lawyer');
    await screen.findByText(/Commercial Litigation Partner @ Vance/);
    await click(screen.getAllByRole('button').find((b) => /back/i.test(b.textContent) || b.getAttribute('aria-label') === 'Back'));
    expect(currentPath()).toBe('/');
  });

  it('logging out from any page returns to the home address', async () => {
    renderApp('/settings');
    await login('sarah_plumber');
    await screen.findByRole('heading', { name: 'Settings' });
    await click(within(sidebar()).getByRole('button', { name: 'Log out' }));
    await screen.findByLabelText(/username or email/i);
    expect(currentPath()).toBe('/');
  });
});
