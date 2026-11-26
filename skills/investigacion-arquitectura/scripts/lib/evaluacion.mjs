// Puntuación de calidad de un folder de investigación de arquitectura.
// Parte de la validación estructural (validacion.mjs) y añade comprobaciones de calidad medibles y, si se dan,
// las expectativas de un caso de prueba (esperado.json). Cada comprobación devuelve un valor entre 0 y 1.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { validar, proseLines, tableRows, section, MARKER_RE, ROW_ID_RE } from './validacion.mjs';

export const UMBRAL = 0.85;
const TAG_RE = /\[(P|S|A)(?:[,\]\s])/;
const UPPER_OK = new Set(['README.md', 'INDEX.md', 'AGENTS.md', 'CLAUDE.md']);
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*(\.md)?$/;
const NO_COMPARABLE = new Set(['BIO', 'ORI', 'SRC']);
const ESTADOS = new Set(['TIENE', 'PARCIAL', 'FALTA', 'N/A', 'HAS', 'PARTIAL', 'MISSING']);
const STOP = {
  es: ['el', 'la', 'de', 'que', 'los', 'las', 'del', 'por', 'para', 'con', 'una', 'es'],
  en: ['the', 'of', 'and', 'to', 'is', 'that', 'for', 'with', 'are', 'it', 'an', 'be'],
};

const clamp = (x) => Math.max(0, Math.min(1, x));
const pct = (x) => `${Math.round(x * 100)} %`;
const strip = (s) => s.replace(/\*\*/g, '');

function check(id, categoria, peso, valor, detalle, { critico = false } = {}) {
  const v = clamp(valor);
  return { id, categoria, peso, valor: Math.round(v * 1000) / 1000, aprobado: v >= 0.999, critico, detalle };
}

