import styles from './Table.module.css';

import { type Element } from 'solid-js';

interface TableProps {
  children: Element;
}

export default function Table(props: TableProps) {
  return <table class={styles.table}>{props.children}</table>;
}

interface ThProps {
  children: Element;
  sort?: 'none' | 'ascending' | 'descending' | 'other';
}

export function Th(props: ThProps) {
  return (
    <th class={styles.th} aria-sort={props.sort ?? 'none'}>
      {props.children}
    </th>
  );
}
