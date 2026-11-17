import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { click, currentPath, loginAndWaitForFeed, renderApp, sidebar, type } from './utils';
import { parseRoute, titleForRoute } from '../routes';

describe('links from emails', () => {
  it('has addresses of their own', () => {
    expect(parseRoute('/reset-password')).toEqual({ page: 'resetPassword' });
    expect(parseRoute('/verify-email/')).toEqual({ page: 'verifyEmail' });
    expect(parseRoute('/reset-password/extra')).toEqual({ page: 'notFound' });
    expect(titleForRoute({ page: 'resetPassword' })).toBe('Choose a new password · Prologue');
  });

  it('a reset link asks for the new password twice, then tries it (the demo sends no emails)', async () => {
    renderApp('/reset-password#token=abc.def.ghi');
    await screen.findByRole('heading', { name: 'Choose a new password' });
    // The token is taken out of the address bar right away.
    await waitFor(() => expect(currentPath()).toBe('/reset-password'));

    await type(screen.getByLabelText('New password'), 'brand-new-pass');
    await type(screen.getByLabelText('Repeat the new password'), 'brand-new-pas');
    await click(screen.getByRole('button', { name: 'Save and log in' }));
    expect(screen.getByRole('alert').textContent).toMatch("don't match");

    await type(screen.getByLabelText('Repeat the new password'), 'brand-new-pass');
    await click(screen.getByRole('button', { name: 'Save and log in' }));
    expect((await screen.findByRole('alert')).textContent).toMatch("Links from emails don't work in the demo");
  });

  it('a link without its token says so instead of failing', async () => {
    renderApp('/reset-password');
    expect((await screen.findByRole('alert')).textContent).toMatch('incomplete');
    await click(screen.getByRole('button', { name: 'Go to Prologue' }));
    expect(currentPath()).toBe('/');
    await screen.findByLabelText(/username or email/i);
  });

  it('a confirmation link is checked as soon as it opens', async () => {
    renderApp('/verify-email#token=abc');
    await screen.findByRole('heading', { name: 'Confirm your email' });
    expect((await screen.findByRole('alert')).textContent).toMatch("Links from emails don't work in the demo");
    await click(screen.getByRole('button', { name: 'Continue to Prologue' }));
    expect(currentPath()).toBe('/');
  });
});

describe('forgot password', () => {
  it('is offered on the login screen and keeps what was typed', async () => {
    renderApp('/');
    await type(await screen.findByLabelText(/username or email/i), 'sarah_plumber');
    await click(screen.getByRole('button', { name: 'Forgot password?' }));
    const field = screen.getByLabelText(/username or email/i);
    expect(field.value).toBe('sarah_plumber');
    await click(screen.getByRole('button', { name: 'Send reset link' }));
    expect((await screen.findByRole('status')).textContent).toMatch("The demo doesn't send emails");

    await click(screen.getByRole('button', { name: 'Back to log in' }));
    expect(screen.getByRole('button', { name: /^log in$/i, hidden: false })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('email in Settings', () => {
  it('invites you to add one, and shows when it is confirmed', async () => {
    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    await click(within(sidebar()).getByRole('button', { name: 'Settings' }));
    expect(await screen.findByText(/so you can reset your password/)).toBeTruthy();

    await click(screen.getByRole('button', { name: 'Edit' }));
    await type(screen.getByLabelText(/^Email/), 'sarah@example.com');
    await click(screen.getByRole('button', { name: 'Save profile' }));
    expect(await screen.findByText('sarah@example.com')).toBeTruthy();
    expect(screen.getByText('Confirmed')).toBeTruthy(); // the demo counts addresses as confirmed
  });
});
