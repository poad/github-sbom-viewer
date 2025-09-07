import { JSXElement } from 'solid-js';

interface TableProps {
  children: JSXElement;
}

export default function Table(props: TableProps) {
  const style = {
    width: '100%',
    'border-collapse': 'collapse',
    border: '1px solid #d1d5db',
  } as const;
  return <table style={style}>{props.children}</table>;
}

interface ThProps {
  children: JSXElement;
  sort?: 'none' | 'ascending' | 'descending' | 'other';
}

export function Th(props: ThProps) {
  const style = {
    padding: '12px',
    'text-align': 'left',
    border: '1px solid #d1d5db',
  } as const;
  return (
    <th style={style} aria-sort={props.sort ?? 'none'}>
      {props.children}
    </th>
  );
}
