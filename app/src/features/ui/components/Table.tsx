import { JSXElement } from 'solid-js';
import styles from './Table.module.css';

interface TableProps {
  children: JSXElement;
}

export default function Table(props: TableProps) {
  return <table class={styles.table}>{props.children}</table>;
}

interface ThProps {
  children: JSXElement;
  sort?: 'none' | 'ascending' | 'descending' | 'other';
}

export function Th(props: ThProps) {
  return (
    <th class={styles.th} aria-sort={props.sort ?? 'none'}>
      {props.children}
    </th>
  );
}
