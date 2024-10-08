import { Hono, Context } from 'hono';
import { handle, LambdaContext, LambdaEvent } from 'hono/aws-lambda';
import { logger } from 'hono/logger';
import { csrf } from 'hono/csrf';
import { githubAuth } from '@hono/oauth-providers/github';
import { Logger } from '@aws-lambda-powertools/logger';

import { rootHandler, githubHandler, githubUserHandler, githubOwnerHandler, githubSbomHandler } from './app';

const apiRoot = process.env.API_ROOT_PATH;

const log = new Logger();


const domain = process.env.DOMAIN;
const callbackUrl = domain ? `https://${domain}${apiRoot}/` : undefined;

const app = apiRoot ? new Hono().basePath(apiRoot) : new Hono();
app.use(logger())
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

app.get('/', async (c: Context) => rootHandler(c, apiRoot, domain));
app.get('/github', githubHandler);
app.get('/github/repos', githubUserHandler);
app.get('/github/owners/:owner', async (c: Context) => githubOwnerHandler(c, c.req.param('owner')));
app.get('/github/sbom/:owner/:repo', async (c: Context) => githubSbomHandler(c, c.req.param('owner'), c.req.param('repo')));
export const handler = async (event: LambdaEvent, context: LambdaContext) => {
  log.info(JSON.parse(JSON.stringify(event)));
  return handle(app)(event, context);
};
