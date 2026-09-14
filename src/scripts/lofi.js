const button = document.getElementById('lofi-toggle');
const audio = document.getElementById('lofi-audio');
const icon = button?.querySelector('[data-lofi-icon]');

const PLAY_ICON = '\uF04B';
const PAUSE_ICON = '\uF04C';
const BUFFER_ICON = '\uF254';

function render(state) {
  if (!button || !icon) return;
  const playing = state === 'playing';
  const buffering = state === 'buffering';
  button.setAttribute('aria-pressed', String(playing));
  button.setAttribute(
    'aria-label',
    buffering ? 'Buffering lofi radio' : playing ? 'Pause lofi radio' : 'Play lofi radio'
  );
  button.title = button.getAttribute('aria-label') ?? '';
  icon.textContent = buffering ? BUFFER_ICON : playing ? PAUSE_ICON : PLAY_ICON;
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

  render('paused');
}
