export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromUrl() {
  const raw = new URLSearchParams(window.location.search).get('seed');
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? (Math.random() * 0xffffffff) >>> 0 : parsed >>> 0;
}

export function hexToRgb(hex) {
  let value = (hex || '').trim().replace('#', '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = Number.parseInt(value, 16);
  if (Number.isNaN(n)) return { r: 168, g: 255, b: 96 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function crtPalette() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--crt-color');
  return hexToRgb(value || '#a8ff60');
}

export function glowSprite(palette, size = 32) {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext('2d');
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  const { r: red, g: green, b: blue } = palette;
  gradient.addColorStop(0, `rgba(${red},${green},${blue},1)`);
  gradient.addColorStop(0.4, `rgba(${red},${green},${blue},0.3)`);
  gradient.addColorStop(1, `rgba(${red},${green},${blue},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function typeText(element, text, speed = 35) {
  return new Promise((resolve) => {
    let index = 0;
    (function tick() {
      if (index < text.length) {
        element.textContent += text.charAt(index++);
        setTimeout(tick, speed);
      } else {
        resolve();
      }
    })();
  });
}

export function readFlag(key) {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writeFlag(key) {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* storage unavailable */
  }
}

