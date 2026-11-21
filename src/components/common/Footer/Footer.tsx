import styles from './Footer.module.scss';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p>Everything runs in your browser. Your audio never leaves this device.</p>
      <p>
        Notes found with{' '}
        <a href="https://github.com/spotify/basic-pitch-ts" rel="noreferrer" target="_blank">
          Basic Pitch
        </a>{' '}
        (Apache 2.0). Sound by{' '}
        <a href="https://tonejs.github.io" rel="noreferrer" target="_blank">
          Tone.js
        </a>
        . Piano: Salamander Grand Piano by Alexander Holm (CC BY 3.0).
      </p>
    </footer>
  );
}
