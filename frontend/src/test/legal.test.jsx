import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { click, loginAndWaitForFeed, renderApp, sidebar, type } from './utils';
import { parseRoute } from '../routes';

afterEach(() => vi.restoreAllMocks());

describe('legal pages', () => {
  it('can be read without an account', async () => {
    expect(parseRoute('/privacy')).toEqual({ page: 'privacy' });
    expect(parseRoute('/terms')).toEqual({ page: 'terms' });

    renderApp('/privacy');
    expect(await screen.findByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeTruthy();
    expect(screen.getByText(/no cookies for tracking or advertising/)).toBeTruthy();
    expect(screen.queryByLabelText(/username or email/i)).toBeNull(); // no login wall
  });

  it('terms include the community rules and the not-professional-advice note', async () => {
    renderApp('/terms');
    expect(await screen.findByRole('heading', { name: 'Terms of Service', level: 1 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Community rules' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Not professional advice' })).toBeTruthy();
  });

  it('are linked from the login screen', async () => {
    renderApp('/');
    await screen.findByLabelText(/username or email/i);
    expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('/privacy');
    expect(screen.getByRole('link', { name: 'Terms' }).getAttribute('href')).toBe('/terms');
  });
});

describe('signing up', () => {
  it('needs the Terms accepted', async () => {
    renderApp('/');
    await click(await screen.findByRole('tab', { name: 'Sign up' }));
    await type(screen.getByLabelText('Username'), 'terms_reader');
    await type(screen.getByLabelText('Password'), 'secret-pass1');
    await click(screen.getByRole('button', { name: 'Continue' }));
    await click(screen.getByText('No, not currently'));
    await click(screen.getByText('Student'));
    await click(screen.getAllByRole('checkbox')[0]);
    await click(screen.getByRole('button', { name: 'Continue' }));
    await click(screen.getAllByText('Prefer not to say')[0]); // the gender choice
    await type(screen.getByLabelText('Age'), '30');

    await click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert').textContent).toMatch('accept the Terms of Service');
    const terms = screen.getByRole('link', { name: 'Terms of Service' });
    expect(terms.getAttribute('target')).toBe('_blank'); // opens beside the form, which keeps its answers

    await click(screen.getByRole('checkbox', { name: /I agree to the Terms of Service/ }));
    await click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull());
  });
});

describe('download my data', () => {
  it('saves a file with your account in it', async () => {
    const blobs = [];
    URL.createObjectURL = vi.fn((b) => { blobs.push(b); return 'blob:prologue'; });
    URL.revokeObjectURL = vi.fn();
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    await click(within(sidebar()).getByRole('button', { name: 'Settings' }));
    await click(await screen.findByRole('button', { name: 'Download' }));
    await waitFor(() => expect(clicked).toHaveBeenCalled());
    const text = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(blobs[0]);
    });
    const data = JSON.parse(text);
    expect(data.account.username).toBe('sarah_plumber');
    expect(data.posts.length).toBeGreaterThan(0);
  });
});
