// The slide-out contents drawer.

import { chapterHref, escapeHtml } from './views.js';

const tocEl = document.getElementById('toc');

export function isTocOpen() {
  return document.body.classList.contains('toc-open');
}

// Opening the drawer expands the current part and scrolls to the current chapter.
export function setTocOpen(open) {
  document.body.classList.toggle('toc-open', open);
  if (!open) return;

  const current = tocEl.querySelector('[aria-current="true"]');
  if (current) {
    current.closest('details').open = true;
    current.scrollIntoView({ block: 'center' });
  }
}

export function toggleToc() {
  setTocOpen(!isTocOpen());
}

export function renderToc(book) {
  tocEl.innerHTML = book.parts.map((part) => {
    const links = part.chapters.map((chapter) => {
      const title = escapeHtml(`${part.name}, Chapter ${chapter.numeral}`);
      return `<a href="${chapterHref(chapter)}" data-index="${chapter.index}" title="${title}">${chapter.numeral}</a>`;
    }).join('');

    return `
      <details>
        <summary>${escapeHtml(part.name)}<span>${escapeHtml(part.years)}</span></summary>
        <div class="chapters">${links}</div>
      </details>`;
  }).join('');
}

// Highlights the chapter at `index`; pass -1 to clear the highlight.
export function markCurrentChapter(index) {
  for (const link of tocEl.querySelectorAll('a[aria-current]')) {
    link.removeAttribute('aria-current');
  }
  const link = tocEl.querySelector(`a[data-index="${index}"]`);
  if (link) link.setAttribute('aria-current', 'true');
}

export function initToc() {
  document.getElementById('toc-button').addEventListener('click', toggleToc);
  document.getElementById('close-toc').addEventListener('click', () => setTocOpen(false));
  document.getElementById('scrim').addEventListener('click', () => setTocOpen(false));

  // Close the drawer once a chapter is picked.
  tocEl.addEventListener('click', (event) => {
    if (event.target.closest('a')) setTocOpen(false);
  });
}