// Una unidad de afirmación: un elemento de lista o una tabla entera. Devuelve [{file, n, tagged}].
function claimUnits(text) {
  const lines = proseLines(text);
  const units = [];
  let table = null, item = null, list = null;
  const prevTagged = (idx) => lines.slice(Math.max(0, idx - 3), idx).some((l) => TAG_RE.test(strip(l.raw)));
  const close = () => {
    if (!item) return;
    const content = item.body.replace(/\[([^\]]*)\]\([^)]*\)/g, '').replace(/[*_`\s.,;:—-]/g, '');
    // Se descartan los elementos que sólo enlazan (navegación) y los que encabezan una sublista («Salvedades:»).
    // Una lista cuya frase de entrada lleva etiqueta («…así funciona **[P]**:») la hereda en cada elemento.
    if (content && !/:\**\s*$/.test(item.body)) units.push({ n: item.n, tagged: list.lead || TAG_RE.test(strip(item.body)) });
    item = null;
  };
  lines.forEach((l, idx) => {
    const raw = l.raw.trim();
    if (raw.startsWith('|')) {
      close(); list = null;
      if (!table) { table = { n: l.n, tagged: prevTagged(idx) }; units.push(table); }
      if (TAG_RE.test(strip(raw))) table.tagged = true;
      return;
    }
    table = null;
    const m = raw.match(/^(?:[-*+]|\d+\.)\s+(.*)$/);
    if (m) { close(); if (!list) list = { lead: prevTagged(idx) }; item = { n: l.n, body: m[1] }; return; }
    if (item && raw && /^\s/.test(l.raw)) { item.body += ` ${raw}`; return; } // continuación del elemento
    close();
    if (raw) list = null; // una línea en blanco no corta la lista; un párrafo sí
  });
  close();
  return units;
}

// Texto de la sección de cada marcador: desde su línea hasta el siguiente marcador o título de igual o mayor nivel.
function markerSections(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let level = 0;
  lines.forEach((line, i) => {
    const h = line.match(/^(#{1,6})\s/);
    if (h) level = h[1].length;
    for (const m of line.matchAll(MARKER_RE)) {
      let j = i + 1;
      for (; j < lines.length; j++) {
        const hj = lines[j].match(/^(#{1,6})\s/);
        if ((hj && hj[1].length <= level) || new RegExp(MARKER_RE.source).test(lines[j])) break;
      }
      out.push({ id: m[1], text: lines.slice(i, j).join('\n') });
    }
  });
  return out;
}

function lang(text) {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  const count = (list) => words.filter((w) => list.includes(w)).length;
  const es = count(STOP.es), en = count(STOP.en);
  return { idioma: es >= en ? 'es' : 'en', es, en };
}

function re(p) { return new RegExp(p, 'iu'); }

export function evaluar(root, esperado = {}, { trabajo } = {}) {
  const v = validar(root);
  const checks = [];
  const umbral = esperado.umbral ?? UMBRAL;
  const base = { validacion: { ok: v.ok, errores: v.errors, avisos: v.warnings, resumen: v.summary } };
  checks.push(check('estructura.valida', 'estructura', 3, v.ok ? 1 : 0,
    v.ok ? 'el validador no da errores' : `${v.errors.length} error(es) del validador: ${v.errors.slice(0, 3).join(' | ')}`, { critico: true }));
  if (!v.folder) return finish();

  const F = v.folder;
  const content = [...F.texts].filter(([f]) => f !== F.indexPath && f !== F.sourcesPath);
  const indexText = F.texts.get(F.indexPath) ?? '';
  const readme = F.texts.get(F.readmePath) ?? '';
  const sources = F.sourcesPath ? F.texts.get(F.sourcesPath) : '';
  const discarded = section(sources, /descartad|discarded/i);

  // Estructura
  checks.push(check('estructura.avisos', 'estructura', 1, 1 - v.warnings.length / 5,
    v.warnings.length ? `${v.warnings.length} aviso(s): ${v.warnings.slice(0, 2).join(' | ')}` : 'sin avisos'));
  const rels = F.mdFiles.map(F.rel);
  const depth = Math.max(0, ...rels.map((r) => r.split('/').length - 1));
  checks.push(check('estructura.profundidad', 'estructura', 1, depth <= 3 ? 1 : 0, `profundidad máxima ${depth} (límite 3)`));
  const segments = [...new Set(rels.flatMap((r) => r.split('/')))];
  const badNames = segments.filter((s) => !UPPER_OK.has(s) && !NAME_RE.test(s));
  checks.push(check('estructura.nombres', 'estructura', 1, 1 - badNames.length / Math.max(1, segments.length),
    badNames.length ? `nombres fuera de formato (minúsculas, guiones, sin tildes): ${badNames.slice(0, 5).join(', ')}` : 'todos los nombres en formato'));

  // Índice
  const n = v.rows.size;
  const [min, max] = [esperado.ids_min ?? 15, esperado.ids_max ?? 80];
  checks.push(check('indice.granularidad', 'indice', 1, n < min ? n / min : n > max ? max / n : 1, `${n} IDs (rango ${min}–${max})`));
  const heads = proseLines(indexText).filter((l) => /^#{2,3}\s/.test(l.raw)).map((l) => l.raw);
  const wanted = [/protocol/i, /(arquitectura|architecture).*(l[ií]neas|lines)/i, /(áreas|areas)\b/i, /concept/i, /(plantilla|template).*compar/i];
  const found = wanted.filter((w) => heads.some((h) => w.test(h)));
  checks.push(check('indice.secciones', 'indice', 1, found.length / wanted.length,
    `${found.length}/5 secciones (protocolo, arquitectura en N líneas, áreas, conceptos, plantilla de comparación)`));
  const comparable = [...v.rows].filter(([id]) => !NO_COMPARABLE.has(id.split('-')[1]));
  let ok = 0;
  for (const [, r] of comparable) {
    const q = r.header.findIndex((h) => /pregunta|question/i.test(h));
    const s = r.header.findIndex((h) => /buscar|search/i.test(h));
    if (q >= 0 && s >= 0 && !/^[—-]$/.test(r.cells[q]) && !/^[—-]$/.test(r.cells[s])) ok++;
  }
  const ratio = comparable.length ? ok / comparable.length : 0;
  checks.push(check('indice.comparable', 'indice', 2, ratio / 0.7,
    `${ok}/${comparable.length} conceptos comparables con pregunta y términos de búsqueda (${pct(ratio)}; objetivo 70 %)`));
  const summary = section(indexText, /(arquitectura|architecture).*(l[ií]neas|lines)/i);
  const items = summary.split(/\r?\n/).filter((l) => /^\d+\.\s/.test(l)).length;
  checks.push(check('indice.resumen', 'indice', 0.5, items >= 6 && items <= 10 ? 1 : items >= 3 && items <= 12 ? 0.5 : 0,
    `la arquitectura en ${items} líneas (objetivo 6–10)`));

  // Evidencia
  // Un archivo que se declara adaptación en sus primeras líneas es propuesta del folder entera: no lleva afirmaciones ajenas.
  const isAdaptation = (t) => /\[A\]|adaptaci[oó]n de este folder|adaptation of this folder/i.test(t.split(/\r?\n/).slice(0, 8).join('\n'));
  const units = content.filter(([, t]) => !isAdaptation(t)).flatMap(([f, t]) => claimUnits(t).map((u) => ({ ...u, file: F.rel(f) })));
  const tagged = units.filter((u) => u.tagged).length;
  const dens = units.length ? tagged / units.length : 0;
  const untagged = units.filter((u) => !u.tagged).slice(0, 4).map((u) => `${u.file}:${u.n}`);
  checks.push(check('evidencia.densidad', 'evidencia', 3, dens / 0.8,
    `${tagged}/${units.length} afirmaciones con etiqueta (${pct(dens)}; objetivo 80 %)${untagged.length ? `; sin etiqueta: ${untagged.join(', ')}` : ''}`));
  const secs = content.flatMap(([f, t]) => markerSections(t).map((s) => ({ ...s, file: F.rel(f) })))
    .filter((s) => s.id.split('-')[1] !== 'SRC');
  const secOk = secs.filter((s) => TAG_RE.test(strip(s.text)));
  const secBad = secs.filter((s) => !TAG_RE.test(strip(s.text))).slice(0, 4).map((s) => s.id);
  checks.push(check('evidencia.por-concepto', 'evidencia', 2, secs.length ? secOk.length / secs.length : 0,
    `${secOk.length}/${secs.length} secciones de concepto con al menos una etiqueta${secBad.length ? `; sin etiqueta: ${secBad.join(', ')}` : ''}`));
  const primSec = section(sources, /primari|primary/i);
  const prim = (primSec.match(/https?:\/\/[^\s)]+/g) ?? []).length;
  checks.push(check('evidencia.primarias', 'evidencia', 2, prim >= 2 ? 1 : prim / 2, `${prim} URL(s) en fuentes primarias (mínimo 2)`));
  const dated = [readme, sources].filter((t) => /\b\d{4}-\d{2}-\d{2}\b/.test(t)).length;
  checks.push(check('evidencia.fechas', 'evidencia', 1, dated / 2, `${dated}/2 de README.md y fuentes.md llevan fecha AAAA-MM-DD`));
  const quotes = content.flatMap(([, t]) => [...t.matchAll(/«([^»]+)»/g)].map((m) => m[1]));
  const long = quotes.filter((q) => q.split(/\s+/).length > 40);
  checks.push(check('evidencia.citas', 'evidencia', 0.5, quotes.length ? 1 - long.length / quotes.length : 1,
    `${quotes.length} cita(s), ${long.length} de más de 40 palabras`));
  const discardRows = tableRows(discarded).length;
  checks.push(check('evidencia.descartadas', 'evidencia', 1, discardRows || /ningun|none/i.test(discarded) ? 1 : 0,
    discarded ? `${discardRows} afirmación(es) descartada(s)` : 'falta la sección de afirmaciones descartadas'));

  // Contenido
  checks.push(check('contenido.aviso-ai', 'contenido', 0.5, /\]\(INDEX\.md\)/.test(readme) ? 1 : 0, 'README.md enlaza a INDEX.md para AIs'));
  const filler = [...F.texts].filter(([, t]) => proseLines(t).some((l) =>
    /\b(TODO|TBD|FIXME)\b/.test(l.text) || /lorem ipsum|<…>|\[pendiente\]/i.test(l.text) ||/<[a-záéíóúñ][a-záéíóúñ -]*>/i.test(l.text.replace(/<!--.*?-->|<br\s*\/?>/g, ''))));
  const thin = content.filter(([, t]) => proseLines(t).filter((l) => l.raw.trim() && !/^#/.test(l.raw)).length < 3);
  const bad = new Set([...filler, ...thin].map(([f]) => F.rel(f)));
  checks.push(check('contenido.sin-relleno', 'contenido', 1, 1 - bad.size / Math.max(1, F.texts.size),
    bad.size ? `con marcadores de relleno o casi vacíos: ${[...bad].slice(0, 4).join(', ')}` : 'sin relleno ni archivos vacíos'));

  // Expectativas del caso
  const allContent = content.map(([, t]) => t).join('\n');
  if (esperado.idioma) {
    const l = lang(allContent);
    checks.push(check('esperado.idioma', 'esperado', 1, l.idioma === esperado.idioma ? 1 : 0, `idioma detectado ${l.idioma} (es ${l.es} / en ${l.en}); esperado ${esperado.idioma}`));
  }
  if (esperado.conceptos?.length) {
    const concepts = [...v.rows].map(([, r]) => r.cells[1] ?? '').join('\n');
    const hay = `${rels.join('\n')}\n${concepts}`;
    const miss = esperado.conceptos.filter((c) => !re(c.patron).test(hay)).map((c) => c.nombre);
    checks.push(check('esperado.conceptos', 'esperado', 2, 1 - miss.length / esperado.conceptos.length,
      miss.length ? `faltan en el árbol o en el índice: ${miss.join(', ')}` : `${esperado.conceptos.length} conceptos esperados presentes`));
  }
  if (esperado.dominios_primarios?.length) {
    const hit = esperado.dominios_primarios.filter((d) => primSec.includes(d));
    checks.push(check('esperado.dominios-primarios', 'esperado', 2, hit.length ? 1 : 0,
      hit.length ? `fuentes primarias incluyen ${hit.join(', ')}` : `ninguna fuente primaria de ${esperado.dominios_primarios.join(', ')}`));
  }
  if (esperado.descartes?.length) {
    const miss = esperado.descartes.filter((d) => !re(d.patron).test(discarded)).map((d) => d.nombre);
    checks.push(check('esperado.descartes', 'esperado', 3, 1 - miss.length / esperado.descartes.length,
      miss.length ? `no están en descartadas: ${miss.join(', ')}` : `${esperado.descartes.length} afirmaciones falsas descartadas`));
  }
  if (esperado.prohibidos?.length) {
    const outside = [allContent, indexText, sources.replace(discarded, '')].join('\n');
    const hits = esperado.prohibidos.filter((p) => re(p.patron).test(outside)).map((p) => p.nombre);
    checks.push(check('esperado.prohibidos', 'esperado', 3, hits.length ? 0 : 1,
      hits.length ? `afirma como cierto fuera de descartadas: ${hits.join(', ')}` : 'no afirma ninguna falsedad conocida', { critico: true }));
  }
  if (esperado.orden?.length) {
    const where = section(indexText, /concept/i) || indexText;
    let pos = -1, broken = null;
    for (const p of esperado.orden) {
      const m = re(p).exec(where.slice(pos + 1));
      if (!m) { broken = p; break; }
      pos = pos + 1 + m.index;
    }
    checks.push(check('esperado.orden', 'esperado', 1, broken ? 0 : 1,
      broken ? `orden roto o ausente en los conceptos de INDEX.md a partir de /${broken}/` : 'orden esperado respetado en los conceptos de INDEX.md'));
  }
  if (esperado.intactos?.length) {
    const base = trabajo ?? resolve(root, '..');
    const changed = esperado.intactos.filter(({ ruta, sha256 }) => {
      const p = join(base, ruta);
      return !existsSync(p) || createHash('sha256').update(readFileSync(p)).digest('hex') !== sha256;
    }).map((x) => x.ruta);
    checks.push(check('esperado.intactos', 'esperado', 1, changed.length ? 0 : 1,
      changed.length ? `se modificaron o borraron: ${changed.join(', ')}` : `${esperado.intactos.length} archivo(s) del sistema intactos`, { critico: true }));
  }
  if (esperado.persistentes?.length) {
    const gone = esperado.persistentes.filter((p) => !existsSync(join(trabajo ?? resolve(root, '..'), p)));
    checks.push(check('esperado.persistentes', 'esperado', 1, gone.length ? 0 : 1,
      gone.length ? `se borraron: ${gone.join(', ')}` : 'los archivos del usuario siguen ahí', { critico: true }));
  }
  if (esperado.ids_preservados?.length) {
    const lost = esperado.ids_preservados.filter((id) => !v.rows.has(id) || !v.markers.has(id));
    checks.push(check('esperado.ids-preservados', 'esperado', 2, 1 - lost.length / esperado.ids_preservados.length,
      lost.length ? `IDs perdidos o renumerados: ${lost.join(', ')}` : `${esperado.ids_preservados.length} IDs previos intactos`, { critico: true }));
    if (esperado.ids_nuevos_min) {
      const nuevos = [...v.rows.keys()].filter((id) => !esperado.ids_preservados.includes(id));
      checks.push(check('esperado.ids-nuevos', 'esperado', 1, nuevos.length / esperado.ids_nuevos_min,
        `${nuevos.length} ID(s) nuevo(s) (mínimo ${esperado.ids_nuevos_min}): ${nuevos.join(', ') || '—'}`));
    }
  }
  if (esperado.comparacion) checks.push(comparacion(root, esperado.comparacion, v, trabajo));
  return finish();

  function finish() {
    const total = checks.reduce((s, c) => s + c.peso, 0);
    const puntuacion = Math.round((checks.reduce((s, c) => s + c.peso * c.valor, 0) / total) * 1000) / 1000;
    const criticos = checks.filter((c) => c.critico && !c.aprobado).map((c) => c.id);
    return { puntuacion, umbral, aprobado: puntuacion >= umbral && !criticos.length, criticos_fallidos: criticos, checks, ...base };
  }
}

function comparacion(root, spec, v, trabajo) {
  const dir = join(root, 'comparaciones');
  let file = join(root, spec.archivo ?? '');
  if (!spec.archivo || spec.archivo.includes('*')) {
    const list = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
    file = list.length ? join(dir, list[0]) : '';
  }
  if (!file || !existsSync(file)) return check('esperado.comparacion', 'esperado', 3, 0, 'no se escribió el archivo de comparación');
  const text = readFileSync(file, 'utf8');
  const sys = resolve(trabajo ?? resolve(root, '..'), spec.sistema ?? '.');
  const rows = tableRows(text).filter((r) => r.cells.some((c) => ESTADOS.has(c.replace(/[`*]/g, '').toUpperCase())));
  const idsOk = rows.filter((r) => v.rows.has(r.cells[0].replace(/[`*]/g, ''))).length;
  const refs = rows.flatMap((r) => [...r.raw.matchAll(/([\w./\\-]+\.[a-z]{1,5}):(\d+)/gi)].map((m) => ({ path: m[1], line: +m[2] })));
  const refOk = refs.filter(({ path, line }) => {
    const candidates = [resolve(sys, path), resolve(sys, '..', path)];
    const hit = candidates.find((p) => existsSync(p) && statSync(p).isFile());
    return hit && line >= 1 && line <= readFileSync(hit, 'utf8').split(/\r?\n/).length;
  }).length;
  const min = spec.filas_min ?? 5;
  // Hallazgos que cualquier comparación correcta tiene que hacer (p. ej. la lógica importa la base de datos → FALTA).
  const esperados = spec.esperados ?? [];
  const wrong = esperados.filter(({ id, estados }) => {
    const row = rows.find((r) => r.cells[0].replace(/[`*]/g, '') === id);
    return !row || !row.cells.some((c) => estados.includes(c.replace(/[`*]/g, '').toUpperCase()));
  }).map((e) => `${e.id} (${e.estados.join('/')})`);
  const parts = [
    [0.3, Math.min(1, rows.length / min)],
    [0.1, rows.length ? idsOk / rows.length : 0],
    [0.3, refs.length ? refOk / refs.length : 0],
    [0.3, esperados.length ? 1 - wrong.length / esperados.length : 1],
  ];
  const valor = parts.reduce((s, [w, x]) => s + w * x, 0);
  return check('esperado.comparacion', 'esperado', 3, valor,
    `${basename(file)}: ${rows.length} filas con estado (mínimo ${min}), ${idsOk} con ID del índice, ${refOk}/${refs.length} referencias archivo:línea que existen` +
    (esperados.length ? `; hallazgos esperados ${esperados.length - wrong.length}/${esperados.length}${wrong.length ? ` (fallan: ${wrong.join(', ')})` : ''}` : ''));
}

export function formatear(r) {
  const lines = [`Puntuación: ${r.puntuacion} (umbral ${r.umbral}) → ${r.aprobado ? '✓ APROBADO' : '✗ NO APROBADO'}`];
  if (r.criticos_fallidos.length) lines.push(`Críticos fallidos: ${r.criticos_fallidos.join(', ')}`);
  for (const c of r.checks) lines.push(`${c.aprobado ? '✓' : '✗'} ${c.id.padEnd(28)} ${String(c.valor).padEnd(5)} ×${c.peso}  ${c.detalle}`);
  return lines.join('\n');
}
