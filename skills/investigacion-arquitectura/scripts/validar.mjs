#!/usr/bin/env node
// Valida un folder de investigación de arquitectura: IDs, marcadores, índice, enlaces, árbol y evidencia.
// Uso: node validar.mjs <folder> [--map] [--json]
//   --map   imprime ID → archivo:línea (para redactar o revisar INDEX.md)
//   --json  imprime el resultado como JSON
// Exit 0 si no hay errores (los avisos no fallan), 1 si los hay, 2 si el uso es incorrecto.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith('--'));
const wantMap = args.includes('--map');
const wantJson = args.includes('--json');
if (!root || !existsSync(root) || !statSync(root).isDirectory()) {
  console.error('Uso: node validar.mjs <folder> [--map] [--json]');
  process.exit(2);
}

const ID = '[A-Z][A-Z0-9]{1,5}-[A-Z][A-Z0-9]{1,4}-\\d+[A-Z]?';
const MARKER_RE = new RegExp(`<!--\\s*@(${ID})\\s*-->`, 'g');
const ROW_ID_RE = new RegExp(`^\\|\\s*\`(${ID})\`\\s*\\|`);
const EVIDENCE_RE = /\[(P|S|A)(?:[,\]\s])/;
const IGNORED_DIRS = new Set(['comparaciones', 'comparisons', '.git', 'node_modules']);

const errors = [];
const warnings = [];
const markers = new Map(); // id -> [{file, line}]
const rows = new Map(); // id -> {line, cells}
let linkCount = 0;
const rel = (p) => relative(root, p).split(sep).join('/');

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!IGNORED_DIRS.has(name)) walk(full, acc);
    } else acc.push(full);
  }
  return acc;
}

// Devuelve las líneas fuera de bloques ``` con su número, y sin `código en línea`.
function proseLines(text) {
  const out = [];
  let fenced = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return; }
    if (!fenced) out.push({ n: i + 1, raw: line, text: line.replace(/`[^`]*`/g, '``') });
  });
  return out;
}

function slug(heading) {
  return heading.trim().toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

function headingSlugs(text) {
  const seen = new Map();
  const slugs = new Set();
  for (const { raw } of proseLines(text)) {
    const m = raw.match(/^#{1,6}\s+(.*)$/);
    if (!m) continue;
    const base = slug(m[1]);
    const k = seen.get(base) ?? 0;
    slugs.add(k ? `${base}-${k}` : base);
    seen.set(base, k + 1);
  }
  return slugs;
}

const files = walk(root);
const mdFiles = files.filter((f) => f.endsWith('.md'));
const indexPath = join(root, 'INDEX.md');
const readmePath = join(root, 'README.md');
const sourcesPath = mdFiles.find((f) => resolve(dirname(f)) === resolve(root) && /^(fuentes|sources)\.md$/i.test(f.split(sep).pop()));

for (const [p, what] of [[indexPath, 'INDEX.md'], [readmePath, 'README.md']]) {
  if (!existsSync(p)) errors.push(`Falta ${what} en la raíz del folder.`);
}
if (!sourcesPath) errors.push('Falta fuentes.md (o sources.md) en la raíz del folder.');
if (errors.length) report();

const texts = new Map(mdFiles.map((f) => [f, readFileSync(f, 'utf8')]));

// 1. Marcadores fuera de INDEX.md: cada ID exactamente una vez.
for (const [f, text] of texts) {
  if (f === indexPath) continue;
  for (const { n, raw } of proseLines(text)) {
    for (const m of raw.matchAll(MARKER_RE)) {
      if (!markers.has(m[1])) markers.set(m[1], []);
      markers.get(m[1]).push({ file: rel(f), line: n });
    }
  }
}
for (const [id, locs] of markers) {
  if (locs.length > 1) errors.push(`${id} tiene ${locs.length} marcadores: ${locs.map((l) => `${l.file}:${l.line}`).join(', ')}.`);
}

// 2. Filas del índice: cada ID una fila, con su marcador; columnas coherentes.
const indexText = texts.get(indexPath);
let header = null;
for (const { n, raw } of proseLines(indexText)) {
  if (!raw.trim().startsWith('|')) { header = null; continue; }
  const cells = raw.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  if (!header) { header = { cells, n }; continue; }
  if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
  if (cells.length !== header.cells.length) {
    errors.push(`INDEX.md:${n} tiene ${cells.length} columnas y su cabecera (línea ${header.n}) ${header.cells.length}.`);
  }
  const m = raw.trim().match(ROW_ID_RE);
  if (!m) continue;
  const id = m[1];
  if (rows.has(id)) errors.push(`${id} tiene dos filas en INDEX.md (líneas ${rows.get(id).line} y ${n}).`);
  rows.set(id, { line: n, cells, header: header.cells });
  const evCol = header.cells.findIndex((h) => /^ev\.?$|^evidencia$|^evidence$/i.test(h));
  if (evCol >= 0) {
    const ev = cells[evCol];
    if (!/^(—|-|[PSA](\/[PSA])*)$/.test(ev)) errors.push(`INDEX.md:${n} (${id}): evidencia «${ev}» no es P, S, A, una combinación con «/» o «—».`);
  }
  cells.forEach((c, i) => { if (!c) errors.push(`INDEX.md:${n} (${id}): la columna «${header.cells[i]}» está vacía; usa «—» si no aplica.`); });
}
if (!rows.size) errors.push('INDEX.md no tiene filas de conceptos (filas que empiezan con | `PFX-ÁREA-n` |).');
for (const [id, r] of rows) {
  if (!markers.has(id)) errors.push(`${id} está en INDEX.md:${r.line} pero no tiene marcador <!-- @${id} --> en el folder.`);
}
for (const [id, locs] of markers) {
  if (!rows.has(id)) errors.push(`${id} tiene marcador en ${locs[0].file}:${locs[0].line} pero no tiene fila en INDEX.md.`);
}

// 3. Prefijo único y áreas declaradas en el índice.
const prefixes = new Set([...markers.keys(), ...rows.keys()].map((id) => id.split('-')[0]));
if (prefixes.size > 1) errors.push(`Hay varios prefijos de ID (${[...prefixes].join(', ')}); un folder usa uno.`);
const areas = new Set([...markers.keys(), ...rows.keys()].map((id) => id.split('-').slice(0, 2).join('-')));
for (const area of areas) {
  if (!new RegExp(`\`${area}\``).test(indexText)) warnings.push(`El área ${area} no aparece como \`${area}\` en la tabla de áreas de INDEX.md.`);
}

