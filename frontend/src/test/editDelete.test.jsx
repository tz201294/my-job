import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { click, login, loginAndWaitForFeed, renderApp, sidebar, type } from './utils';

describe('editing and deleting your own content', () => {
  it('posts: only your own, edited in the publishing form, deleted with confirmation', async () => {
    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    const edits = screen.getAllByRole('button', { name: 'Edit post' });
    expect(edits.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Delete post' }).length).toBe(edits.length);

    await click(edits[0]);
    expect(screen.getByRole('heading', { name: 'Edit post' })).toBeTruthy();
    const titleInput = screen.getAllByRole('textbox').find((i) => i.value && i.value.length > 10);
    const oldTitle = titleInput.value;
    await type(titleInput, 'Edited by the test');
    await click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Edit post' })).toBeNull());
    expect(screen.getAllByText('Edited by the test').length).toBeGreaterThan(0);
    expect(screen.queryByText(oldTitle)).toBeNull();

    const before = screen.getAllByRole('button', { name: 'Delete post' }).length;
    await click(screen.getAllByRole('button', { name: 'Delete post' })[0]);
    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Delete post' }).length).toBe(before - 1));
    expect(screen.queryByText('Edited by the test')).toBeNull();
    expect(screen.getByText('Post deleted')).toBeTruthy();
  });

  it('questions: the asker edits until answered; the person asked can only delete', async () => {
    renderApp('/qa');
    await login('sarah_plumber');
    await screen.findByLabelText('Your question');
    await type(screen.getByLabelText('Your question'), 'Test question?');
    const asks = screen.getByLabelText('Professional to ask');
    const elena = within(asks).getAllByRole('option').find((o) => /Elena/.test(o.textContent));
    await type(asks, elena.value);
    await click(screen.getByRole('button', { name: /Ask Pro/ }));
    await screen.findByText('"Test question?"');

    await click(screen.getAllByRole('button', { name: 'Edit question' })[0]);
    await type(screen.getByLabelText('Edit your question'), 'Reworded test question?');
    await click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('"Reworded test question?"');
    await click(screen.getAllByRole('button', { name: 'Delete question' })[0]);
    await waitFor(() => expect(screen.queryByText('"Reworded test question?"')).toBeNull());

    await click(screen.getByRole('tab', { name: /Waiting for my answer/ }));
    await screen.findByText(/master plumber licence/);
    expect(screen.getAllByRole('button', { name: 'Delete question' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Edit question' })).toBeNull();
  });

  it('challenges and ideas: owner edits/deletes, authors edit their ideas', async () => {
    renderApp('/live-work/chal_01');
    await login('sarah_plumber');
    await click(await screen.findByRole('button', { name: 'Edit challenge' }));
    await type(screen.getByLabelText('Title'), 'Edited challenge title');
    await click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getAllByText('Edited challenge title').length).toBeGreaterThan(0));

    // As owner she can delete the accepted idea, which reopens the challenge
    expect(screen.getAllByText('Solved').length).toBeGreaterThan(0);
    const ideaDeletes = screen.getAllByRole('button', { name: 'Delete idea' });
    expect(screen.queryAllByRole('button', { name: 'Edit idea' }).length).toBe(0);
    await click(ideaDeletes[0]);
    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Delete idea' }).length).toBe(ideaDeletes.length - 1));

    await type(screen.getByPlaceholderText(/Describe your hypothesis/), 'My own idea');
    await click(screen.getByRole('button', { name: /Submit Idea/ }));
    await screen.findByText('My own idea');
    await click(screen.getByRole('button', { name: 'Edit idea' }));
    await type(screen.getByLabelText('Your idea'), 'My better idea');
    await click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('My better idea');

    await click(screen.getByRole('button', { name: 'Delete challenge' }));
    await waitFor(() => expect(screen.queryAllByText('Edited challenge title').length).toBe(0));
    expect(within(sidebar()).getByRole('button', { name: 'Live Work' }).getAttribute('aria-current')).toBe('page');
  });
});

describe('post tags', () => {
  it('adds, removes and validates tags in the post form', async () => {
    const { fireEvent, act } = await import('@testing-library/react');
    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    await click(screen.getAllByRole('button', { name: 'Edit post' })[0]);
    const box = screen.getByLabelText('Tags (optional)');
    // Existing tags are shown as chips
    const existing = screen.getAllByRole('button', { name: /^Remove tag / });
    expect(existing.length).toBeGreaterThan(0);

    // Typing + Enter adds a normalized tag
    await type(box, '#Night-Shift');
    await act(async () => { fireEvent.keyDown(box, { key: 'Enter' }); });
    expect(screen.getByRole('button', { name: 'Remove tag night-shift' })).toBeTruthy();
    // Invalid tag shows a message and isn't added
    await type(box, 'two words');
    await act(async () => { fireEvent.keyDown(box, { key: 'Enter' }); });
    expect(screen.getByText(/can't be a tag/)).toBeTruthy();
    await type(box, '');
    // Remove one of the old tags
    const removed = existing[0].getAttribute('aria-label').replace('Remove tag ', '');
    await click(existing[0]);
    expect(screen.queryByRole('button', { name: `Remove tag ${removed}` })).toBeNull();
    // A tag typed but not confirmed still counts on save
    await type(box, 'pending-one');
    await click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Edit post' })).toBeNull());
    expect(screen.getAllByText('#night-shift').length).toBeGreaterThan(0);
    expect(screen.getAllByText('#pending-one').length).toBeGreaterThan(0);
    expect(screen.queryAllByText(`#${removed}`).length).toBe(0);
  });
});
