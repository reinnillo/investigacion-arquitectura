// El evaluador puntúa 1 el fixture bueno y cada comprobación cae ante la clase de fallo que vigila.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, renameSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { evaluar } from '../../scripts/lib/evaluacion.mjs';
import { copia, editar, anexar, FIXTURES } from './ayuda.mjs';

const chk = (r, id) => r.checks.find((c) => c.id === id);
const CONTENIDO = ['README.md', '1-problema.md', '2-elementos/README.md', '2-elementos/aplicacion.md', '2-elementos/puertos.md',
  '2-elementos/adaptadores.md', '3-reglas.md', '4-compromisos.md'];

test('el fixture bueno puntúa 1 y aprueba', () => {
  const r = evaluar(join(FIXTURES, 'hexagonal-mini'));
  assert.equal(r.puntuacion, 1, r.checks.filter((c) => !c.aprobado).map((c) => `${c.id}: ${c.detalle}`).join('\n'));
  assert.equal(r.aprobado, true);
});

const mutaciones = [
  ['sin etiquetas de evidencia', (f) => CONTENIDO.forEach((p) => editar(f, p, (t) => t.replace(/\*\*\[[PSA][^\]]*\]\*\*/g, ''))), ['evidencia.densidad', 'evidencia.por-concepto']],
  ['sin fuentes primarias', (f) => editar(f, 'fuentes.md', (t) => t.replace(/(## Primarias[\s\S]*?)(## Secundarias)/, (m, a, b) => a.replace(/https?:\/\/[^)\s]+/g, 'x') + b)), ['evidencia.primarias']],
  ['relleno pendiente', (f) => anexar(f, '3-reglas.md', '\nTODO: completar esta sección.\n'), ['contenido.sin-relleno']],
  ['marcador de plantilla sin sustituir', (f) => anexar(f, '3-reglas.md', '\n- Ver <concepto> en su sección **[P]**.\n'), ['contenido.sin-relleno']],
  ['nombre con mayúsculas y tildes', (f) => { renameSync(join(f, '3-reglas.md'), join(f, '3-Reglas-Básicas.md')); }, ['estructura.nombres', 'estructura.valida']],
  ['más de tres niveles de carpetas', (f) => { mkdirSync(join(f, 'a', 'b', 'c', 'd'), { recursive: true }); writeFileSync(join(f, 'a', 'b', 'c', 'd', 'e.md'), '# e\n'); }, ['estructura.profundidad']],
  ['sin fechas', (f) => { editar(f, 'README.md', (t) => t.replace(/\d{4}-\d{2}-\d{2}/g, 'hoy')); editar(f, 'fuentes.md', (t) => t.replace(/\d{4}-\d{2}-\d{2}/g, 'hoy')); }, ['evidencia.fechas']],
  ['índice sin preguntas de comparación', (f) => editar(f, 'INDEX.md', (t) => t.replace(/\| (P|A|P\/S) \| ¿[^|]+\|/g, '| $1 | — |')), ['indice.comparable']],
  ['descartadas vacías', (f) => editar(f, 'fuentes.md', (t) => t.replace(/## Afirmaciones descartadas[\s\S]*$/, '## Afirmaciones descartadas\n<!-- @HEX-SRC-2 -->\n\nPor revisar.\n')), ['evidencia.descartadas']],
  ['cita demasiado larga', (f) => anexar(f, '3-reglas.md', `\n- *«${'palabra '.repeat(45).trim()}»* **[P]**.\n`), ['evidencia.citas']],
  ['README sin aviso para AIs', (f) => editar(f, 'README.md', (t) => t.replace('[INDEX.md](INDEX.md)', 'INDEX.md')), ['contenido.aviso-ai']],
  ['resumen de la arquitectura demasiado corto', (f) => editar(f, 'INDEX.md', (t) => t.replace(/^[3-6]\. .*\n/gm, '')), ['indice.resumen']],
];

for (const [nombre, mutar, ids] of mutaciones) {
  test(`detecta: ${nombre}`, () => {
    const c = copia();
    try {
      mutar(c.folder);
      const r = evaluar(c.folder);
      for (const id of ids) assert.equal(chk(r, id)?.aprobado, false, `${id} debería fallar: ${chk(r, id)?.detalle}`);
      assert.ok(r.puntuacion < 1);
    } finally { c.limpiar(); }
  });
}

test('una etiqueta en el título de la sección vale para el concepto del marcador que va debajo', () => {
  const c = copia();
  try {
    const sec = '\n## Ejemplo [P]\n<!-- @HEX-REG-3 -->\n\n| A | B |\n|---|---|\n| x | y |\n';
    anexar(c.folder, '3-reglas.md', sec);
    anexar(c.folder, 'INDEX.md', '\n| ID | Concepto (una línea) | Ev. | Uso |\n|---|---|---|---|\n| `HEX-REG-3` | Ejemplo | P | — |\n');
    assert.equal(chk(evaluar(c.folder), 'evidencia.por-concepto').aprobado, true);
    // Con un párrafo entre el título y el marcador, el título ya no es el de ese concepto.
    editar(c.folder, '3-reglas.md', (t) => t.replace('## Ejemplo [P]\n<!-- @HEX-REG-3 -->', '## Ejemplo [P]\n\nTexto previo.\n<!-- @HEX-REG-3 -->'));
    const r = chk(evaluar(c.folder), 'evidencia.por-concepto');
    assert.equal(r.aprobado, false);
    assert.match(r.detalle, /HEX-REG-3/);
  } finally { c.limpiar(); }
});

test('un archivo que se declara adaptación no cuenta para la densidad de evidencia', () => {
  const c = copia();
  try {
    anexar(c.folder, '4-compromisos.md', '\n- Una propuesta sin etiqueta.\n');
    const sin = chk(evaluar(c.folder), 'evidencia.densidad').valor;
    editar(c.folder, '4-compromisos.md', (t) => t.replace('# Compromisos', '# Compromisos\n\n> Adaptación de este folder **[A]**.'));
    const con = chk(evaluar(c.folder), 'evidencia.densidad').valor;
    assert.ok(con >= sin);
  } finally { c.limpiar(); }
});

test('expectativas: descartes, prohibidos, orden, idioma y conceptos', () => {
  const c = copia();
  try {
    const ok = evaluar(c.folder, {
      idioma: 'es',
      descartes: [{ nombre: 'seis puertos', patron: 'seis puertos' }],
      prohibidos: [{ nombre: 'seis puertos como regla', patron: 'tiene seis puertos' }],
      orden: ['HEX-PRO-1', 'HEX-ELE-2A', 'HEX-REG-1'],
      conceptos: [{ nombre: 'puertos', patron: 'puert' }],
      dominios_primarios: ['alistair.cockburn.us'],
    });
    for (const id of ['esperado.idioma', 'esperado.descartes', 'esperado.prohibidos', 'esperado.orden', 'esperado.conceptos', 'esperado.dominios-primarios']) {
      assert.equal(chk(ok, id).aprobado, true, `${id}: ${chk(ok, id).detalle}`);
    }
    // La frase falsa sólo está en descartadas: no cuenta como afirmada.
    assert.match(readFileSync(join(c.folder, 'fuentes.md'), 'utf8'), /tiene seis puertos/);

    anexar(c.folder, '3-reglas.md', '\n- Toda aplicación hexagonal tiene seis puertos **[P]**.\n');
    const mal = evaluar(c.folder, {
      idioma: 'en',
      descartes: [{ nombre: 'Google', patron: 'google' }],
      prohibidos: [{ nombre: 'seis puertos como regla', patron: 'tiene seis puertos' }],
      orden: ['HEX-REG-1', 'HEX-PRO-1'],
      conceptos: [{ nombre: 'sagas', patron: 'saga' }],
      dominios_primarios: ['kubernetes.io'],
    });
    for (const id of ['esperado.idioma', 'esperado.descartes', 'esperado.prohibidos', 'esperado.orden', 'esperado.conceptos', 'esperado.dominios-primarios']) {
      assert.equal(chk(mal, id).aprobado, false, `${id} debería fallar`);
    }
    assert.equal(mal.aprobado, false, 'afirmar una falsedad conocida es crítico');
    assert.ok(mal.criticos_fallidos.includes('esperado.prohibidos'));
  } finally { c.limpiar(); }
});

test('expectativas: IDs preservados, IDs nuevos, persistentes e intactos', () => {
  const c = copia({ conTienda: true });
  try {
    const ids = ['HEX-REG-1', 'HEX-REG-2'];
    const file = 'tienda/src/dominio/pedido.js';
    const sha = createHash('sha256').update(readFileSync(join(c.trabajo, file))).digest('hex');
    const esperado = { ids_preservados: ids, ids_nuevos_min: 1, persistentes: [file], intactos: [{ ruta: file, sha256: sha }] };
    const ok = evaluar(c.folder, esperado, { trabajo: c.trabajo });
    for (const id of ['esperado.ids-preservados', 'esperado.ids-nuevos', 'esperado.persistentes', 'esperado.intactos']) {
      assert.equal(chk(ok, id).aprobado, true, `${id}: ${chk(ok, id).detalle}`);
    }
    editar(c.folder, '3-reglas.md', (t) => t.replace('<!-- @HEX-REG-2 -->', '<!-- @HEX-REG-3 -->'));
    editar(c.folder, 'INDEX.md', (t) => t.replace('`HEX-REG-2`', '`HEX-REG-3`'));
    writeFileSync(join(c.trabajo, file), '// cambiado\n');
    const mal = evaluar(c.folder, { ...esperado, ids_preservados: ['HEX-REG-2'], persistentes: ['no-existe.md'] }, { trabajo: c.trabajo });
    for (const id of ['esperado.ids-preservados', 'esperado.persistentes', 'esperado.intactos']) {
      assert.equal(chk(mal, id).aprobado, false, `${id} debería fallar`);
    }
    assert.equal(mal.aprobado, false);
  } finally { c.limpiar(); }
});

test('expectativas: la comparación exige filas con estado, referencias reales y los hallazgos esperados', () => {
  const c = copia({ conTienda: true });
  try {
    mkdirSync(join(c.folder, 'comparaciones'));
    const filas = (ref, estado) => [
      '| ID | Estado | Evidencia en el sistema | Brecha | Mejora propuesta |', '|---|---|---|---|---|',
      `| HEX-REG-1 | ${estado} | ${ref} | el dominio importa infra | invertir la dependencia |`,
      '| HEX-ELE-3A | FALTA | test/pedido.test.js:3 | usa el archivo real | adaptador en memoria |',
      '| HEX-ELE-2B | PARCIAL | src/puertos/repositorio-pedidos.js:1 | sin implementación | implementar |',
    ].join('\n');
    const spec = { comparacion: { archivo: 'comparaciones/*.md', sistema: 'tienda', filas_min: 3,
      esperados: [{ id: 'HEX-REG-1', estados: ['FALTA'] }, { id: 'HEX-ELE-3A', estados: ['FALTA', 'PARCIAL'] }] } };
    writeFileSync(join(c.folder, 'comparaciones', 'tienda.md'), `# Comparación\n\n${filas('src/dominio/pedido.js:2', 'FALTA')}\n`);
    const ok = chk(evaluar(c.folder, spec, { trabajo: c.trabajo }), 'esperado.comparacion');
    assert.equal(ok.aprobado, true, ok.detalle);

    writeFileSync(join(c.folder, 'comparaciones', 'tienda.md'), `# Comparación\n\n${filas('src/dominio/pedido.js:999', 'TIENE')}\n`);
    const mal = chk(evaluar(c.folder, spec, { trabajo: c.trabajo }), 'esperado.comparacion');
    assert.equal(mal.aprobado, false);
    assert.match(mal.detalle, /2\/3 referencias/);
    assert.match(mal.detalle, /fallan: HEX-REG-1/);

    rmSync(join(c.folder, 'comparaciones'), { recursive: true });
    assert.equal(chk(evaluar(c.folder, spec, { trabajo: c.trabajo }), 'esperado.comparacion').valor, 0);
  } finally { c.limpiar(); }
});
