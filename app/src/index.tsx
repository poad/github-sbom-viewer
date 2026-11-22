import { CookieConsentProvider } from './contexts/CookieConsentContext';
import { FadeLoader } from './features/ui/components';
import Router from './router';

import { render } from '@solidjs/web';
import { Loading } from 'solid-js';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

if (root) {
  render(
    () => (
      <CookieConsentProvider>
        <Loading fallback={<FadeLoader />}>
          <Router>{(props) => props.children}</Router>
        </Loading>
      </CookieConsentProvider>
    ),
    root,
  );
}
