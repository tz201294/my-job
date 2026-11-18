import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import LIST from './professions.json';
import en from './text/en';
import es from './text/es';
import fr from './text/fr';
import de from './text/de';
import ja from './text/ja';
import { fold, searchProfessions } from '.';
import { click, loginAndWaitForFeed, renderApp, sidebar, type } from '../test/utils';
import { parseRoute } from '../routes';

const TEXTS = { en, es, fr, de, ja };
const merged = (text) => LIST.map((p) => ({ ...p, ...en[p.slug], ...text[p.slug], englishName: en[p.slug].name }));

describe('the catalog', () => {
  it('has about 50 professions with valid related links', () => {
    expect(LIST.length).toBeGreaterThanOrEqual(50);
    const slugs = new Set(LIST.map((p) => p.slug));
    expect(slugs.size).toBe(LIST.length);
    for (const p of LIST) expect(p.related.every((r) => slugs.has(r) && r !== p.slug)).toBe(true);
  });

  for (const [lang, text] of Object.entries(TEXTS)) {
    it(`${lang} describes every profession completely`, () => {
      expect(Object.keys(text).sort()).toEqual(LIST.map((p) => p.slug).sort());
      for (const [slug, p] of Object.entries(text)) {
        expect(p.name && p.description && p.path, slug).toBeTruthy();
        expect(p.tasks, slug).toHaveLength(3);
        expect(p.tools, slug).toHaveLength(3);
      }
    });
  }

  it('search ignores accents and also understands English names', () => {
    expect(fold('Médico')).toBe('medico');
    expect(searchProfessions(merged(es), 'medico')[0].slug).toBe('physician');
    expect(searchProfessions(merged(de), 'nurse')[0].slug).toBe('nurse'); // English name, German UI
    expect(searchProfessions(merged(ja), '看護')[0].slug).toBe('nurse');
    expect(searchProfessions(merged(en), 'elec').map((p) => p.slug)).toContain('electrician');
    expect(searchProfessions(merged(en), 'zzzz')).toEqual([]);
  });

  it('has addresses of its own', () => {
    expect(parseRoute('/professions')).toEqual({ page: 'professions' });
    expect(parseRoute('/professions/bus-driver')).toEqual({ page: 'profession', slug: 'bus-driver' });
  });
});

describe('profession pages', () => {
  it('list professions by field and open one with the people who do it', async () => {
    renderApp('/');
    await loginAndWaitForFeed('alex_driver');
    await click(within(sidebar()).getByRole('button', { name: 'Professions' }));
    expect(await screen.findByRole('heading', { name: 'Professions', level: 2 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Healthcare & Medicine' })).toBeTruthy();

    await type(screen.getByLabelText('Search professions'), 'plumb');
    const plumber = await screen.findByRole('link', { name: /^Plumber/ });
    await waitFor(() => expect(plumber.textContent).toMatch('1 here'));
    await click(plumber);

    expect(await screen.findByRole('heading', { name: 'Plumber', level: 2 })).toBeTruthy();
    expect(screen.getByText('Find and fix leaks and blockages')).toBeTruthy();
    expect(screen.getByText('Pipe wrench')).toBeTruthy();
    expect(await screen.findByRole('link', { name: /^Sarah Jenkins/ })).toBeTruthy();
    await click(screen.getByRole('link', { name: 'Electrician' }));
    expect(await screen.findByRole('heading', { name: 'Electrician', level: 2 })).toBeTruthy();
    expect(await screen.findByText(/No one on Prologue has picked this profession yet/)).toBeTruthy();
  });

  it('show in the app language', async () => {
    renderApp('/professions/plumber', { language: 'es' });
    await type(await screen.findByLabelText('Usuario o correo electrónico'), 'alex_driver');
    await type(screen.getByLabelText('Contraseña'), 'demo1234');
    await click(screen.getAllByRole('button', { name: 'Iniciar sesión' }).at(-1));
    expect(await screen.findByRole('heading', { name: 'Fontanero', level: 2 })).toBeTruthy();
    expect(screen.getByText('Un día normal')).toBeTruthy();
  });
});

describe('picking your profession', () => {
  it('links the profile to a catalog profession and sets the field', async () => {
    renderApp('/');
    await loginAndWaitForFeed('sarah_plumber');
    await click(within(sidebar()).getByRole('button', { name: 'Settings' }));
    await click(await screen.findByRole('button', { name: 'Edit' }));

    const input = screen.getByLabelText('Job title');
    await type(input, 'electr');
    const option = await screen.findByRole('option', { name: /Electrician/ });
    await act(async () => { fireEvent.mouseDown(option); });
    expect(input.value).toBe('Electrician');
    expect(screen.getByText(/Linked to the Electrician page/)).toBeTruthy();
    expect(screen.getByLabelText('Field').value).toBe('Trades & Craftsmanship');

    await click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save profile' })).toBeNull());

    await click(within(sidebar()).getByRole('button', { name: 'Professions' }));
    await click(await screen.findByRole('link', { name: /^Electrician/ }));
    expect(await screen.findByRole('link', { name: /^Sarah Jenkins/ })).toBeTruthy();
  });
});
