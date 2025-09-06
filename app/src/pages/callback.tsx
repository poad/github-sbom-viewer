import { onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { getCookieValue, hasGivenConsent } from '../utils/cookie-consent';

export default function Callback() {
  const navigate = useNavigate();

  onMount(() => {
    try {
      // クッキー同意がない場合はホーム画面にリダイレクト
      if (!hasGivenConsent()) {
        navigate('/', { replace: true });
        return;
      }

      const token = getCookieValue('token');
      const user = getCookieValue('user');

      if (token && user) {
        // 認証成功、ホーム画面にリダイレクト
        navigate('/', { replace: true });
      } else {
        throw new Error('認証クッキーが見つかりません');
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
