import './theme.js';
import { runLogin, loginNeeded } from './login.js';
import { typeText, wait, prefersReducedMotion } from './lib.js';

const workspace = document.getElementById('workspace');
const login = document.getElementById('login');
const terminal = document.getElementById('terminal');
const scrollArea = terminal?.querySelector('.terminal-scroll');

const fileButtons = [...document.querySelectorAll('#sidebar [data-file]')];
const fileMeta = new Map(fileButtons.map((el) => [el.dataset.file, el.dataset.path]));
const idByPath = new Map(fileButtons.map((el) => [el.dataset.path, el.dataset.file]));

const reduceMotion = prefersReducedMotion();

const simLoaders = {
  mhd: () => import('./mhd.js').then((mod) => mod.createMhdSimulation),
  dynamo: () => import('./dynamo.js').then((mod) => mod.createDynamoSimulation),
};
const simState = new Map();

let activeId = null;
let navToken = 0;

function idFromLocation() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (!raw) return 'about';
  return idByPath.get(raw) ?? (fileMeta.has(raw) ? raw : 'about');
}

function sectionFor(id) {
  return document.querySelector(`.file-view[data-file="${id}"]`);
}

function show(id) {
  document.querySelectorAll('.file-view').forEach((section) => {
    section.hidden = section.dataset.file !== id;
  });
  fileButtons.forEach((button) => {
    const isActive = button.dataset.file === id;
    button.classList.toggle('active', isActive);
    if (isActive) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
}

function focusPrompt(section) {
  const input = section?.querySelector('.prompt-input');
  if (input) input.focus({ preventScroll: true });
}

function deactivateSim(name) {
  const controller = simState.get(name);
  if (controller) controller.stop();
}

async function activateSim(name, token) {
  const section = document.querySelector(`.file-view[data-sim="${name}"]`);
  const canvas = section?.querySelector('canvas');
  if (!canvas) return;

  let controller = simState.get(name);
  if (!controller) {
    const create = await simLoaders[name]();
    if (token !== navToken) return;
    controller = create(canvas);
    simState.set(name, controller);
  }
  controller.start();
}

async function navigate(id, push = true) {
  const target = fileMeta.has(id) ? id : 'about';
  if (activeId === target) {
    closeDrawer();
    return;
  }

  const previous = activeId;
  activeId = target;
  const token = ++navToken;

  if (previous) {
    const prevSection = sectionFor(previous);
    if (prevSection?.dataset.sim) deactivateSim(prevSection.dataset.sim);
  }

  const section = sectionFor(target);
  if (!section) return;

  const cmdEl = section.querySelector('.cmd');
  const cmdLine = section.querySelector('.cmd-line');
  const reveal = section.querySelector('.file-reveal');
  const path = fileMeta.get(target);

  cmdEl.textContent = '';
  cmdLine.classList.remove('typed');
  reveal.classList.remove('revealed');

  show(target);
  if (push) history.pushState({ id: target }, '', `#${path}`);
  closeDrawer();
  if (scrollArea) scrollArea.scrollTop = 0;

  if (reduceMotion) {
    cmdEl.textContent = `cat ${path}`;
    cmdLine.classList.add('typed');
    reveal.classList.add('revealed');
  } else {
    await typeText(cmdEl, `cat ${path}`, 28);
    if (token !== navToken) return;
    cmdLine.classList.add('typed');
    await wait(120);
    reveal.classList.add('revealed');
  }

  focusPrompt(section);

  if (section.dataset.sim) {
    await activateSim(section.dataset.sim, token);
    if (token !== navToken) deactivateSim(section.dataset.sim);
  }
}

function closeDrawer() {
  document.body.classList.remove('drawer-open');
}

function startSession() {
  if (workspace) workspace.hidden = false;
  document.body.classList.add('session-active');
  navigate(idFromLocation(), false);
}

function finishLogin(instant) {
  if (login) {
    login.classList.add('done');
    if (instant) login.hidden = true;
    else setTimeout(() => (login.hidden = true), 300);
  }
  startSession();
}

document.getElementById('sidebar')?.addEventListener('click', (event) => {
  const dirButton = event.target.closest('[data-dir]');
  if (dirButton) {
    const node = dirButton.closest('.tree-dir');
    const open = node?.classList.toggle('open');
    dirButton.setAttribute('aria-expanded', String(open));
    return;
  }
  const fileButton = event.target.closest('[data-file]');
  if (fileButton) navigate(fileButton.dataset.file);
});

document.getElementById('drawer-toggle')?.addEventListener('click', () => {
  document.body.classList.toggle('drawer-open');
});

document.getElementById('drawer-backdrop')?.addEventListener('click', closeDrawer);

terminal?.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const path = decodeURIComponent(link.getAttribute('href').slice(1));
  const id = idByPath.get(path);
  if (id) {
    event.preventDefault();
    navigate(id);
  }
});

