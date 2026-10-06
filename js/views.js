// HTML builders for the cover and chapter pages. These return strings and
// don't touch the DOM.

import { REPO, WORDS_PER_MINUTE } from './config.js';

export function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Escapes text and turns Gutenberg's double hyphens into em dashes.
function typeset(s) {
  return escapeHtml(s).replace(/--/g, '—');
}

export function chapterHref(chapter) {
  return `#/${chapter.partIndex + 1}/${chapter.indexInPart + 1}`;
}

// "Book One, Ch. IV"
export function shortTitle(book, chapter) {
  return `${escapeHtml(book.parts[chapter.partIndex].name)}, Ch. ${chapter.numeral}`;
}

function partLabel(part) {
  return part.years ? `${part.name}: ${part.years}` : part.name;
}

function readingTime(words) {
  const minutes = words / WORDS_PER_MINUTE;
  return minutes / 60 >= 1.5
    ? `${Math.round(minutes / 60)} hours`
    : `${Math.max(1, Math.round(minutes))} min`;
}


// ---------- Chapter text ----------

// Splits lines into blank-line-separated blocks.
function toBlocks(lines) {
  const blocks = [];
  let block = [];
  for (const line of lines) {
    if (line.trim()) {
      block.push(line.trimEnd());
    } else if (block.length) {
      blocks.push(block);
      block = [];
    }
  }
  if (block.length) blocks.push(block);
  return blocks;
}

// A block whose lines are all indented is verse, or a footnote if it starts
// with "*". Everything else is a regular paragraph.
function blockHtml(block) {
  const indented = block.every((line) => /^\s/.test(line));
  const joined = () => typeset(block.map((line) => line.trim()).join(' '));

  if (indented && /^\s*\*/.test(block[0])) {
    return `<p class="note">${joined()}</p>`;
  }
  if (indented) {
    return `<p class="verse">${block.map((line) => typeset(line.trim())).join('\n')}</p>`;
  }
  return `<p>${joined()}</p>`;
}

function proseHtml(lines) {
  return toBlocks(lines).map(blockHtml).join('');
}


// ---------- Cover page ----------

function partCardHtml(part) {
  const words = part.chapters.reduce((sum, chapter) => sum + chapter.words, 0);
  const years = part.years ? `${escapeHtml(part.years)} · ` : '';
  return `
    <a href="${chapterHref(part.chapters[0])}">
      <b>${escapeHtml(part.name)}</b>
      <span>${years}${part.chapters.length} chapters · ${readingTime(words)}</span>
    </a>`;
}

// `resume` is the chapter the reader last had open, or null.
export function coverHtml(book, resume) {
  const first = book.chapters[0];

  const actions = resume
    ? `<a class="primary" href="${chapterHref(resume)}">Continue · ${escapeHtml(book.parts[resume.partIndex].name)}, Chapter ${resume.numeral} →</a>
       <a class="secondary" href="${chapterHref(first)}">Start from the beginning</a>`
    : `<a class="primary" href="${chapterHref(first)}">Start reading →</a>`;

  return `
    <section class="cover">
      <div class="kicker">An “americanized” edition</div>
      <h1>${escapeHtml(book.title)}</h1>
      <p class="by">${escapeHtml(book.author)}</p>
      <p class="blurb">
        Tolstoy’s novel of Russia during the Napoleonic wars, with a few “enhancements” of our own.
        Pick up where you left off, or start in a Petersburg drawing room in July 1805.
      </p>

      <div class="stats">
        <span>${book.parts.length} parts</span>
        <span>${book.chapters.length} chapters</span>
        <span>${Math.round(book.words / 1000)}k words</span>
        <span>about ${readingTime(book.words)} of reading</span>
      </div>

      <div class="cta">${actions}</div>

      <h2>Contents</h2>
      <div class="parts">${book.parts.map(partCardHtml).join('')}</div>

      <p class="foot">
        Text from the Project Gutenberg edition of the Louise and Aylmer Maude translation,
        edited in <a href="https://github.com/${REPO}">${REPO}</a>. Public domain in the U.S.
      </p>
    </section>`;
}


// ---------- Chapter page ----------

function chapterNavHtml(book, chapter) {
  const prev = book.chapters[chapter.index - 1];
  const next = book.chapters[chapter.index + 1];

  const prevLink = prev
    ? `<a class="prev" href="${chapterHref(prev)}"><small>← Previous</small>${shortTitle(book, prev)}</a>`
    : '';
  const nextLink = next
    ? `<a class="next" href="${chapterHref(next)}"><small>Next →</small>${shortTitle(book, next)}</a>`
    : `<a class="next" href="#/"><small>The end</small>Back to the cover</a>`;

  return `<nav class="nav">${prevLink}${nextLink}</nav>`;
}

export function chapterHtml(book, chapter) {
  const part = book.parts[chapter.partIndex];
  return `
    <article class="chapter">
      <p class="part">${escapeHtml(partLabel(part))}</p>
      <h1>Chapter ${chapter.numeral}</h1>
      <div class="prose">${proseHtml(chapter.lines)}</div>
    </article>
    ${chapterNavHtml(book, chapter)}`;
}
