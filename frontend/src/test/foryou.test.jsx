import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { api } from '../api/client';
import { click, loginAndWaitForFeed, renderApp, sidebar } from './utils';

afterEach(() => vi.restoreAllMocks());

describe('the feed learns from what you open', () => {
  it('records opening a profession page and a case study (once each)', async () => {
    const seen = vi.spyOn(api, 'recordView');
    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    expect(seen).not.toHaveBeenCalled(); // the home feed itself isn't an "open"

    await click(screen.getAllByRole('button', { name: /See the steps/ })[0]);
    await waitFor(() => expect(seen).toHaveBeenCalledWith('case_study', expect.any(String)));

    await click(screen.getByRole('button', { name: 'Close' }));
    await click(within(sidebar()).getByRole('button', { name: 'Professions' }));
    await click(await screen.findByRole('link', { name: /^Nurse/ }));
    await screen.findByRole('heading', { name: 'Nurse', level: 2 });
    await waitFor(() => expect(seen).toHaveBeenCalledWith('profession', 'nurse'));
    expect(seen.mock.calls.filter(([k, id]) => k === 'profession' && id === 'nurse')).toHaveLength(1);
  });
});
