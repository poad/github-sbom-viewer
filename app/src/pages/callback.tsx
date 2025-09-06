import { onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { getCookieValue, hasGivenConsent } from '../utils/cookie-consent';

export default function Callback() {
  const navigate = useNavigate();

  onMount(async () => {
    try {
      // クッキー同意がない場合はホーム画面にリダイレクト
      if (!hasGivenConsent()) {
        navigate('/', { replace: true });
        return;
      }

      // userクッキーの存在を確認（HttpOnlyではないため直接確認可能）
      const user = getCookieValue('user');
      
      if (user) {
        console.log('認証成功: ユーザー', user);
        // 認証成功、ホーム画面にリダイレクト
        navigate('/', { replace: true });
      } else {
        // APIエンドポイントで認証状態を確認
        console.log('userクッキーが見つからない、APIで認証状態を確認中...');
        
        try {
          const response = await fetch('/api/github', {
            method: 'GET',
            credentials: 'include',
          });
          
          if (response.ok) {
            console.log('API認証成功');
            // 認証成功、ホーム画面にリダイレクト
            navigate('/', { replace: true });
          } else {
            throw new Error(`認証API失敗: ${response.status}`);
          }
        } catch (apiError) {
          console.error('API認証エラー:', apiError);
          throw new Error('認証APIへのアクセスに失敗しました');
        }
      }
    } catch (error) {
      console.error('認証エラー:', error);
      // エラー時はホーム画面にリダイレクト
      navigate('/', { replace: true });
    }
  });

  return (
    <div>
      <p>認証処理中...</p>
    </div>
  );
}
