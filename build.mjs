// Mini-Build fuer die Ulrike-Wyen-Seite - kein Framework.
// Deps: marked (Markdown), js-yaml (Frontmatter), image-size (Bildmasse).
//
// Ablauf:
//   1) Passthrough: statische Seite 1:1 nach dist/.
//   2) Blog:     content/blog/*.md       -> dist/blog/...
//   3) Projekte: content/projekte/*.md   -> dist/projekte.html (Uebersicht + Detailseiten)

import {
  readdirSync, rmSync, mkdirSync, cpSync,
  readFileSync, writeFileSync, existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';
import yaml from 'js-yaml';
import { imageSize } from 'image-size';

const root = process.cwd();
const dist = join(root, 'dist');

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

// Text-Inhalt: nur & und < maskieren (HTML-Content-Regeln).
function escText(s = '') { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
// Attributwert: & und " maskieren.
function escAttr(s = '') { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
// Fuer Blog (grob, reicht dort).
function escapeHtml(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
// Wurzel-relativer Pfad -> seiten-relativ (projekte.html liegt im Root).
function relSrc(p = '') { return String(p).replace(/^\//, ''); }

function parseFront(raw) {
  const m = raw.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  let data = {};
  try { data = yaml.load(m[1]) || {}; } catch (e) { data = {}; }
  return { data, body: m[2] };
}

// Bildmasse (gecacht). Pfad ist wurzel-relativ (/assets/...).
const dimCache = new Map();
function imgDims(src) {
  const rel = relSrc(src);
  if (dimCache.has(rel)) return dimCache.get(rel);
  let d = null;
  try {
    const abs = join(root, rel);
    if (existsSync(abs)) { const r = imageSize(readFileSync(abs)); d = { w: r.width, h: r.height }; }
  } catch (e) { /* ignorieren */ }
  dimCache.set(rel, d);
  return d;
}
function dimAttr(src) {
  const d = imgDims(src);
  return d ? ` width="${d.w}" height="${d.h}"` : '';
}

/* ---------------- Layout (base.html) ---------------- */

const base = readFileSync(join(root, 'src', 'base.html'), 'utf8');
function page({ title, description, robots = '', content, active = '' }) {
  let html = base
    .replace('{{TITLE}}', () => escapeHtml(title))
    .replace('{{DESCRIPTION}}', () => escapeHtml(description))
    .replace('{{ROBOTS}}', () => (robots ? `\n<meta name="robots" content="${robots}">` : ''))
    .replace('{{CONTENT}}', () => content);
  if (active === 'blog') {
    html = html.replace("<li><a href='/blog'>Blog</a></li>", '<li><a href=\'/blog\' aria-current="page">Blog</a></li>');
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
    let date = data.date || '';
    if (date instanceof Date) date = date.toISOString().slice(0, 10);
    posts.push({
      slug: slugify(data.slug || file.replace(/\.md$/, '')),
      title: data.title || 'Ohne Titel',
      date: String(date),
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

/* ---------------- 3) Projekte ---------------- */

const GROUP_ORDER = ['Privat', 'Praxen', 'Gewerblich'];

function loadProjects() {
  const dir = join(root, 'content', 'projekte');
  if (!existsSync(dir)) return [];
  const projects = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const { data, body } = parseFront(readFileSync(join(dir, file), 'utf8'));
    projects.push({
      id: data.id || ('proj-' + file.replace(/\.md$/, '')),
      group: data.group || '',
      order: Number(data.order) || 99,
      title: data.title || '',
      card_title: data.card_title || data.title || '',
      location: data.location || '',
      thumb: normUrl(data.thumb || ''),
      thumb_alt: data.thumb_alt || data.title || '',
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
      details: Array.isArray(data.details) ? data.details : [],
      description: (data.description != null ? String(data.description) : (body || '')).trim(),
    });
  }
  return projects;
}

function orderedProjects(projects) {
  const out = [];
  for (const group of GROUP_ORDER) {
    out.push(...projects.filter(p => p.group === group).sort((a, b) => a.order - b.order));
  }
  return out;
}

function imgTag(im) {
  const cls = im && im.plan ? 'class="plan" ' : '';
  return `<img ${cls}src="${relSrc(im.src)}" alt="${escAttr(im.alt || '')}"${dimAttr(im.src)} decoding="async" loading="lazy">`;
}

function galleryRow(row) {
  const imgs = Array.isArray(row.images) ? row.images : [];
  if (row.layout === 'full') {
    return `    <div class="row full">${imgs.map(imgTag).join('')}</div>`;
  }
  return `    <div class="row half">\n${imgs.map(im => '      ' + imgTag(im)).join('\n')}\n    </div>`;
}

function detailSection(p) {
  const loc = p.location ? `\n    <div class="loc">${escText(p.location)}</div>` : '';
  const rt = p.description ? `\n    <div class="rt"><p>${escText(p.description)}</p></div>` : '';
  const rows = p.gallery.map(galleryRow).join('\n');
  const dls = (p.details || []).map(g =>
    `    <dl>\n${(g.entries || []).map(f => `      <dt>${escText(f.label)}</dt><dd>${escText(f.value)}</dd>`).join('\n')}\n    </dl>`,
  ).join('\n');
  return `<section class="projektseite" id="${p.id}">
  <a class="ps-back" href='#uebersicht'><span class="arrow">&larr;</span> Zurück zur Projekte-Übersicht</a>
  <div class="ps-head">
    <h1>${escText(p.title)}</h1>${loc}${rt}
  </div>
  <div class="ps-gallery">
${rows}
  </div>
  <div class="ps-details">
${dls}
  </div>
</section>`;
}

function overviewCard(p, idx) {
  const lazy = idx > 3 ? ' loading="lazy"' : '';
  return `      <a class="proj-card" href="#${p.id}">
      <div class="thumb"><img src="${relSrc(p.thumb)}" alt="${escAttr(p.thumb_alt)}"${dimAttr(p.thumb)} decoding="async"${lazy}></div>
      <div class="meta"><h3>${escText(p.card_title)}</h3></div></a>`;
}

function genOverview(projects) {
  let idx = 0;
  return GROUP_ORDER.map(group => {
    const items = projects.filter(p => p.group === group).sort((a, b) => a.order - b.order);
    const cards = items.map(p => overviewCard(p, ++idx)).join('\n');
    return `    <div class="proj-group">
      <div class="group-label">${group}</div>
      <div class="proj-grid">
${cards}
      </div>
    </div>`;
  }).join('\n\n');
}

function buildProjekte(projects) {
  let html = readFileSync(join(root, 'projekte.html'), 'utf8');
  const details = orderedProjects(projects).map(detailSection).join('\n');
  html = html.replace('<!--PROJ_GROUPS-->', () => genOverview(projects));
  html = html.replace('<!--PROJ_DETAILS-->', () => details);
  writeFileSync(join(dist, 'projekte.html'), html);
}

const projects = loadProjects();
if (projects.length) buildProjekte(projects);

/* ---------------- 4) Startseite (index.html): FAQ, Ueber mich ---------------- */

function loadYmlFile(name) {
  const f = join(root, 'content', name);
  if (!existsSync(f)) return null;
  try { return yaml.load(readFileSync(f, 'utf8')); } catch (e) { return null; }
}

function genFaq(items) {
  const list = items.map((it, i) => `        <li>
          <button type="button" class="faq-q" aria-expanded="${i === 0 ? 'true' : 'false'}" aria-controls="faq-a-${i}">
            <span>${escText(it.question)}</span><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>
          </button>
          <div id="faq-a-${i}" class="faq-inline"${i === 0 ? '' : ' hidden'}><p>${escText(it.answer)}</p></div>
        </li>`).join('\n');
  const f0 = items[0] || { question: '', answer: '' };
  return `      <ul class="faq-list">
${list}
      </ul>
      <div class="faq-panel" aria-live="polite">
        <p class="faq-panel-label">Antwort</p>
        <h3 class="faq-panel-q">${escText(f0.question)}</h3>
        <p class="faq-panel-a">${escText(f0.answer)}</p>
        <div class="faq-by">
          <img class="faq-avatar" src="assets/img/avatar_ulrike.jpg" alt="Ulrike Wyen" width="160" height="160" decoding="async" loading="lazy">
          <div>
            <div class="faq-by-name">Ulrike Wyen</div>
            <div class="faq-by-role">Innenarchitektin, Köln</div>
          </div>
        </div>
      </div>`;
}

function genUeberMich(d) {
  const bodyP = (d.body || []).map(p => `      <p>${escText(typeof p === 'string' ? p : (p && p.text) || '')}</p>`).join('\n');
  const facts = (d.facts || []).map(f => `      <div class="fact">
        <h4>${escText(f.title)}</h4>
        <p>${escText(f.text)}</p>
      </div>`).join('\n');
  const vita = (d.vita || []).map(v => `    <div class="vita-row"><div class="yr">${escText(v.year)}</div><div class="desc">${escText(v.desc)}</div></div>`).join('\n');
  return `
  <div class="um-intro">
    <span class="eyebrow">Über mich</span>
    <h1>${escText(d.headline)}</h1>
    <p>${escText(d.lead)}</p>
    <div class="rt">
${bodyP}
    </div>
  </div>

  <div class="um-grid">
    <div class="photo"><img src="${relSrc(normUrl(d.portrait))}" alt="${escAttr(d.portrait_alt || '')}"${dimAttr(normUrl(d.portrait))} decoding="async" loading="lazy"></div>
    <div class="um-facts">
${facts}
    </div>
  </div>

  <div class="um-vita">
    <h2>${escText(d.vita_heading)}</h2>
${vita}
  </div>
`;
}

const RAIL_PREV = `      <button class="rail-nav prev" type="button" aria-label="Zurück">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3.5 5.5 8 10 12.5"/></svg>
      </button>`;
const RAIL_NEXT = `      <button class="rail-nav next" type="button" aria-label="Weiter">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>
      </button>`;

function homeCard(p, idx) {
  const lazy = idx > 3 ? ' loading="lazy"' : '';
  return `        <a class='proj-card' href='/projekte#${p.id}'>
      <div class="thumb"><img src="${relSrc(p.thumb)}" alt="${escAttr(p.thumb_alt)}"${dimAttr(p.thumb)} decoding="async"${lazy}></div>
      <div class="meta"><h3>${escText(p.card_title)}</h3></div></a>`;
}

function genHomeGroups(projectList) {
  let idx = 0;
  return GROUP_ORDER.map(group => {
    const items = projectList.filter(p => p.group === group).sort((a, b) => a.order - b.order);
    const cards = items.map(p => homeCard(p, ++idx)).join('\n');
    return `    <div class="proj-group">
      <div class="group-label">${group}</div>
      <div class="proj-rail">
${RAIL_PREV}
${RAIL_NEXT}
        <div class="rail-track">
${cards}
        </div>
      </div>
    </div>`;
  }).join('\n\n');
}

function buildIndex() {
  let html = readFileSync(join(root, 'index.html'), 'utf8');

  if (projects && projects.length) {
    html = html.replace(/(<div class="section-head">[\s\S]*?<\/div>\n)[\s\S]*?(\n  <div class="projekte-more">)/, (m, a, b) => a + '\n' + genHomeGroups(projects) + '\n' + b);
  }

  const faqData = loadYmlFile('faq.yml');
  const faq = faqData && Array.isArray(faqData.items) ? faqData.items : [];
  if (faq.length) {
    html = html.replace(/(<div class="faq-grid">)[\s\S]*?(\n    <\/div>)/, (m, a, b) => a + '\n' + genFaq(faq) + b);
  }

  const um = loadYmlFile('ueber-mich.yml');
  if (um) {
    html = html.replace(/(<section class="ueber-mich-voll"[^>]*>)[\s\S]*?(<\/section>)/, (m, a, b) => a + genUeberMich(um) + b);
    const teaserLines = um.teaser ? String(um.teaser).split('\n').map(l => l.trim()).filter(Boolean) : [];
    if (teaserLines.length) {
      html = html.replace(/(<div class="about-text">\s*<span class="eyebrow">Über mich<\/span>\s*)<p>[\s\S]*?<\/p>/, (m, a) => a + `<p>${teaserLines.map(escText).join('<br>')}</p>`);
    }
  }

  writeFileSync(join(dist, 'index.html'), html);
}
buildIndex();

/* ---------------- 5) Impressum / Datenschutz: Kontaktdaten ---------------- */

function buildLegal() {
  const s = loadYmlFile('einstellungen.yml');
  if (!s) return;
  const firma = escText(s.firma || '');
  const name = escText(s.name || '');
  const adr = (s.adresse || []).map(l => escText(l));
  const tel = escText(s.telefon || '');
  const mob = escText(s.mobil || '');
  const emailEsc = escText(s.email || '');
  const emailAttr = escAttr(s.email || '');
  const ust = String(s.ust_id || '').trim();

  const addressP = `<p>${[firma, name, ...adr].join('<br>\n    ')}</p>`;
  const kontaktP = `<p>Telefon: ${tel}<br>\n    Mobil: ${mob}<br>\n    E-Mail: <a href="mailto:${emailAttr}">${emailEsc}</a></p>`;
  const dsP = `<p>${[firma, name, ...adr].join('<br>\n    ')}<br>\n    Telefon: ${tel}<br>\n    E-Mail: <a href="mailto:${emailAttr}">${emailEsc}</a></p>`;

  let imp = readFileSync(join(root, 'impressum.html'), 'utf8');
  imp = imp.replace(/(<h2>Angaben gemäß § 5 TMG<\/h2>\s*)<p>[\s\S]*?<\/p>/, (m, a) => a + addressP);
  imp = imp.replace(/(<h2>Kontakt<\/h2>\s*)<p>[\s\S]*?<\/p>/, (m, a) => a + kontaktP);
  if (ust) imp = imp.replace('[USt-IdNr. eintragen]', escText(ust));
  writeFileSync(join(dist, 'impressum.html'), imp);

  let ds = readFileSync(join(root, 'datenschutz.html'), 'utf8');
  ds = ds.replace(/(Verantwortlich für die Datenverarbeitung auf dieser Website ist:<\/p>\s*)<p>[\s\S]*?<\/p>/, (m, a) => a + dsP);
  writeFileSync(join(dist, 'datenschutz.html'), ds);
}
buildLegal();

console.log(`Build fertig: Passthrough + Blog (${posts.length}) + Projekte (${projects.length}) + Startseite + Rechtliches.`);
