// Helpers for rendering the whole app (in demo mode) and driving it like a user.
import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { I18nProvider } from '../i18n';

function Where() {
  const location = useLocation();
  return <output data-testid="where" hidden>{location.pathname}</output>;
}

// Tests run in English unless they pass another language.
export function renderApp(path = '/', { language = 'en' } = {}) {
  return render(
    <I18nProvider initial={language}>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
        <Where />
      </MemoryRouter>
    </I18nProvider>
  );
}

// The current address inside the app.
export const currentPath = () => screen.getByTestId('where').textContent;

export const click = async (el) => { await act(async () => { fireEvent.click(el); }); };
export const type = async (el, value) => { await act(async () => { fireEvent.change(el, { target: { value } }); }); };

// jsdom applies no CSS, so the bottom bar (phones) is always present; the menu opens from the header button.
// The menu opens from the header's menu button; this opens it if it isn't open yet.
export const sidebar = () => {
  if (!screen.queryAllByRole('navigation', { name: 'Main menu' }).length) {
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Open menu' }));
  }
  return screen.getAllByRole('navigation', { name: 'Main menu' })[0];
};
export const bottomBar = () => screen.getByRole('navigation', { name: 'Sections' });
export const header = () => screen.getByRole('banner');
export const bell = () => within(header()).getByRole('button', { name: /^Notifications/ });

// Logs in on the login screen and waits until the feed has loaded.
export async function login(username, password = 'demo1234') {
  await type(await screen.findByLabelText(/username or email/i), username);
  await type(screen.getByLabelText(/^password/i), password);
  await click(screen.getAllByRole('button', { name: /^log in$/i }).at(-1));
}

export async function loginAndWaitForFeed(username, password) {
  await login(username, password);
  await screen.findAllByRole('button', { name: /^Comments \(/ });
}
