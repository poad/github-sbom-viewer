import { Context } from 'hono';
import { Logger } from '@aws-lambda-powertools/logger';
import {
  setCookie,
  getCookie,
} from 'hono/cookie';
import { GitHub } from './github';

const logger = new Logger();

async function rootHandler(
  c: Context,
  apiRoot?: string,
  domain?: string,
) {
  const token = c.get('token');
  if (!token?.token) {
    logger.debug('Not Found token');
    logger.debug(c.req.query.toString());
    return c.redirect(`${apiRoot}`);
  }

  logger.debug(JSON.parse(JSON.stringify(token)));

  try {
    const user = c.get('user-github');

    if (domain) {
      const expires = new Date(new Date().getTime() + (token.expires_in ?? 0) * 1000);
      setCookie(c, 'token', token.token, {
        secure: true,
        domain,
        httpOnly: true,
        maxAge: 1000,
        expires,
        sameSite: 'Lax',
      });
      if (user?.login) {
        setCookie(c, 'user', user.login, {
          secure: true,
          domain,
          httpOnly: false,
          maxAge: 1000,
          expires,
          sameSite: 'Lax',
        });
      }

      const refreshToken = c.get('refresh-token');
      if (refreshToken) {
        const refreshTokenExpires = new Date(new Date().getTime() + (refreshToken.expires_in ?? 0) * 1000);
        setCookie(c, 'refresh-token', refreshToken.token, {
          secure: true,
          domain,
          httpOnly: true,
          maxAge: 1000,
          expires: refreshTokenExpires,
          sameSite: 'Lax',
        });
      }
    }

    return c.redirect('/', 303);
  } catch (e) {
    return c.json(JSON.parse(JSON.stringify(e)), 500);
  }
}

async function githubHandler(c: Context) {
  const token = getCookie(c, 'token');
  if (!token) {
    // TODO:

    return c.redirect('/', 303);
  }

  const github = GitHub(token);
  const owners = await github.listOwners();
  return c.json({
    owners,
  });
}

async function githubOwnerHandler(c: Context, owner: string) {
  const token = getCookie(c, 'token');
  if (!token) {
    // TODO:

    return c.redirect('/', 303);
  }

  const github = GitHub(token);
  const repos = await github.listOrganizationRepositories(owner);
  return c.json({
    repos,
  });
}

async function githubSbomHandler(c: Context, owner: string, repo: string) {
  const token = getCookie(c, 'token');
  if (!token) {
    // TODO:

    return c.redirect('/', 303);
  }

  const github = GitHub(token);
  const sbom = await github.getSbom({owner, repo});
  return c.json(sbom);
}

async function githubUserHandler(c: Context) {
  const token = getCookie(c, 'token');
  if (!token) {
    // TODO:

    return c.redirect('/', 303);
  }

  const github = GitHub(token);
  const repos = await github.listCurrentUserRepositories();
  return c.json({
    repos,
  });
}

export {
  rootHandler,
  githubHandler,
  githubOwnerHandler,
  githubUserHandler,
  githubSbomHandler,
};
