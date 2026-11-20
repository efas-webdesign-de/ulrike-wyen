// Mini-Build fuer die Ulrike-Wyen-Seite.
// Aktuell: Passthrough - kopiert die statische Seite 1:1 nach dist/.
// Spaeter: generiert Projekte/Blog/FAQ/Ueber-mich aus content/ zu HTML.
//
// Kein Framework, nur Node-Standardbibliothek (+ spaeter 'marked' fuer Markdown).

import { readdirSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');

// Diese Eintraege gehoeren NICHT in die veroeffentlichte Seite:
const BLOCK = new Set([
  'dist', 'node_modules', '.git', 'content',
  'build.mjs', 'package.json', 'package-lock.json',
  '.gitignore', 'netlify.toml', 'README.md', '.DS_Store',
]);

// 1) dist/ frisch anlegen
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// 2) Alle statischen Dateien/Ordner 1:1 uebernehmen (Passthrough)
let copied = 0;
for (const entry of readdirSync(root)) {
  if (BLOCK.has(entry)) continue;
  cpSync(join(root, entry), join(dist, entry), { recursive: true });
  copied++;
}

console.log(`Build fertig: ${copied} Eintraege nach dist/ kopiert (Passthrough).`);
