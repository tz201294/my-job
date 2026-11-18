import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { professionIndexFor } from '../components/ProfessionOfTheDay';
import { click, header, login, loginAndWaitForFeed, renderApp, type } from './utils';

describe('profession of the day', () => {
  it('is the same all day and changes the next day', () => {
    const morning = professionIndexFor(new Date(2026, 10, 20, 8), 51);
    expect(professionIndexFor(new Date(2026, 10, 20, 23), 51)).toBe(morning);
    expect(professionIndexFor(new Date(2026, 10, 21, 8), 51)).not.toBe(morning);
    for (let d = 0; d < 60; d += 1) {
      const i = professionIndexFor(new Date(2026, 0, 1 + d), 51);
      expect(i >= 0 && i < 51).toBe(true);
    }
  });

  it('sits after the second post, steps aside while searching, and hides until tomorrow', async () => {
    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    const feed = () => within(screen.getByRole('main')); // (wide screens show it in the side column instead)
    const card = feed().getByText('Profession of the day', { exact: false }).closest('a');
    expect(card.getAttribute('href')).toMatch(/^\/professions\/[a-z-]+$/);
    // Two posts come before it, so the feed opens on posts.
    const cards = [...document.querySelectorAll('.card-glow')];
    expect(cards.filter((c) => c.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).length).toBe(2);

    await type(within(header()).getAllByRole('searchbox')[0], 'valve');
    await waitFor(() => expect(feed().queryByText('Profession of the day', { exact: false })).toBeNull());
    await type(within(header()).getAllByRole('searchbox')[0], '');
    await feed().findByText('Profession of the day', { exact: false });

    // The × hides it for the rest of the day, on this device.
    await click(screen.getByRole('button', { name: 'Hide until tomorrow' }));
    expect(feed().queryByText('Profession of the day', { exact: false })).toBeNull();
    expect(localStorage.getItem('myjob_pod_hidden')).toBeTruthy();
  });
});

describe('the column beside the feed', () => {
  it("shows today's profession, people to follow and more professions; following works from it", async () => {
    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    const rail = screen.getByRole('complementary', { name: 'Suggestions' });
    const today = within(rail).getByText('Profession of the day', { exact: false }).closest('a');
    expect(today.getAttribute('href')).toMatch(/^\/professions\/[a-z-]+$/);
    expect(within(rail).getAllByRole('link').filter((l) => /^\/professions\/./.test(l.getAttribute('href'))).length).toBe(6);
    expect(within(rail).getByRole('link', { name: /All professions/ }).getAttribute('href')).toBe('/professions');

    const people = within(rail).getByRole('region', { name: 'People to follow' });
    const follow = within(people).getAllByRole('button', { name: /^Follow: / });
    expect(within(people).queryByText('Sarah Jenkins')).toBeNull(); // never yourself
    const name = follow[0].getAttribute('aria-label').replace('Follow: ', '');
    await click(follow[0]);
    // Stays in the list, now marked as followed
    await waitFor(() => expect(within(people).getByRole('button', { name: `Following: ${name}` })
      .getAttribute('aria-pressed')).toBe('true'));
  });

  it('is only beside the home feed', async () => {
    renderApp('/settings');
    await login('sarah_plumber');
    await screen.findByRole('heading', { name: 'Settings' });
    expect(screen.queryByRole('complementary', { name: 'Suggestions' })).toBeNull();
  });
});

describe('liking', () => {
  it('pops the heart when a post is liked', async () => {
    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    const like = screen.getAllByRole('button').find((b) => b.querySelector('svg.lucide-heart') && !b.querySelector('.like-pop'));
    await click(like);
    await waitFor(() => expect(like.querySelector('svg.like-pop')).not.toBeNull());
  });
});
