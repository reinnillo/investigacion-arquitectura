// Validación estructural de un folder de investigación de arquitectura.
// Única fuente de verdad del formato: la usan validar.mjs (CLI) y evaluacion.mjs (puntuación).

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, sep, basename } from 'node:path';

export const ID = '[A-Z][A-Z0-9]{1,5}-[A-Z][A-Z0-9]{1,4}-\\d+[A-Z]?';
export const MARKER_RE = new RegExp(`<!--\\s*@(${ID})\\s*-->`, 'g');
export const ROW_ID_RE = new RegExp(`^\\|\\s*\`(${ID})\`\\s*\\|`);
export const EVIDENCE_RE = /\[(P|S|A)(?:[,\]\s])/;
export const IGNORED_DIRS = new Set(['comparaciones', 'comparisons', '.git', 'node_modules']);
const SOURCES_RE = /^(fuentes|sources)\.md$/i;

export function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!IGNORED_DIRS.has(name)) walk(full, acc);
    } else acc.push(full);
  }
  return acc;
}

// Líneas fuera de bloques ``` con su número; `text` sin `código en línea`.
export function proseLines(text) {
  const out = [];
  let fenced = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return; }
    if (!fenced) out.push({ n: i + 1, raw: line, text: line.replace(/`[^`]*`/g, '``') });
  });
  return out;
}

export function slug(heading) {
  return heading.trim().toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

export function headingSlugs(text) {
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

// Filas de tablas Markdown fuera de bloques de código, agrupadas con su cabecera.
export function tableRows(text) {
  const out = [];
  let header = null;
  for (const { n, raw } of proseLines(text)) {
    if (!raw.trim().startsWith('|')) { header = null; continue; }
    const cells = raw.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (!header) { header = { cells, n }; continue; }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    out.push({ n, raw, cells, header });
  }
  return out;
}

// Sección de un Markdown cuyo título cumple `re`, hasta el siguiente título de su nivel o superior.
export function section(text, re) {
  const lines = text.split(/\r?\n/);
  let start = -1, level = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.*)$/);
    if (!m) continue;
    if (start < 0 && re.test(m[2])) { start = i; level = m[1].length; continue; }
    if (start >= 0 && m[1].length <= level) return lines.slice(start, i).join('\n');
  }
  return start >= 0 ? lines.slice(start).join('\n') : '';
}

// Rutas del árbol dibujado en el primer bloque de código con ├── / └── de un README.
export function treeFromReadme(text) {
  const files = new Set();
  let inFence = false, saw = false;
  const stack = [];
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (!inFence) continue;
    const m = line.match(/^([│ \t]*)(├──|└──)\s*([^\s←#]+)/);
    if (!m) continue;
    saw = true;
    const depth = Math.round(m[1].replace(/\t/g, '    ').length / 4);
    const name = m[3];
    stack.length = depth;
    if (name.endsWith('/')) { stack[depth] = name.slice(0, -1); continue; }
    files.add([...stack.slice(0, depth), name].join('/'));
  }
  return saw ? files : null;
}

export function loadFolder(root) {
  const abs = resolve(root);
  const files = walk(abs);
  const mdFiles = files.filter((f) => f.endsWith('.md'));
  const rel = (p) => relative(abs, p).split(sep).join('/');
  const texts = new Map(mdFiles.map((f) => [f, readFileSync(f, 'utf8')]));
  const indexPath = join(abs, 'INDEX.md');
  const readmePath = join(abs, 'README.md');
  const sourcesPath = mdFiles.find((f) => dirname(f) === abs && SOURCES_RE.test(basename(f)));
  return { root: abs, files, mdFiles, texts, rel, indexPath, readmePath, sourcesPath };
}

export function validar(root) {
  const errors = [];
  const warnings = [];
  const markers = new Map(); // id -> [{file, line}]
  const rows = new Map(); // id -> {line, cells, header}
  let linkCount = 0;

  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return { ok: false, errors: [`${root} no es un directorio.`], warnings, markers, rows, summary: { ids: 0, markers: 0, files: 0, links: 0 } };
  }
  const F = loadFolder(root);
  const { texts, rel, indexPath, readmePath, sourcesPath, mdFiles } = F;
  const done = () => ({
    ok: !errors.length, errors, warnings, markers, rows, folder: F,
    summary: { ids: rows.size, markers: markers.size, files: mdFiles.length, links: linkCount },
  });

  if (!texts.has(indexPath)) errors.push('Falta INDEX.md en la raíz del folder.');
  if (!texts.has(readmePath)) errors.push('Falta README.md en la raíz del folder.');
  if (!sourcesPath) errors.push('Falta fuentes.md (o sources.md) en la raíz del folder.');
  if (errors.length) return done();

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
  for (const { n, raw, cells, header } of tableRows(indexText)) {
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
  const allIds = [...markers.keys(), ...rows.keys()];
  const prefixes = new Set(allIds.map((id) => id.split('-')[0]));
  if (prefixes.size > 1) errors.push(`Hay varios prefijos de ID (${[...prefixes].join(', ')}); un folder usa uno.`);
  for (const area of new Set(allIds.map((id) => id.split('-').slice(0, 2).join('-')))) {
    if (!indexText.includes(`\`${area}\``)) warnings.push(`El área ${area} no aparece como \`${area}\` en la tabla de áreas de INDEX.md.`);
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
  const tree = treeFromReadme(texts.get(readmePath));
  if (!tree) {
    errors.push('README.md no tiene el árbol del folder (bloque ``` con ├── / └──).');
  } else {
    const real = new Set(mdFiles.map(rel));
    for (const f of real) if (!tree.has(f)) errors.push(`${f} existe pero no está en el árbol de README.md.`);
    for (const f of tree) if (!real.has(f)) errors.push(`El árbol de README.md lista ${f}, que no existe.`);
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

  return done();
}
