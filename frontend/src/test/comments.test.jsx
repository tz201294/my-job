import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { click, renderApp, type } from './utils';

describe('comments in the demo app', () => {
  it('lists, adds, edits, deletes and moderates', async () => {
    renderApp('/');
    await type(await screen.findByLabelText(/username or email/i), 'sarah_plumber');
    await type(screen.getByLabelText(/^password/i), 'demo1234');
    await click(screen.getAllByRole('button', { name: /^log in$/i }).at(-1));

    // Elena's case study (post_503) has 2 sample comments
    const toggles = await screen.findAllByRole('button', { name: /^Comments \(/ });
    const elenaToggle = toggles.find((b) => b.getAttribute('aria-label') === 'Comments (2)');
    await click(elenaToggle);
    const section = await screen.findByRole('region', { name: 'Comments' });
    await within(section).findByText(/Saving this for my Civil Procedure exam/);
    // Sarah's own sample comment on Elena's post: she can edit and delete it
    expect(within(section).getAllByRole('button', { name: 'Edit comment' }).length).toBe(1);
    expect(within(section).getAllByRole('button', { name: 'Delete comment' }).length).toBe(1);

    // Add a comment: count goes to 3
    await type(within(section).getByLabelText('Add a comment'), 'Smoke comment');
    await click(within(section).getByRole('button', { name: 'Post comment' }));
    await within(section).findByText('Smoke comment');
    await screen.findByRole('button', { name: 'Comments (3)' });

    // Edit it
    const edits = within(section).getAllByRole('button', { name: 'Edit comment' });
    await click(edits.at(-1));
    await type(within(section).getByLabelText('Edit your comment'), 'Smoke comment, edited');
    await click(within(section).getByRole('button', { name: 'Save' }));
    await within(section).findByText('Smoke comment, edited');
    expect(within(section).getAllByText(/· edited/).length).toBe(1);

    // Delete it: count back to 2
    await click(within(section).getAllByRole('button', { name: 'Delete comment' }).at(-1));
    await waitFor(() => expect(within(section).queryByText('Smoke comment, edited')).toBeNull());
    await waitFor(() => expect(elenaToggle.getAttribute('aria-label')).toBe('Comments (2)'));
    await click(elenaToggle); // close it

    // On her own post she can delete others' comments but not edit them
    const ownToggle = screen.getAllByRole('button', { name: /^Comments \(/ })
      .find((b) => b.closest('div.card-glow')?.textContent.includes('Sarah Jenkins') && b.getAttribute('aria-expanded') === 'false');
    await click(ownToggle);
    const ownSection = await screen.findByRole('region', { name: 'Comments' });
    await within(ownSection).findByText(/I had exactly this leak/);
    expect(within(ownSection).queryAllByRole('button', { name: 'Edit comment' }).length).toBe(0);
    const before = within(ownSection).getAllByRole('button', { name: 'Delete comment' }).length;
    expect(before).toBe(2);
    await click(within(ownSection).getAllByRole('button', { name: 'Delete comment' })[0]);
    await waitFor(() => expect(within(ownSection).queryByText(/I had exactly this leak/)).toBeNull());
  }, 30000);
});
