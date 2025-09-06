import { Context } from 'hono';
import { Logger } from '@aws-lambda-powertools/logger';
import { getOwners, getUserRepos, getOwnerRepos, getSbomData } from './github';

const logger = new Logger();

// トークンの有効期限を動的に計算する関数
// トークンの有効期限を動的に計算する関数
function calculateTokenMaxAge(token: { expires_in?: number }): number {
  if (token.expires_in && typeof token.expires_in === 'number' && token.expires_in > 0) {
    // expires_inが提供されている場合はそれを使用
    return token.expires_in;
  }
  
  // GitHubのデフォルトトークン有効期限は8時間（28800秒）
  // セキュリティを考慮して少し短めに設定
  const DEFAULT_TOKEN_LIFETIME = 6 * 60 * 60; // 6時間
  return DEFAULT_TOKEN_LIFETIME;
}

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
    
    // トークンの有効期限を動的に計算
    const maxAge = calculateTokenMaxAge(token);

    // httpOnlyクッキーでトークンを設定
    c.header('Set-Cookie', `token=${token.token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`);
    if (user?.login) {
      c.header('Set-Cookie', `user=${user.login}; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`);
    }

    // Accept ヘッダーをチェックしてJSONリクエストかどうか判定
    const acceptHeader = c.req.header('Accept');
    if (acceptHeader?.includes('application/json')) {
      // JSONレスポンスで成功を返す
      return c.json({
        success: true,
        user: user?.login || null,
      });
    }

    // ブラウザからの直接アクセスの場合はコールバックページにリダイレクト
    return c.redirect('/callback', 303);
  } catch (e) {
    return c.json(JSON.parse(JSON.stringify(e)), 500);
  }
}

async function githubHandler(c: Context) {
  const token = c.req.header('Cookie')?.match(/token=([^;]+)/)?.[1];
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const owners = await getOwners(token);
    return c.json({ owners });
  } catch (e) {
    return c.json(JSON.parse(JSON.stringify(e)), 500);
  }
}

async function githubUserHandler(c: Context) {
  const token = c.req.header('Cookie')?.match(/token=([^;]+)/)?.[1];
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const repos = await getUserRepos(token);
    return c.json({ repos });
  } catch (e) {
    return c.json(JSON.parse(JSON.stringify(e)), 500);
  }
}

async function githubOwnerHandler(c: Context, owner: string) {
  const token = c.req.header('Cookie')?.match(/token=([^;]+)/)?.[1];
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const repos = await getOwnerRepos(token, owner);
    return c.json({ repos });
  } catch (e) {
    return c.json(JSON.parse(JSON.stringify(e)), 500);
  }
}

async function githubSbomHandler(c: Context, owner: string, repo: string) {
  const token = c.req.header('Cookie')?.match(/token=([^;]+)/)?.[1];
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const sbom = await getSbomData(token, owner, repo);
    return c.json(sbom);
  } catch (e) {
    return c.json(JSON.parse(JSON.stringify(e)), 500);
  }
}

async function csrfTokenHandler(c: Context) {
  // CSRFトークンを返す
  return c.json({ csrfToken: c.get('csrfToken') });
}

export {
  rootHandler,
  githubHandler,
  githubOwnerHandler,
  githubUserHandler,
  githubSbomHandler,
  csrfTokenHandler,
};
