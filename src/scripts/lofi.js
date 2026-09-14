const button = document.getElementById('lofi-toggle');
const audio = document.getElementById('lofi-audio');
const volume = document.getElementById('lofi-volume');

function render(state) {
  if (!button) return;
  button.dataset.state = state;
  const playing = state === 'playing';
  const label =
    state === 'buffering' ? 'Buffering lofi radio' : playing ? 'Pause lofi radio' : 'Play lofi radio';
  button.setAttribute('aria-pressed', String(playing));
  button.setAttribute('aria-label', label);
  button.title = label;
}

if (button && audio) {
  button.addEventListener('click', () => {
    if (audio.paused) {
      render('buffering');
      audio.play().catch(() => render('paused'));
    } else {
      audio.pause();
    }
  });

  audio.addEventListener('playing', () => render('playing'));
  audio.addEventListener('pause', () => render('paused'));
  audio.addEventListener('waiting', () => render('buffering'));
  audio.addEventListener('error', () => render('paused'));

  if (volume instanceof HTMLInputElement) {
    audio.volume = Number(volume.value);
    volume.addEventListener('input', () => {
      audio.volume = Number(volume.value);
    });
  }

  render('paused');
}
