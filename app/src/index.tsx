import { render } from 'solid-js/web';
import { Router } from '@solidjs/router';
import routes from '~solid-pages';
import { CookieConsentProvider } from './contexts/CookieConsentContext';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

if (root) {
  render(() => (
    <CookieConsentProvider>
      <Router>{routes}</Router>
    </CookieConsentProvider>
  ), root);
}
