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
        // localStorageにトークンとユーザー情報を保存
        localStorage.setItem('token', token);
        localStorage.setItem('user', user);
        
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
