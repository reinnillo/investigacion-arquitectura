// Utilidades de las pruebas: copias desechables de los fixtures para mutarlas.
import { cpSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

// Devuelve { trabajo, folder } con el fixture hexagonal-mini copiado en <trabajo>/investigacion.
export function copia({ conTienda = false } = {}) {
  const trabajo = mkdtempSync(join(tmpdir(), 'ia-prueba-'));
  const folder = join(trabajo, 'investigacion');
  cpSync(join(FIXTURES, 'hexagonal-mini'), folder, { recursive: true });
  if (conTienda) cpSync(join(FIXTURES, 'tienda'), join(trabajo, 'tienda'), { recursive: true });
  return { trabajo, folder, limpiar: () => rmSync(trabajo, { recursive: true, force: true }) };
}

export function editar(folder, rel, fn) {
  const p = join(folder, rel);
  writeFileSync(p, fn(readFileSync(p, 'utf8')));
}

export function anexar(folder, rel, text) {
  appendFileSync(join(folder, rel), text);
}
