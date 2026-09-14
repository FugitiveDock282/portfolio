import { mulberry32, seedFromUrl, crtPalette, glowSprite, prefersReducedMotion } from './lib.js';

export function createDynamoSimulation(canvas) {
  const ctx = canvas.getContext('2d');
  const reduceMotion = prefersReducedMotion();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rand = mulberry32(seedFromUrl());

  const ARM_COUNT = 4;
  const SPIRAL_TIGHTNESS = 1.5;
  const PATTERN_SPEED = 0.00016;
  const DISK_TILT = 0.6;
  const COLLAPSE_RATE = 0.00009;

  let palette = crtPalette();
  let width = 0;
  let height = 0;
  let lastWidth = 0;
  let lastHeight = 0;
  let cx = 0;
  let cy = 0;
  let radius = 0;
  let particles = [];
  let fieldStars = [];
  let sprite = null;
  let rafId = null;
  let resizeTimer = null;
  let formation = 0;
  let lastTime = 0;

  function rebuildSprite() {
    sprite = glowSprite(palette);
  }

  function buildGalaxy() {
    particles = [];
    const count = Math.round(Math.min(2200, Math.max(700, (width * height) / 110)));
    for (let i = 0; i < count; i++) {
      const isBulge = rand() < 0.18;
      const startRadius = radius * (0.25 + rand() * 0.9);
      let targetRadius;
      if (isBulge) {
        targetRadius = Math.pow(rand(), 2) * radius * 0.14 + radius * 0.01;
      } else {
        targetRadius = -Math.log(1 - rand() * 0.985) * radius * 0.16;
      }
      targetRadius = Math.min(targetRadius, radius * 1.02);
      const arm = Math.floor(rand() * ARM_COUNT);
      particles.push({
        startRadius,
        targetRadius,
        startAngle: rand() * Math.PI * 2,
        armOffset: arm * ((Math.PI * 2) / ARM_COUNT) + (rand() - 0.5) * 0.5,
        scatter: (rand() - 0.5) * 0.7,
        size: isBulge ? 2.4 + rand() * 1.4 : 1.2 + rand() * 1.1,
        brightness: isBulge ? 0.75 + rand() * 0.25 : 0.35 + rand() * 0.5,
      });
    }

    fieldStars = Array.from({ length: 60 }, () => ({
      x: rand() * width,
      y: rand() * height,
      alpha: 0.04 + rand() * 0.16,
      size: 0.6 + rand() * 0.9,
    }));
  }

  function paint(now) {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = `rgb(${palette.r},${palette.g},${palette.b})`;
    for (const star of fieldStars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    const coreRadius = radius * 0.55;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
    glow.addColorStop(0, `rgba(${palette.r},${palette.g},${palette.b},${0.18 * formation})`);
    glow.addColorStop(1, `rgba(${palette.r},${palette.g},${palette.b},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(cx - coreRadius, cy - coreRadius, coreRadius * 2, coreRadius * 2);

    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      const r = p.targetRadius + (p.startRadius - p.targetRadius) * (1 - formation);
      const target = p.armOffset + Math.log(r + 24) * SPIRAL_TIGHTNESS + PATTERN_SPEED * now;
      const angle = p.startAngle + (target - p.startAngle) * formation + p.scatter * (1 - formation);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r * DISK_TILT;
      const size = p.size * (0.5 + 0.5 * formation);
      ctx.globalAlpha = p.brightness * (0.3 + 0.7 * formation);
      ctx.drawImage(sprite, x - size, y - size, size * 2, size * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.min(48, now - lastTime || 16);
    lastTime = now;
    formation = Math.min(1, formation + dt * COLLAPSE_RATE);
    paint(now);
    rafId = requestAnimationFrame(frame);
  }

  function resize() {
    const w = canvas.clientWidth || 640;
    const h = canvas.clientHeight || 360;
    if (w === lastWidth && h === lastHeight) return;
    lastWidth = w;
    lastHeight = h;
    width = w;
    height = h;
    cx = width / 2;
    cy = height / 2;
    radius = Math.min(width, height) * 0.42;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    rebuildSprite();
    buildGalaxy();

    if (reduceMotion) {
      formation = 1;
      paint(0);
    }
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function start() {
    resize();
    if (reduceMotion) {
      formation = 1;
      paint(0);
      return;
    }
    if (rafId === null) {
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
    }
  }

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  };

  let observer = null;
  if (window.ResizeObserver) {
    observer = new ResizeObserver(onResize);
    observer.observe(canvas);
  } else {
    window.addEventListener('resize', onResize);
  }

  const onVisibility = () => {
    if (document.hidden) stop();
    else if (!reduceMotion) start();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const onTheme = () => {
    palette = crtPalette();
    rebuildSprite();
    if (reduceMotion) paint(0);
  };
  window.addEventListener('theme:change', onTheme);

  function destroy() {
    stop();
    clearTimeout(resizeTimer);
    if (observer) observer.disconnect();
    else window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('theme:change', onTheme);
  }

  return { start, stop, resize, destroy };
}
