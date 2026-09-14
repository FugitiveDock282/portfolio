import { typeText, wait, prefersReducedMotion, readFlag, writeFlag } from './lib.js';

export const LOGIN_FLAG = 'sshSessionStarted';
export const SSH_COMMAND = 'ssh fug@portfolio -i ~/.ssh/portfolio';

export function loginNeeded() {
  return !prefersReducedMotion() && !readFlag(LOGIN_FLAG);
}

export async function runLogin({ cmdEl, banner, cursor, onComplete }) {
  if (!loginNeeded()) {
    onComplete();
    return;
  }
  writeFlag(LOGIN_FLAG);

  await typeText(cmdEl, SSH_COMMAND, 55);
  await wait(400);

  banner.hidden = false;
  banner.classList.add('visible');
  if (cursor) cursor.hidden = true;

  await wait(1000);
  onComplete();
}
