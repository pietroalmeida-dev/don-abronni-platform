import styles from './LoadingSpinner.module.css';

export default function LoadingSpinner({ label }) {
  return (
    <span className={styles.wrapper} role="status" aria-live="polite">
      <i className={`fa-solid fa-spinner fa-spin ${styles.icon}`} />
      {label && <span className={styles.label}>{label}</span>}
    </span>
  );
}
