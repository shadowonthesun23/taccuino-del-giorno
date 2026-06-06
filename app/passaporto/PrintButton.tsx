'use client';

import styles from './passaporto.module.css';

export default function PrintButton() {
  return (
    <button className={styles.printButton} type="button" onClick={() => window.print()}>
      Scarica PDF
    </button>
  );
}
