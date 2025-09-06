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
    
    // デバッグ情報をログに出力
    logger.info('認証処理開始', {
      hasToken: !!token?.token,
      hasUser: !!user?.login,
      tokenLength: token?.token ? token.token.length : 0,
      userLogin: user?.login,
    });
    
    // トークンの有効期限を動的に計算
    const maxAge = calculateTokenMaxAge(token);

    // httpOnlyクッキーでトークンを設定
    const cookies = [`token=${token.token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`];
    if (user?.login) {
      cookies.push(`user=${user.login}; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`);
    }
    
    // 複数のSet-Cookieヘッダーを設定
    cookies.forEach(cookie => {
      c.res.headers.append('Set-Cookie', cookie);
      logger.info('Set-Cookieヘッダー設定', { cookie: cookie.split(';')[0] }); // 値の部分のみログ出力
    });

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
    const domain = process.env.DOMAIN;
    const callbackUrl = domain ? `https://${domain}/callback` : '/callback';
    return c.redirect(callbackUrl, 303);
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