// 4. Enlaces relativos y anclas.
const slugCache = new Map();
const slugsOf = (p) => { if (!slugCache.has(p)) slugCache.set(p, headingSlugs(readFileSync(p, 'utf8'))); return slugCache.get(p); };
for (const [f, text] of texts) {
  for (const { n, text: line } of proseLines(text)) {
    for (const m of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:)/i.test(target)) continue;
      linkCount++;
      const [pathPart, anchor] = target.split('#');
      const dest = pathPart ? resolve(dirname(f), decodeURI(pathPart)) : f;
      if (!existsSync(dest)) { errors.push(`${rel(f)}:${n}: enlace roto a ${target}.`); continue; }
      if (anchor && dest.endsWith('.md') && !slugsOf(dest).has(anchor.toLowerCase())) {
        errors.push(`${rel(f)}:${n}: el ancla #${anchor} no existe en ${rel(dest)}.`);
      }
    }
  }
}

// 5. El árbol de README.md coincide con los archivos reales.
const treeFiles = new Set();
let inFence = false, sawTree = false;
const stack = [];
for (const line of texts.get(readmePath).split(/\r?\n/)) {
  if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
  if (!inFence) continue;
  const m = line.match(/^([│ \t]*)(├──|└──)\s*([^\s←#]+)/);
  if (!m) continue;
  sawTree = true;
  const depth = Math.round(m[1].replace(/\t/g, '    ').length / 4);
  const name = m[3];
  stack.length = depth;
  if (name.endsWith('/')) { stack[depth] = name.slice(0, -1); continue; }
  treeFiles.add([...stack.slice(0, depth), name].join('/'));
}
if (!sawTree) {
  errors.push('README.md no tiene el árbol del folder (bloque ``` con ├── / └──).');
} else {
  const real = new Set(mdFiles.map(rel));
  for (const f of real) if (!treeFiles.has(f)) errors.push(`${f} existe pero no está en el árbol de README.md.`);
  for (const f of treeFiles) if (!real.has(f)) errors.push(`El árbol de README.md lista ${f}, que no existe.`);
}

// 6. Evidencia y cobertura (avisos).
for (const [f, text] of texts) {
  if (f === indexPath || f === sourcesPath) continue;
  const prose = proseLines(text).map((l) => l.raw).join('\n');
  const hasMarker = new RegExp(MARKER_RE.source).test(prose);
  if (!hasMarker) warnings.push(`${rel(f)} no tiene ningún marcador de concepto.`);
  if (hasMarker && !EVIDENCE_RE.test(prose.replace(/\*\*/g, ''))) warnings.push(`${rel(f)} tiene conceptos pero ninguna etiqueta de evidencia [P], [S] o [A].`);
}
const sourcesText = texts.get(sourcesPath);
if (!/^#{1,6}\s.*(descartad|discarded)/im.test(sourcesText)) warnings.push('fuentes.md no tiene la sección de afirmaciones descartadas.');
if (!/https?:\/\//.test(sourcesText)) errors.push('fuentes.md no tiene ninguna URL.');

report();

function report() {
  const summary = { ids: rows.size, markers: markers.size, files: mdFiles.length, links: linkCount };
  if (wantJson) {
    const map = Object.fromEntries([...markers].map(([id, l]) => [id, `${l[0].file}:${l[0].line}`]));
    console.log(JSON.stringify({ ok: !errors.length, summary, errors, warnings, ...(wantMap ? { map } : {}) }, null, 2));
  } else {
    if (wantMap) for (const id of [...markers.keys()].sort()) console.log(`${id}\t${markers.get(id)[0].file}:${markers.get(id)[0].line}`);
    console.log(`IDs en INDEX: ${summary.ids} · marcadores: ${summary.markers} · archivos .md: ${summary.files} · enlaces relativos: ${summary.links}`);
    for (const e of errors) console.log(`ERROR  ${e}`);
    for (const w of warnings) console.log(`AVISO  ${w}`);
    console.log(errors.length ? `✗ ${errors.length} error(es), ${warnings.length} aviso(s)` : `✓ válido (${warnings.length} aviso(s))`);
  }
  process.exit(errors.length ? 1 : 0);
}
