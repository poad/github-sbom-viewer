import { Hono, Context } from 'hono';
import { handle, LambdaContext, LambdaEvent } from 'hono/aws-lambda';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { githubAuth } from '@hono/oauth-providers/github';
import { Logger } from '@aws-lambda-powertools/logger';

import { rootHandler, githubHandler, githubUserHandler, githubOwnerHandler, githubSbomHandler, csrfTokenHandler } from './app';

const apiRoot = process.env.API_ROOT_PATH;

const log = new Logger();


const domain = process.env.DOMAIN;
const callbackUrl = domain ? `https://${domain}${apiRoot}/` : undefined;

const app = apiRoot ? new Hono().basePath(apiRoot) : new Hono();
app.use(logger())
  .use(cors({
    origin: domain ? [`https://${domain}`] : ['http://localhost:5173', 'http://localhost:5174'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  }))
  .use(async (c, next) => {
    // セキュリティヘッダーの設定
    c.header('Cross-Origin-Resource-Policy', 'cross-origin');
    c.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-Content-Type-Options', 'nosniff');
    await next();
  })
  .use(csrf())
  .use(
    '/',
    githubAuth({
      client_id: process.env.GITHUB_APP_CLIENT_ID,
      client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
      scope: ['user'],
      redirect_uri: callbackUrl,
    }),
  );

app.get('/', async (c: Context) => rootHandler(c, apiRoot));
app.get('/csrf-token', csrfTokenHandler);
app.get('/github', githubHandler);
app.get('/github/repos', githubUserHandler);
app.get('/github/owners/:owner', async (c: Context) => githubOwnerHandler(c, c.req.param('owner')));
app.get('/github/sbom/:owner/:repo', async (c: Context) => githubSbomHandler(c, c.req.param('owner'), c.req.param('repo')));
export const handler = async (event: LambdaEvent, context: LambdaContext) => {
  log.info(JSON.parse(JSON.stringify(event)));
  return handle(app)(event, context);
};
