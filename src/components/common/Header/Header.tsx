import styles from './Header.module.scss';

export function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Hum to Song</h1>
      <p className={styles.tagline}>
        Hum a tune. The app finds the notes, writes chords, bass and drums, and plays it back as a
        song.
      </p>
    </header>
  );
}
