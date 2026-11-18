import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import en from './en';
import es from './es';
import fr from './fr';
import de from './de';
import ja from './ja';
import { LANGUAGES, makeT, pickLanguage } from '.';
import { renderApp } from '../test/utils';

const placeholders = (s) => [...new Set(s.match(/\{\w+\}/g) || [])].sort();
const DICTS = { es, fr, de, ja };

describe('translations', () => {
  it('every language listed has a dictionary', () => {
    expect(LANGUAGES.map((l) => l.code).sort()).toEqual(['de', 'en', 'es', 'fr', 'ja']);
  });

  for (const [code, dict] of Object.entries(DICTS)) {
    it(`${code} has every key, nothing extra, and the same placeholders`, () => {
      // Japanese has a single plural form, so it needs no "_one" variants.
      const needed = Object.keys(en).filter((k) => !(code === 'ja' && k.endsWith('_one')));
      expect(needed.filter((k) => !(k in dict))).toEqual([]);
      expect(Object.keys(dict).filter((k) => !(k in en))).toEqual([]);
      const mismatched = Object.keys(dict).filter((k) => placeholders(dict[k]).join() !== placeholders(en[k]).join());
      expect(mismatched).toEqual([]);
    });
  }
});

describe('choosing the language', () => {
  it("uses the device's language when we have it", () => {
    expect(pickLanguage({ deviceLanguages: ['es-MX', 'en-US'] })).toBe('es');
    expect(pickLanguage({ deviceLanguages: ['he-IL', 'fr-FR'] })).toBe('fr'); // first one we support
    expect(pickLanguage({ deviceLanguages: ['de-AT'] })).toBe('de');
  });

  it('falls back to a hint from the time zone, then English', () => {
    expect(pickLanguage({ deviceLanguages: ['he-IL'], timeZone: 'Asia/Tokyo' })).toBe('ja');
    expect(pickLanguage({ deviceLanguages: ['ko-KR'], timeZone: 'America/Mexico_City' })).toBe('es');
    expect(pickLanguage({ deviceLanguages: ['he-IL'], timeZone: 'Asia/Jerusalem' })).toBe('en');
    expect(pickLanguage({})).toBe('en');
  });

  it('a language picked in the app wins', () => {
    expect(pickLanguage({ saved: 'ja', deviceLanguages: ['de-DE'] })).toBe('ja');
    expect(pickLanguage({ saved: 'xx', deviceLanguages: ['de-DE'] })).toBe('de');
  });
});

describe('wording', () => {
  it('fills in values and picks plural forms by language rules', () => {
    const t = makeT('en', en);
    expect(t('nav.unread', { count: 1 })).toBe('1 unread');
    expect(t('activity.ideas', { count: 2 })).toBe('2 ideas');
    expect(t('profile.notFoundText', { username: 'sam' })).toBe('There is no one called @sam on Prologue.');
    expect(makeT('fr', fr)('activity.ideas', { count: 0 })).toBe('0 idée'); // French: 0 is singular
    expect(makeT('ja', ja)('activity.ideas', { count: 1 })).toBe('アイデア1件');
    expect(makeT('de', de)('activity.ideas', { count: 1500 })).toBe('1.500 Ideen'); // numbers formatted too
  });

  it('falls back to English for a missing key, then to the key itself', () => {
    expect(makeT('es', {})('auth.login')).toBe('Log in');
    expect(makeT('es', es)('no.such.key')).toBe('no.such.key');
  });
});

describe('in the app', () => {
  it('opens in the chosen language and can be switched on the login screen', async () => {
    renderApp('/', { language: 'es' });
    expect(await screen.findByRole('tab', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('es');
    expect(screen.getByText('Una historia detrás de cada profesión')).toBeTruthy();

    await act(async () => { fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'ja' } }); });
    expect(await screen.findByRole('tab', { name: 'ログイン' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('ja');
    expect(localStorage.getItem('prologue_language')).toBe('ja');

    await act(async () => { fireEvent.change(screen.getByLabelText('言語'), { target: { value: 'en' } }); });
    expect(await screen.findByRole('tab', { name: 'Log in' })).toBeTruthy();
  });
});
