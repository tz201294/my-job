import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { click, loginAndWaitForFeed, renderApp, sidebar, type } from './utils';

describe('interests are professions', () => {
  it('are chosen in Settings by searching or browsing, and saved', async () => {
    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    await click(within(sidebar()).getByRole('button', { name: 'Settings' }));
    await click(await screen.findByRole('button', { name: 'Edit' }));

    // Her current ones are on top, each removable
    const chosen = screen.getByRole('list', { name: 'Chosen professions' });
    expect(within(chosen).getByRole('button', { name: 'Remove Plumber' })).toBeTruthy();
    for (const b of within(chosen).getAllByRole('button')) await click(b);
    expect(screen.queryByRole('list', { name: 'Chosen professions' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save profile' }).disabled).toBe(true); // at least one

    // Search narrows the list; picking adds it to the top
    await type(screen.getByLabelText('Search professions'), 'nur');
    expect(screen.queryByRole('button', { name: 'Electrician' })).toBeNull();
    await click(screen.getByRole('button', { name: 'Nurse' }));
    expect(screen.getByRole('button', { name: 'Nurse' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('1 of 20 chosen')).toBeTruthy();

    await click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save profile' })).toBeNull());
    const row = screen.getByText('Interests').parentElement;
    expect(row.textContent).toMatch('Nurse');
  });
});
