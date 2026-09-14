import { crtPalette, prefersReducedMotion } from './lib.js';

const canvas = document.getElementById('starfield');

if (canvas) {
  const ctx = canvas.getContext('2d');
  const reduceMotion = prefersReducedMotion();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const STAR_COUNT = 120;

  let stars = [];
  let sprite = null;
  let rafId = null;
  let resizeTimer = null;

  const randomBetween = (min, max) => Math.random() * (max - min) + min;

  function makeSprite() {
    const palette = crtPalette();
    const size = 32;
    const s = document.createElement('canvas');
    s.width = s.height = size;
    const c = s.getContext('2d');
    const r = size / 2;
    const gradient = c.createRadialGradient(r, r, 0, r, r, r);
    const { r: red, g: green, b: blue } = palette;
    gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 1)`);
    gradient.addColorStop(0.35, `rgba(${red}, ${green}, ${blue}, 0.4)`);
    gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
    c.fillStyle = gradient;
    c.fillRect(0, 0, size, size);
    sprite = s;
  }

  function makeStars() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    stars = Array.from({ length: STAR_COUNT }, () => ({
      x: randomBetween(0, w),
      y: randomBetween(0, h),
      size: Math.random() * 1.3,
      speed: randomBetween(0.02, 0.15),
      alpha: randomBetween(0.1, 1),
      drift: Math.random() > 0.5 ? 1 : -1,
    }));
  }

  function resize() {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars();
  }

  function step() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const star of stars) {
      star.x -= star.speed;
      star.alpha += 0.005 * star.drift;
      if (star.alpha >= 1) {
        star.alpha = 1;
        star.drift = -1;
      } else if (star.alpha <= 0.1) {
        star.alpha = 0.1;
        star.drift = 1;
      }
      if (star.x < 0) {
        star.x = w;
        star.y = randomBetween(0, h);
        star.size = Math.random() * 1.3;
        star.speed = randomBetween(0.02, 0.15);
      }
    }
  }

  function paint() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const star of stars) {
      const diameter = star.size * 6 + 2;
      ctx.globalAlpha = star.alpha;
      ctx.drawImage(sprite, star.x - diameter / 2, star.y - diameter / 2, diameter, diameter);
    }
    ctx.globalAlpha = 1;
  }

  function loop() {
    step();
    paint();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (rafId === null) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function refresh() {
    resize();
    makeSprite();
    if (reduceMotion) {
      paint();
    } else {
      start();
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else if (!reduceMotion) {
      start();
    }
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      if (reduceMotion) paint();
    }, 150);
  });

  window.addEventListener('theme:change', () => {
    makeSprite();
    if (reduceMotion) paint();
  });

  refresh();
}
