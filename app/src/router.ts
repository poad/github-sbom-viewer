import { createRouter } from '@solidjs/router';
import { lazy } from 'solid-js';

const Router = createRouter({
  routes: [
    { path: '/', component: lazy(() => import('./pages/index')) },
    { path: '/owners/:login', component: lazy(() => import('./pages/owners/[login]/index')) },
    {
      path: '/owners/:login/:repo',
      component: lazy(() => import('./pages/owners/[login]/[repo]/index')),
    },
    { path: '/repos', component: lazy(() => import('./pages/repos/index')) },
    { path: '/repos/:repo', component: lazy(() => import('./pages/repos/[repo]/index')) },
  ],
});

export default Router;
