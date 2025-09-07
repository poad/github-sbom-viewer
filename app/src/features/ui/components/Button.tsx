import { JSXElement } from 'solid-js';

interface ButtonProps {
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
    <button onClick={props.onClick} style={style}>
      {props.children}
    </button>
  );
}
