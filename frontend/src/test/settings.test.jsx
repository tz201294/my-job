import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { click, currentPath, login, renderApp, sidebar, type } from './utils';

describe('settings', () => {
  it('edits profile, consent, password, and deletes the account', async () => {
    renderApp('/');
    await login('sarah_plumber', 'demo1234');
    await screen.findAllByRole('button', { name: /^Comments \(/ });

    await click(within(sidebar()).getByRole('button', { name: 'Settings' }));
    await screen.findByRole('heading', { name: 'Settings' });

    // Edit profile
    await click(await screen.findByRole('button', { name: /^Edit$/ }));
    await type(screen.getByLabelText('Name'), 'Sarah J. Jenkins');
    await type(screen.getByLabelText('Bio'), 'Pipes, valves and the occasional miracle.');
    expect(screen.queryByText(/removes your verified badge/)).toBeNull();
    await type(screen.getByLabelText('Job title'), 'Pipefitter');
    expect(screen.getByText(/removes your verified badge/)).toBeTruthy();
    await type(screen.getByLabelText('Job title'), 'Master Plumber'); // back: no warning
    expect(screen.queryByText(/removes your verified badge/)).toBeNull();
    await click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save profile' })).toBeNull());
    expect(screen.getAllByText('Sarah J. Jenkins').length).toBeGreaterThan(0);
    expect(screen.getByText('Pipes, valves and the occasional miracle.')).toBeTruthy();

    // Her posts in the feed show the new name
    await click(within(sidebar()).getByRole('button', { name: 'Home' }));
    await waitFor(() => expect(screen.getAllByText('Sarah J. Jenkins').length).toBeGreaterThan(0));
    await click(within(sidebar()).getByRole('button', { name: 'Settings' }));
    await screen.findByRole('heading', { name: 'Settings' });

    // Consent switch
    const sw = screen.getByRole('switch', { name: /Share my anonymous survey answers/ });
    expect(sw.getAttribute('aria-checked')).toBe('true');
    await click(sw);
    await waitFor(() => expect(screen.getByRole('switch', { name: /Share my anonymous/ }).getAttribute('aria-checked')).toBe('false'));

    // Password: wrong current password shows the server message; then a real change
    await type(screen.getByLabelText('Current password'), 'wrong-one');
    await type(screen.getByLabelText('New password'), 'newpass123');
    await type(screen.getByLabelText('Repeat new password'), 'newpass123');
    await click(screen.getByRole('button', { name: 'Change password' }));
    await screen.findByText('Current password is incorrect');
    await type(screen.getByLabelText('Current password'), 'demo1234');
    await type(screen.getByLabelText('New password'), 'newpass123');
    await type(screen.getByLabelText('Repeat new password'), 'newpass123');
    await click(screen.getByRole('button', { name: 'Change password' }));
    await within(screen.getByLabelText('Current password').closest('form')).findByText('Saved');

    // Log out, old password fails, new one works
    await click(within(sidebar()).getByRole('button', { name: 'Log out' }));
    await login('sarah_plumber', 'demo1234');
    await screen.findByText('Invalid username or password');
    await login('sarah_plumber', 'newpass123');
    await screen.findAllByRole('button', { name: /^Comments \(/ });

    // Delete the account: needs the username typed and the password
    await click(within(sidebar()).getByRole('button', { name: 'Settings' }));
    await click(await screen.findByRole('button', { name: 'Delete my account…' }));
    const del = screen.getByRole('button', { name: 'Delete my account permanently' });
    expect(del.disabled).toBe(true);
    await type(screen.getByLabelText(/Type your username/), 'sarah_plumber');
    await type(screen.getByLabelText('Password'), 'newpass123');
    expect(del.disabled).toBe(false);
    await click(del);
    await screen.findByLabelText(/username or email/i);
    expect(screen.getByText('Your account was deleted.')).toBeTruthy();
    expect(currentPath()).toBe('/');
    await login('sarah_plumber', 'newpass123');
    await screen.findByText('Invalid username or password');
  }, 40000);
});
