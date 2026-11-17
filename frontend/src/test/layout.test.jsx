import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import {
  bell, bottomBar, click, currentPath, header, login, loginAndWaitForFeed, renderApp, sidebar, type,
} from './utils';

describe('layout and navigation', () => {
  it('menus, bottom bar, pages and their addresses', async () => {
    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    expect(screen.queryByText('AMAs')).toBeNull(); // the old in-page tab bar is gone
    expect(within(sidebar()).getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBe('page');
    expect(document.title).toBe('MyJob — Discover How the World Works');

    // Phone menu drawer -> My activity
    await click(screen.getByRole('button', { name: 'Open menu' }));
    const drawer = screen.getByRole('dialog', { name: 'Menu' });
    await click(within(drawer).getByRole('button', { name: 'My activity' }));
    expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull();
    expect(currentPath()).toBe('/activity');
    await screen.findByRole('heading', { name: 'My activity' });
    await screen.findByText('1 question is waiting for your answer');
    expect(document.title).toBe('My activity · MyJob');

    // Banner -> Q&A inbox
    await click(screen.getByText('1 question is waiting for your answer'));
    expect(currentPath()).toBe('/qa/inbox');
    const inboxTab = await screen.findByRole('tab', { name: /Waiting for my answer/ });
    expect(inboxTab.getAttribute('aria-selected')).toBe('true');
    expect(within(bottomBar()).getByRole('button', { name: 'Q&A' }).getAttribute('aria-current')).toBe('page');

    // Activity -> a specific challenge
    await click(within(sidebar()).getByRole('button', { name: 'My activity' }));
    await click(await screen.findByText(/Water Hammer Knocking/i));
    expect(currentPath()).toBe('/live-work/chal_01');
    await screen.findByText('Live Work Hub');

    // Settings, notifications
    await click(within(sidebar()).getByRole('button', { name: 'Settings' }));
    expect(currentPath()).toBe('/settings');
    expect(await screen.findByText('@sarah_plumber')).toBeTruthy();
    await click(bell());
    expect(currentPath()).toBe('/notifications');
    await screen.findByRole('heading', { name: 'Notifications' });

    // Saved -> feed with the Saved filter; Home goes back to "For you"
    await click(within(sidebar()).getByRole('button', { name: 'Saved' }));
    expect(currentPath()).toBe('/saved');
    expect((await screen.findByRole('tab', { name: 'Saved' })).getAttribute('aria-selected')).toBe('true');
    await click(within(bottomBar()).getByRole('button', { name: 'Home' }));
    expect(currentPath()).toBe('/');
    expect(screen.getByRole('tab', { name: 'For you' }).getAttribute('aria-selected')).toBe('true');

    // Phone search from another page shows the filtered feed
    await click(within(bottomBar()).getByRole('button', { name: 'Live Work' }));
    await screen.findByText('Live Work Hub');
    await click(within(header()).getByRole('button', { name: 'Search' }));
    const boxes = screen.getAllByRole('searchbox', { name: /Search posts/ });
    expect(boxes.length).toBe(2);
    await type(boxes[1], 'subpoena');
    expect(currentPath()).toBe('/');
    expect(screen.getAllByText(/Subpoena Duces Tecum/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Brass Valve/i)).toBeNull();
    await type(boxes[1], '');

    // Profile from the bottom bar
    await click(within(bottomBar()).getByRole('button', { name: 'Profile' }));
    expect(currentPath()).toBe('/u/sarah_plumber');
    await waitFor(() => expect(within(bottomBar()).getByRole('button', { name: 'Profile' }).getAttribute('aria-current')).toBe('page'));

    // Reset demo data: delete a post, reset, log back in, the post is back
    await click(within(bottomBar()).getByRole('button', { name: 'Home' }));
    const before = screen.getAllByRole('button', { name: /^Comments \(/ }).length;
    await click(screen.getAllByRole('button', { name: 'Delete post' })[0]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Comments \(/ }).length).toBe(before - 1));
    await click(within(sidebar()).getByRole('button', { name: 'Settings' }));
    await click(await screen.findByRole('button', { name: 'Reset demo data' }));
    await screen.findByLabelText(/username or email/i);
    expect(currentPath()).toBe('/');
    await loginAndWaitForFeed('sarah_plumber');
    expect(screen.getAllByRole('button', { name: /^Comments \(/ }).length).toBe(before);
  });

  it('a stale page does not survive signing out', async () => {
    renderApp('/settings');
    await login('sarah_plumber');
    await screen.findByRole('heading', { name: 'Settings' });
    await click(within(sidebar()).getByRole('button', { name: 'Log out' }));
    await login('elena_lawyer');
    await screen.findAllByRole('button', { name: /^Comments \(/ });
    expect(currentPath()).toBe('/');
  });
});