const PROMPT = 'fug@portfolio:~/portfolio$';

function resolveFile(argument) {
  const clean = argument.replace(/^\.\//, '');
  if (idByPath.has(clean)) return idByPath.get(clean);
  if (idByPath.has(`${clean}.md`)) return idByPath.get(`${clean}.md`);
  if (fileMeta.has(clean)) return clean;
  return null;
}

function printShellLine(history, text, className) {
  const line = document.createElement('div');
  line.className = className;
  line.textContent = text;
  history.append(line);
}

function runShellCommand(input) {
  const section = input.closest('.file-view');
  const history = section.querySelector('.prompt-history');
  const raw = input.value;
  input.value = '';

  const echo = document.createElement('div');
  echo.className = 'prompt-echo';
  const promptSpan = document.createElement('span');
  promptSpan.className = 'prompt';
  promptSpan.textContent = PROMPT;
  const cmdSpan = document.createElement('span');
  cmdSpan.className = 'cmd';
  cmdSpan.textContent = raw;
  echo.append(promptSpan, cmdSpan);
  history.append(echo);
  input.scrollIntoView({ block: 'nearest' });

  const trimmed = raw.trim();
  if (!trimmed) return;

  const [command, ...args] = trimmed.split(/\s+/);
  if (command === 'clear') {
    sectionFor('about')?.querySelector('.prompt-history')?.replaceChildren();
    navigate('about');
    return;
  }

  if (command === 'cat') {
    const target = args[0];
    if (!target) {
      printShellLine(history, 'cat: missing operand', 'prompt-error');
      return;
    }
    const id = resolveFile(target);
    if (id) {
      navigate(id);
      return;
    }
    printShellLine(history, `cat: ${target}: No such file or directory`, 'prompt-error');
    return;
  }

  printShellLine(history, `${command}: command not found`, 'prompt-error');
}

const COMMANDS = ['cat', 'clear'];
const allPaths = [...idByPath.keys()];

function pathCandidates(token) {
  const slash = token.lastIndexOf('/');
  const dir = slash >= 0 ? token.slice(0, slash + 1) : '';
  const entries = new Set();
  for (const path of allPaths) {
    if (dir) {
      if (!path.startsWith(dir)) continue;
      const rest = path.slice(dir.length);
      const cut = rest.indexOf('/');
      entries.add(dir + (cut >= 0 ? rest.slice(0, cut + 1) : rest));
    } else {
      const cut = path.indexOf('/');
      entries.add(cut >= 0 ? path.slice(0, cut + 1) : path);
    }
  }
  return [...entries].filter((entry) => entry.startsWith(token)).sort();
}

function commonPrefix(items) {
  let prefix = items[0];
  for (const item of items) {
    while (prefix && !item.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

function completePrompt(input) {
  const history = input.closest('.file-view').querySelector('.prompt-history');
  const value = input.value;
  const spaceIndex = value.lastIndexOf(' ');
  const before = spaceIndex >= 0 ? value.slice(0, spaceIndex + 1) : '';
  const token = spaceIndex >= 0 ? value.slice(spaceIndex + 1) : value;
  const firstWord = before.trim().split(/\s+/)[0] ?? '';

  let candidates;
  if (spaceIndex < 0) {
    candidates = COMMANDS.filter((command) => command.startsWith(token));
  } else if (firstWord === 'cat') {
    candidates = pathCandidates(token);
  } else {
    candidates = [];
  }

  if (candidates.length === 0) return;

  if (candidates.length === 1) {
    const only = candidates[0];
    input.value = before + only + (only.endsWith('/') ? '' : ' ');
    return;
  }

  const prefix = commonPrefix(candidates);
  if (prefix.length > token.length) {
    input.value = before + prefix;
    return;
  }
  printShellLine(history, candidates.join('   '), 'prompt-candidates');
}

terminal?.addEventListener('keydown', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.classList.contains('prompt-input')) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    runShellCommand(input);
  } else if (event.key === 'Tab') {
    event.preventDefault();
    completePrompt(input);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDrawer();
});

window.addEventListener('popstate', () => navigate(idFromLocation(), false));

if (loginNeeded()) {
  runLogin({
    cmdEl: document.getElementById('login-cmd'),
    banner: document.getElementById('login-banner'),
    cursor: document.getElementById('login-cursor'),
    onComplete: () => finishLogin(false),
  });
} else {
  finishLogin(true);
}
