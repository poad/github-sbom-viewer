import { Context } from 'hono';
import { Logger } from '@aws-lambda-powertools/logger';
import { GitHub } from './github';

const logger = new Logger();

async function rootHandler(
  c: Context,
  apiRoot?: string,
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

    // Accept ヘッダーをチェックしてJSONリクエストかどうか判定
    const acceptHeader = c.req.header('Accept');
    if (acceptHeader?.includes('application/json')) {
      // JSONレスポンスでトークン情報を返す
      return c.json({
        success: true,
        token: token.token,
        user: user?.login || null,
        expiresIn: token.expires_in || 3600,
      });
    }

    // ブラウザからの直接アクセスの場合はコールバックページにリダイレクト
    const redirectUrl = new URL('/callback', c.req.url);
    redirectUrl.searchParams.set('token', token.token);
    if (user?.login) {
      redirectUrl.searchParams.set('user', user.login);
    }
    
    return c.redirect(redirectUrl.toString(), 303);
  } catch (e) {
    return c.json(JSON.parse(JSON.stringify(e)), 500);
  }
}

async function githubHandler(c: Context) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return c.redirect('/', 303);
  }

  const github = GitHub(token);
  const owners = await github.listOwners();
  return c.json({
    owners,
  });
}

async function githubOwnerHandler(c: Context, owner: string) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return c.redirect('/', 303);
  }

  const github = GitHub(token);
  const repos = await github.listOrganizationRepositories(owner);
  return c.json({
    repos,
  });
}

async function githubSbomHandler(c: Context, owner: string, repo: string) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return c.redirect('/', 303);
  }

  const github = GitHub(token);
  const sbom = await github.getSbom({owner, repo});
  return c.json(sbom);
}

async function csrfTokenHandler(c: Context) {
  // CSRFトークンを返す
  return c.json({ csrfToken: c.get('csrfToken') });
}

async function githubUserHandler(c: Context) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
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
  csrfTokenHandler,
};
