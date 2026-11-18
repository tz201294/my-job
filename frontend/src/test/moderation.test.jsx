import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { click, currentPath, loginAndWaitForFeed, renderApp, sidebar, type } from './utils';
import { api } from '../api/client';
import { parseRoute } from '../routes';

afterEach(() => vi.restoreAllMocks());

describe('reporting', () => {
  it("offers Report on other people's posts (not your own) and sends it", async () => {
    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    const buttons = screen.getAllByRole('button', { name: 'Report post' });
    expect(buttons.length).toBeGreaterThan(0);

    await click(buttons[0]);
    const dialog = screen.getByRole('dialog', { name: 'Report post' });
    await click(within(dialog).getByRole('button', { name: 'Send report' }));
    expect(within(dialog).getByRole('alert').textContent).toMatch('choose a reason');

    await click(within(dialog).getByLabelText('Spam or advertising'));
    await type(within(dialog).getByLabelText(/Anything to add/), 'Selling things');
    await click(within(dialog).getByRole('button', { name: 'Send report' }));
    expect((await within(dialog).findByRole('status')).textContent).toMatch('Thanks for letting us know');
    await click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('blocking', () => {
  it('blocks from the profile, hides their posts, and unblocks from Settings', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderApp('/u/alex_driver');
    await loginAndWaitForFeed('sarah_plumber').catch(() => {});
    await click(await screen.findByRole('button', { name: 'Block' }));
    expect((await screen.findByText(/You blocked @alex_driver/))).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unblock' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Follow/ })).toBeNull();

    const feed = await api.getPosts({ limit: 100 });
    expect(feed.some((p) => (p.authorUsername || p.author_username) === 'alex_driver')).toBe(false);

    await click(within(sidebar()).getByRole('button', { name: 'Settings' }));
    const card = (await screen.findByRole('heading', { name: 'Blocked accounts' })).closest('section');
    await within(card).findByText('@alex_driver');
    await click(within(card).getByRole('button', { name: 'Unblock' }));
    await waitFor(() => expect(within(card).queryByText('@alex_driver')).toBeNull());
    const after = await api.getPosts({ limit: 100 });
    expect(after.some((p) => (p.authorUsername || p.author_username) === 'alex_driver')).toBe(true);
  });
});

describe('moderation page', () => {
  it('is only for moderators', async () => {
    expect(parseRoute('/moderation')).toEqual({ page: 'moderation' });
    renderApp('/moderation');
    await loginAndWaitForFeed('sarah_plumber').catch(() => {});
    await screen.findByText('Page not found');
    expect(within(sidebar()).queryByRole('button', { name: 'Moderation' })).toBeNull();
    expect(currentPath()).toBe('/moderation');
  });
});
