// Entry point: loads the book, routes between the cover and chapters, and
// tracks reading position.
//
// Routes:  #/                  cover
//          #/<part>/<chapter>  a chapter (both 1-based)

import { SOURCE_URL } from './config.js';
import { load, save } from './storage.js';
import { initPrefs } from './prefs.js';
import { parseBook } from './book.js';
import { chapterHref, chapterHtml, coverHtml, escapeHtml, shortTitle } from './views.js';
import { initToc, markCurrentChapter, renderToc, setTocOpen, toggleToc } from './toc.js';

const DEFAULT_TITLE = 'War and Peace Reader';
const CHAPTER_ROUTE = /^#\/(\d+)\/(\d+)$/;

const app = document.getElementById('app');
const where = document.getElementById('where');
const progress = document.getElementById('progress');

let book = null;
let current = null; // the chapter on screen, or null on the cover


// ---------- Views ----------

function showStatus(message) {
  app.innerHTML = `<div class="status">${escapeHtml(message)}</div>`;
}

function showCover() {
  current = null;
  markCurrentChapter(-1);
  document.title = DEFAULT_TITLE;
  where.innerHTML = `<b>${escapeHtml(book.title)}</b>`;
  progress.style.width = '0';

  const saved = load('pos');
  const resume = (saved && book.chapters[saved.g]) || null;
  app.innerHTML = coverHtml(book, resume);
  window.scrollTo(0, 0);
}

// `scrollFraction` (0–1) restores a saved position within the chapter.
function showChapter(chapter, scrollFraction = 0) {
  current = chapter;
  const part = book.parts[chapter.partIndex];

  markCurrentChapter(chapter.index);
  document.title = `${part.name}, Chapter ${chapter.numeral} · ${book.title}`;
  where.innerHTML = `<a href="#/">${escapeHtml(book.title)}</a> · <b>${shortTitle(book, chapter)}</b>`;
  app.innerHTML = chapterHtml(book, chapter);

  window.scrollTo(0, scrollFraction * Math.max(1, maxScroll()));
  savePosition();
}


// ---------- Reading position ----------

function maxScroll() {
  return document.documentElement.scrollHeight - window.innerHeight;
}

function currentScrollFraction() {
  const max = maxScroll();
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

// Saves the position as { g: chapter index, y: scroll fraction } and updates
// the whole-book progress bar.
function savePosition() {
  if (!current) return;

  const fraction = currentScrollFraction();
  save('pos', { g: current.index, y: fraction });

  const wordsRead = current.wordsBefore + current.words * fraction;
  progress.style.width = `${((wordsRead / book.words) * 100).toFixed(2)}%`;
}

// Saves at most once per animation frame while scrolling.
function watchScroll() {
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      savePosition();
    });
  }, { passive: true });
}


// ---------- Routing ----------

function route() {
  setTocOpen(false);

  const match = location.hash.match(CHAPTER_ROUTE);
  if (!match) {
    showCover();
    return;
  }

  const part = book.parts[Number(match[1]) - 1];
  const chapter = part && part.chapters[Number(match[2]) - 1];
  if (!chapter) {
    location.replace('#/');
    return;
  }

  // Restore the saved scroll position only when arriving fresh (page load or
  // from the cover), not when moving between chapters.
  const saved = load('pos');
  const restore = saved && saved.g === chapter.index && !current;
  showChapter(chapter, restore ? saved.y : 0);
}

function goToChapter(index) {
  const chapter = book.chapters[index];
  if (chapter) location.hash = chapterHref(chapter);
}


// ---------- Keyboard shortcuts ----------
//   c        toggle contents
//   Escape   close contents
//   ← / →    previous / next chapter

function onKeydown(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (/INPUT|TEXTAREA/.test(event.target.tagName)) return;

  if (event.key === 'Escape') setTocOpen(false);
  if (event.key === 'c') toggleToc();

  if (!current) return;
  if (event.key === 'ArrowRight') goToChapter(current.index + 1);
  if (event.key === 'ArrowLeft') goToChapter(current.index - 1);
}


// ---------- Startup ----------

async function start() {
  try {
    // no-cache revalidates against the ETag on every load, so edits on master
    // show up right away instead of after raw.githubusercontent's 5-minute max-age.
    const response = await fetch(SOURCE_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    book = parseBook(await response.text());
    if (!book.chapters.length) throw new Error('no chapters found');

    renderToc(book);
    window.addEventListener('hashchange', route);
    route();
  } catch (err) {
    showStatus(`Could not load the book (${err.message}).`);
  }
}

initPrefs();
initToc();
watchScroll();
window.addEventListener('keydown', onKeydown);
start();
