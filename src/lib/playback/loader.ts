type TToneWindow = Window & { TONE_SILENCE_LOGGING?: boolean };

const quiet = () => {
  (window as TToneWindow).TONE_SILENCE_LOGGING = true;
};

export function loadPlayer() {
  quiet();
  return import('./player');
}

export function loadRenderer() {
  quiet();
  return import('./render');
}
