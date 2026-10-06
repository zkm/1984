// Reading preferences: color theme and text size.

import { load, save } from './storage.js';

// null means "follow the system setting".
const THEMES = [null, 'sepia', 'dark', 'light'];

const MIN_SIZE = 14;
const MAX_SIZE = 28;
const DEFAULT_SIZE = 19;

const root = document.documentElement;

let theme = load('theme');
let size = load('size') || DEFAULT_SIZE;

function apply() {
  if (theme) {
    root.dataset.theme = theme;
  } else {
    delete root.dataset.theme;
  }
  root.style.setProperty('--size', `${size}px`);
}

function cycleTheme() {
  theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  save('theme', theme);
  apply();
}

function changeSize(delta) {
  size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, size + delta));
  save('size', size);
  apply();
}

export function initPrefs() {
  apply();
  document.getElementById('theme-button').addEventListener('click', cycleTheme);
  document.getElementById('smaller-text').addEventListener('click', () => changeSize(-1));
  document.getElementById('larger-text').addEventListener('click', () => changeSize(+1));
}
