import { onMount } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';

export default function Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  onMount(() => {
    try {
      const token = searchParams.token;
      const user = searchParams.user;

      if (token && user) {
        // トークンと有効期限を保存
        const expiryTime = Date.now() + 3600000; // 1時間後
        localStorage.setItem('token', token);
        localStorage.setItem('tokenExpiry', expiryTime.toString());
        localStorage.setItem('user', user);
        
        // ホーム画面にリダイレクト
        navigate('/', { replace: true });
        // ホーム画面にリダイレクト
        navigate('/', { replace: true });
      } else {
        throw new Error('認証パラメータが不足しています');
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
