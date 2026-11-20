// Mini-Build fuer die Ulrike-Wyen-Seite - kein Framework, nur Node + 'marked'.
//
// Ablauf:
//   1) Passthrough: statische Seite 1:1 nach dist/ kopieren.
//   2) Blog: content/blog/*.md -> dist/blog.html (Liste) + dist/blog/<slug>.html (Beitraege).
//
// Spaeter kommen Projekte / FAQ / Ueber-mich nach dem gleichen Muster dazu.

import {
  readdirSync, rmSync, mkdirSync, cpSync,
  readFileSync, writeFileSync, existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';

const root = process.cwd();
const dist = join(root, 'dist');

// Diese Eintraege gehoeren NICHT in die veroeffentlichte Seite:
const BLOCK = new Set([
  'dist', 'node_modules', '.git', 'content', 'src',
  'build.mjs', 'package.json', 'package-lock.json',
  '.gitignore', 'netlify.toml', 'README.md', '.DS_Store',
]);

/* ---------------- Helfer ---------------- */

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return String(iso);
  return `${d}. ${MONTHS[m - 1]} ${y}`;
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(s = '') {
  return s.toString().toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function normUrl(p = '') {
  if (!p) return '';
  if (/^https?:\/\//.test(p) || p.startsWith('/')) return p;
  return '/' + p.replace(/^\.?\//, '');
}

// Sehr einfacher Frontmatter-Parser (key: value zwischen --- Zeilen).
function parseFront(raw) {
  const m = raw.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    data[k] = v;
  }
  return { data, body: m[2] };
}

/* ---------------- Layout ---------------- */

const base = readFileSync(join(root, 'src', 'base.html'), 'utf8');

function page({ title, description, robots = '', content, active = '' }) {
  let html = base
    .replace('{{TITLE}}', () => escapeHtml(title))
    .replace('{{DESCRIPTION}}', () => escapeHtml(description))
    .replace('{{ROBOTS}}', () => (robots ? `\n<meta name="robots" content="${robots}">` : ''))
    .replace('{{CONTENT}}', () => content);
  if (active === 'blog') {
    html = html.replace(
      "<li><a href='/blog'>Blog</a></li>",
      '<li><a href=\'/blog\' aria-current="page">Blog</a></li>',
    );
  }
  return html;
}

/* ---------------- 1) Passthrough ---------------- */

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const entry of readdirSync(root)) {
  if (BLOCK.has(entry)) continue;
  cpSync(join(root, entry), join(dist, entry), { recursive: true });
}

/* ---------------- 2) Blog ---------------- */

function loadPosts() {
  const dir = join(root, 'content', 'blog');
  if (!existsSync(dir)) return [];
  const posts = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const { data, body } = parseFront(readFileSync(join(dir, file), 'utf8'));
    if (String(data.draft).toLowerCase() === 'true') continue;
    posts.push({
      slug: slugify(data.slug || file.replace(/\.md$/, '')),
      title: data.title || 'Ohne Titel',
      date: data.date || '',
      category: data.category || '',
      image: normUrl(data.image || ''),
      excerpt: data.excerpt || '',
      bodyHtml: marked.parse(body.trim()),
    });
  }
  posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return posts;
}

const PLACEHOLDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 15l-5-5L5 21"/></svg>';

function blogCard(p) {
  const thumb = p.image
    ? `<div class="thumb"><img src="${p.image}" alt="${escapeHtml(p.title)}"></div>`
    : `<div class="thumb">${PLACEHOLDER_ICON}</div>`;
  const cat = p.category ? `<span class="blog-cat">${escapeHtml(p.category)}</span>` : '';
  const ex = p.excerpt ? `<p>${escapeHtml(p.excerpt)}</p>` : '';
  return `    <a class="blog-card" href="/blog/${p.slug}">
      ${thumb}
      <div class="blog-meta">
        ${cat}
        <h2>${escapeHtml(p.title)}</h2>
        ${ex}
      </div>
    </a>`;
}

const PLACEHOLDER_CARDS = [
  ['Projekt', 'Ein neues Projekt', 'Bald zeige ich hier ein abgeschlossenes Projekt mit vielen Fotos und der Geschichte dahinter.'],
  ['Material &amp; Farbe', 'Lieblingsmaterialien', 'Welche Oberflächen, Farben und Stoffe mich gerade inspirieren, lesen Sie hier in Kürze.'],
  ['Hinter den Kulissen', 'Vom Entwurf zur Umsetzung', 'Ein Blick in meinen Arbeitsalltag, vom ersten Entwurf bis zum fertigen Raum, folgt bald.'],
].map(([cat, h, p]) => `    <article class="blog-card">
      <div class="thumb">
        <span class="soon-badge">In Vorbereitung</span>
        ${PLACEHOLDER_ICON}
      </div>
      <div class="blog-meta">
        <span class="blog-cat">${cat}</span>
        <h2>${h}</h2>
        <p>${p}</p>
      </div>
    </article>`).join('\n');

const posts = loadPosts();

const grid = posts.length ? posts.map(blogCard).join('\n') : PLACEHOLDER_CARDS;
const introTail = posts.length ? '' : ' Die ersten Beiträge folgen in Kürze.';

const blogList = `<section class="blog-page" id="blog">
  <div class="blog-head">
    <span class="eyebrow">Blog</span>
    <h1>Einblicke in meine Arbeit</h1>
    <p class="blog-intro">Hier teile ich Fotos und Beiträge aus meiner Arbeit als Innenarchitektin: abgeschlossene Projekte, Materialien und Ideen, die mich begeistern.${introTail}</p>
  </div>

  <div class="blog-grid">
${grid}
  </div>
</section>

<section class="erstgespraech">
  <h2>Mehr Inspiration auf Pinterest</h2>
  <p>Hier finden Sie weitere Bilder und Ideen auf meiner Pinnwand.</p>
  <a class="cta" href="https://www.pinterest.com/interior0655/" target="_blank" rel="noopener">Auf Pinterest ansehen <span class="arrow">&rarr;</span></a>
</section>`;

mkdirSync(join(dist, 'blog'), { recursive: true });
writeFileSync(join(dist, 'blog', 'index.html'), page({
  title: 'Blog · Ulrike Wyen Interior',
  description: 'Blog von Ulrike Wyen, Innenarchitektin in Köln. Fotos, Projekte und Ideen rund um gute Innenarchitektur.',
  robots: posts.length ? '' : 'noindex',
  content: blogList,
  active: 'blog',
}));

// Einzelne Beitragsseiten
for (const p of posts) {
  const cover = p.image ? `<img class="post-cover" src="${p.image}" alt="${escapeHtml(p.title)}">` : '';
  const meta = [
    p.category ? `<span class="post-cat">${escapeHtml(p.category)}</span>` : '',
    p.date ? `<time class="post-date">${formatDate(p.date)}</time>` : '',
  ].join('');
  const content = `<article class="blog-post">
  <a class="post-back" href="/blog"><span class="arrow">&larr;</span> Zurück zum Blog</a>
  <div class="post-head">
    <div class="post-meta">${meta}</div>
    <h1>${escapeHtml(p.title)}</h1>
  </div>
  ${cover}
  <div class="post-body">
${p.bodyHtml}
  </div>
</article>`;
  const outDir = join(dist, 'blog', p.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), page({
    title: `${p.title} · Blog · Ulrike Wyen Interior`,
    description: p.excerpt || p.title,
    content,
    active: 'blog',
  }));
}

console.log(`Build fertig: Passthrough + Blog (${posts.length} Beitrag/Beitraege).`);
