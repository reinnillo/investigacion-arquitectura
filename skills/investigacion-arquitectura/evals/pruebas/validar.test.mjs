// El validador acepta el fixture bueno y rechaza cada clase de fallo con su mensaje.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { validar } from '../../scripts/lib/validacion.mjs';
import { copia, editar, anexar, FIXTURES } from './ayuda.mjs';

test('el fixture hexagonal-mini es válido y sin avisos', () => {
  const r = validar(join(FIXTURES, 'hexagonal-mini'));
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.summary.ids, 18);
  assert.equal(r.summary.markers, 18);
});

const mutaciones = [
  ['marcador duplicado', (f) => anexar(f, '3-reglas.md', '\n<!-- @HEX-ELE-1 -->\n'), /HEX-ELE-1 tiene 2 marcadores/],
  ['ID del índice sin marcador', (f) => editar(f, '3-reglas.md', (t) => t.replace('<!-- @HEX-REG-2 -->', '')), /HEX-REG-2 está en INDEX\.md.*no tiene marcador/],
  ['marcador sin fila en el índice', (f) => anexar(f, '3-reglas.md', '\n## Otra\n<!-- @HEX-REG-9 -->\n- Algo **[P]**.\n'), /HEX-REG-9 tiene marcador .* no tiene fila/],
  ['enlace roto', (f) => anexar(f, '3-reglas.md', '\n[x](no-existe.md)\n'), /enlace roto a no-existe\.md/],
  ['ancla inexistente', (f) => anexar(f, '3-reglas.md', '\n[x](fuentes.md#no-hay)\n'), /el ancla #no-hay no existe/],
  ['archivo fuera del árbol', (f) => writeFileSync(join(f, 'extra.md'), '# Extra\n'), /extra\.md existe pero no está en el árbol/],
  ['el árbol lista un archivo que no existe', (f) => { rmSync(join(f, '4-compromisos.md')); }, /lista 4-compromisos\.md, que no existe/],
  ['evidencia inválida en el índice', (f) => editar(f, 'INDEX.md', (t) => t.replace('| `HEX-REG-2` | El hexágono no significa seis puertos | P |', '| `HEX-REG-2` | El hexágono no significa seis puertos | X |')), /evidencia «X»/],
  ['celda vacía en el índice', (f) => editar(f, 'INDEX.md', (t) => t.replace('| `HEX-ORI-1` | Alistair Cockburn, 2005; también llamada Ports and Adapters | P | — | — |', '| `HEX-ORI-1` | Alistair Cockburn, 2005; también llamada Ports and Adapters | P |  | — |')), /está vacía/],
  ['columnas que no cuadran', (f) => editar(f, 'INDEX.md', (t) => t.replace('| `HEX-REG-2` | El hexágono no significa seis puertos | P | — | — |', '| `HEX-REG-2` | El hexágono no significa seis puertos | P | — | — | extra |')), /tiene 6 columnas/],
  ['dos prefijos', (f) => { anexar(f, '3-reglas.md', '\n## Ajeno\n<!-- @OTR-REG-1 -->\n- x **[P]**.\n'); anexar(f, 'INDEX.md', '\n| ID | Concepto (una línea) | Ev. | Uso |\n|---|---|---|---|\n| `OTR-REG-1` | x | P | — |\n'); }, /varios prefijos/],
  ['fuentes sin URL', (f) => editar(f, 'fuentes.md', (t) => t.replace(/https?:\/\/[^)\s]+/g, 'sin-url')), /ninguna URL/],
  ['falta INDEX.md', (f) => rmSync(join(f, 'INDEX.md')), /Falta INDEX\.md/],
];

for (const [nombre, mutar, esperado] of mutaciones) {
  test(`rechaza: ${nombre}`, () => {
    const c = copia();
    try {
      mutar(c.folder);
      const r = validar(c.folder);
      assert.equal(r.ok, false, 'debería fallar');
      assert.ok(r.errors.some((e) => esperado.test(e)), `ningún error coincide con ${esperado}:\n${r.errors.join('\n')}`);
    } finally { c.limpiar(); }
  });
}

test('ignora los marcadores dentro de bloques de código', () => {
  const c = copia();
  try {
    anexar(c.folder, '3-reglas.md', '\n```markdown\n<!-- @HEX-XXX-1 -->\n```\n');
    assert.deepEqual(validar(c.folder).errors, []);
  } finally { c.limpiar(); }
});

test('ignora la carpeta comparaciones/', () => {
  const c = copia();
  try {
    mkdirSync(join(c.folder, 'comparaciones'));
    writeFileSync(join(c.folder, 'comparaciones', 'x.md'), '# x\n[roto](nada.md)\n');
    assert.deepEqual(validar(c.folder).errors, []);
  } finally { c.limpiar(); }
});
