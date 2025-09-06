import { render } from 'solid-js/web';
import { Router } from '@solidjs/router';
import routes from '~solid-pages';
import { initSessionCleanup } from './utils/session';
import { initializeCSP } from './utils/csp-middleware';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

// CSPの初期化
initializeCSP();

// セッションクリーンアップを初期化
initSessionCleanup();

if (root) {
  render(() => <Router>{routes}</Router>, root);
}
