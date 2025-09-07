import { JSXElement } from 'solid-js';

interface ButtonProps {
  /**
   * ボタンのテキストやアイコンなど、子要素として表示する内容
   */
  children: JSXElement;
  /**
   * クリックハンドラ
   */
  onClick: (e: MouseEvent) => void;
  /**
   * アクティブ状態（スタイル変更用）
   */
  active?: boolean;
  /**
   * アクセシビリティ向上のための aria-label
   */
  ariaLabel?: string;
  /**
   * ボタンの type 属性（デフォルトは 'button'）
   */
  type?: "button" | "submit" | "reset";
  /**
   * 無効化状態
   */
  disabled?: boolean;
}
  children: JSXElement;
  onClick: (e: MouseEvent) => void;
  active?: boolean;
}

export default function Button(props: ButtonProps) {
  const baseStyle = {
    padding: '8px 16px',
    border: 'none',
    'border-radius': '4px',
    cursor: 'pointer',
    margin: '0 8px 0 0',
  } as const;

  const activeStyle = {
    background: props.active ? '#2563eb' : '#e5e7eb',
    color: props.active ? 'white' : '#374151',
  } as const;

  const style = { ...baseStyle, ...activeStyle };

  return (
    <button
        onClick={props.onClick}
        style={style}
        aria-label={props.ariaLabel}
        type={props.type ?? "button"}
        disabled={props.disabled}
      >
      {props.children}
    </button>
  );
}
