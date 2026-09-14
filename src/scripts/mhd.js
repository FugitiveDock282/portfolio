import { mulberry32, seedFromUrl, crtPalette, glowSprite, prefersReducedMotion } from './lib.js';

export function createMhdSimulation(canvas) {
  const ctx = canvas.getContext('2d');
  const reduceMotion = prefersReducedMotion();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rand = mulberry32(seedFromUrl());

  const MODE_COUNT = 20;
  const GLOW_DOWNSCALE = 3;
  const DENSITY_GAIN = 3;
  const BRIGHTNESS_GAIN = 0.6;
  const SETTLE_MS = 5000;
  const MAX_DISPLACEMENT = 0.6;

  let palette = crtPalette();
  let width = 0;
  let height = 0;
  let lastWidth = 0;
  let lastHeight = 0;
  let modes = [];
  let particles = [];
  let sprite = null;
  let glowCanvas = null;
  let glowCtx = null;
  let glowImage = null;
  let hxx = null;
  let hxy = null;
  let hyy = null;
  let glowWidth = 0;
  let glowHeight = 0;
  let displacementScale = 1;
  let rafId = null;
  let resizeTimer = null;
  let growth = 0;
  let lastTime = 0;

  function particleTarget() {
    return Math.max(200, Math.min(900, Math.round((width * height) / 700)));
  }

  function rebuildSprite() {
    sprite = glowSprite(palette);
  }

  function rebuildModes() {
    modes = [];
    const baseK = (Math.PI * 2) / Math.min(width, height);
    for (let i = 0; i < MODE_COUNT; i++) {
      const cycles = 0.7 + rand() * 2.1;
      const angle = rand() * Math.PI * 2;
      const magnitude = cycles * baseK;
      modes.push({
        kx: Math.cos(angle) * magnitude,
        ky: Math.sin(angle) * magnitude,
        amp: 1 / Math.pow(cycles, 1.5),
        phase: rand() * Math.PI * 2,
      });
    }
  }

  function displacementAt(x, y) {
    let dx = 0;
    let dy = 0;
    for (const m of modes) {
      const wave = Math.sin(m.kx * x + m.ky * y + m.phase);
      dx -= m.amp * m.kx * wave;
      dy -= m.amp * m.ky * wave;
    }
    return { dx, dy };
  }

  function buildGlowField() {
    const total = glowWidth * glowHeight;
    hxx = new Float32Array(total);
    hxy = new Float32Array(total);
    hyy = new Float32Array(total);
    for (let row = 0; row < glowHeight; row++) {
      const y = ((row + 0.5) / glowHeight) * height;
      for (let col = 0; col < glowWidth; col++) {
        const x = ((col + 0.5) / glowWidth) * width;
        let xx = 0;
        let xy = 0;
        let yy = 0;
        for (const m of modes) {
          const cosine = Math.cos(m.kx * x + m.ky * y + m.phase);
          xx -= m.amp * m.kx * m.kx * cosine;
          xy -= m.amp * m.kx * m.ky * cosine;
          yy -= m.amp * m.ky * m.ky * cosine;
        }
        const i = row * glowWidth + col;
        hxx[i] = xx;
        hxy[i] = xy;
        hyy[i] = yy;
      }
    }
    glowImage = glowCtx.createImageData(glowWidth, glowHeight);
  }

  function buildParticles() {
    particles = [];
    const count = particleTarget();
    for (let i = 0; i < count; i++) {
      const qx = rand() * width;
      const qy = rand() * height;
      const { dx, dy } = displacementAt(qx, qy);
      particles.push({
        qx,
        qy,
        dx,
        dy,
        size: 1 + rand() * 1.1,
        brightness: 0.14 + rand() * 0.3,
        phase: rand() * Math.PI * 2,
      });
    }
    let sum = 0;
    for (const p of particles) sum += p.dx * p.dx + p.dy * p.dy;
    const rms = Math.sqrt(sum / particles.length) || 1;
    displacementScale = (Math.min(width, height) * MAX_DISPLACEMENT) / rms;
  }

  function paint(now) {
    ctx.clearRect(0, 0, width, height);

    const stretch = displacementScale * growth;
    const data = glowImage.data;
    const { r: pr, g: pg, b: pb } = palette;

    for (let i = 0; i < hxx.length; i++) {
      const jxx = 1 + stretch * hxx[i];
      const jyy = 1 + stretch * hyy[i];
      const jxy = stretch * hxy[i];
      let determinant = jxx * jyy - jxy * jxy;
      if (determinant < 0) determinant = -determinant;
      if (determinant < 1e-4) determinant = 1e-4;
      let brightness = Math.log10(1 + Math.max(0, 1 / determinant - 1) * DENSITY_GAIN) * BRIGHTNESS_GAIN;
      if (brightness > 1) brightness = 1;
      const offset = i * 4;
      data[offset] = pr * brightness;
      data[offset + 1] = pg * brightness;
      data[offset + 2] = pb * brightness;
      data[offset + 3] = 255;
    }
    glowCtx.putImageData(glowImage, 0, 0);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.85;
    ctx.drawImage(glowCanvas, 0, 0, glowWidth, glowHeight, 0, 0, width, height);

    const t = now * 0.001;
    for (const p of particles) {
      const x = p.qx + p.dx * displacementScale * growth + Math.sin(t + p.phase) * 0.6;
      const y = p.qy + p.dy * displacementScale * growth + Math.cos(t * 0.9 + p.phase) * 0.6;
      ctx.globalAlpha = p.brightness * (0.25 + 0.6 * growth);
      ctx.drawImage(sprite, x - p.size, y - p.size, p.size * 2, p.size * 2);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.min(48, now - lastTime || 16);
    lastTime = now;
    growth += (1 - growth) * Math.min(1, dt / SETTLE_MS);
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
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    glowWidth = Math.max(1, Math.ceil(width / GLOW_DOWNSCALE));
    glowHeight = Math.max(1, Math.ceil(height / GLOW_DOWNSCALE));
    if (!glowCanvas) {
      glowCanvas = document.createElement('canvas');
      glowCtx = glowCanvas.getContext('2d');
    }
    glowCanvas.width = glowWidth;
    glowCanvas.height = glowHeight;

    rebuildSprite();
    rebuildModes();
    buildGlowField();
    buildParticles();

    if (reduceMotion) {
      growth = 1;
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
      if (growth === 0) growth = 1;
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
