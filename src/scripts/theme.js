const root = document.documentElement;
const toggle = document.getElementById('theme-toggle');

function activeTheme() {
  return root.dataset.theme === 'amber' ? 'amber' : 'lime';
}

if (toggle) {
  toggle.addEventListener('click', () => {
    const next = activeTheme() === 'amber' ? 'lime' : 'amber';
    root.dataset.theme = next;
    window.dispatchEvent(new CustomEvent('theme:change', { detail: { theme: next } }));
  });
}
