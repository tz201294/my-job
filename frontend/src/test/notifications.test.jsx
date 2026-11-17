import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { bell, click, currentPath, loginAndWaitForFeed, renderApp, sidebar } from './utils';

describe('notifications and comment reactions', () => {
  it('reacting notifies the commenter, who can open it from the bell', async () => {
    renderApp('/');

    // Elena reacts to Sarah's comment on Elena's case study
    await loginAndWaitForFeed('elena_lawyer');
    const toggle = screen.getAllByRole('button', { name: /^Comments \(/ })
      .find((b) => b.closest('div.card-glow')?.textContent.includes('Subpoena'));
    await click(toggle);
    const section = await screen.findByRole('region', { name: 'Comments' });
    await within(section).findByText(/Never knew how much prep/);
    expect(within(section).getByRole('button', { name: /^❤️ 1/ })).toBeTruthy(); // sample reaction
    const sarahsComment = within(section).getByText(/Never knew how much prep/).closest('li');
    await click(within(sarahsComment).getByRole('button', { name: 'React to this comment' }));
    await click(within(sarahsComment).getByRole('menuitemradio', { name: 'React with 😂' }));
    const chip = await within(sarahsComment).findByRole('button', { name: '😂 1, your reaction' });
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    await waitFor(() => expect(bell().getAttribute('aria-label')).toMatch(/unread/));
    await click(within(sidebar()).getByRole('button', { name: 'Log out' }));

    // Sarah: badge, list with the new reaction, all marked read
    await loginAndWaitForFeed('sarah_plumber');
    await waitFor(() => expect(bell().getAttribute('aria-label')).toMatch(/^Notifications, \d+ unread$/));
    expect(within(sidebar()).getByLabelText(/\d+ unread/)).toBeTruthy();
    await click(bell());
    const row = (await screen.findByText(/reacted to your comment/)).closest('button');
    expect(within(row).getByText(/Elena Vance/)).toBeTruthy();
    expect(within(row).getByText(/😂 Never knew how much prep/)).toBeTruthy();
    expect(screen.getAllByText(/started following you/).length).toBeGreaterThan(0);
    await waitFor(() => expect(bell().getAttribute('aria-label')).toBe('Notifications'));

    // Opening it goes to the post's page with comments, where the reaction shows
    await click(row);
    expect(currentPath()).toBe('/p/post_503');
    const comments = await screen.findByRole('region', { name: 'Comments' });
    const mine = (await within(comments).findByText(/Never knew how much prep/)).closest('li');
    expect(within(mine).getByRole('button', { name: '😂 1' })).toBeTruthy();
    // React, then the same emoji again removes it
    const sams = within(comments).getByText(/Saving this for my Civil Procedure/).closest('li');
    await click(within(sams).getByRole('button', { name: 'React to this comment' }));
    await click(within(sams).getByRole('menuitemradio', { name: 'React with 👍' }));
    await within(sams).findByRole('button', { name: '👍 1, your reaction' });
    await click(within(sams).getByRole('button', { name: '👍 1, your reaction' }));
    await waitFor(() => expect(within(sams).queryByRole('button', { name: /^👍/ })).toBeNull());
    // Back returns to the notifications
    await click(screen.getByRole('button', { name: 'Back' }));
    expect(currentPath()).toBe('/notifications');

    // A follow notification opens that person's profile; a question opens the inbox
    await click((await screen.findAllByText(/started following you/))[0].closest('button'));
    expect(currentPath()).toMatch(/^\/u\//);
    await click(bell());
    await click((await screen.findAllByText(/asked you a question/))[0].closest('button'));
    expect(currentPath()).toBe('/qa/inbox');
    expect((await screen.findByRole('tab', { name: /Waiting for my answer/ })).getAttribute('aria-selected')).toBe('true');
  });
});
