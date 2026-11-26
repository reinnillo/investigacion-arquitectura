#!/usr/bin/env node
// Valida un folder de investigación de arquitectura: IDs, marcadores, índice, enlaces, árbol y evidencia.
// Uso: node validar.mjs <folder> [--map] [--json]
//   --map   imprime ID → archivo:línea (para redactar o revisar INDEX.md)
//   --json  imprime el resultado como JSON
// Exit 0 si no hay errores (los avisos no fallan), 1 si los hay, 2 si el uso es incorrecto.

import { existsSync, statSync } from 'node:fs';
import { validar } from './lib/validacion.mjs';

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith('--'));
const wantMap = args.includes('--map');
const wantJson = args.includes('--json');
if (!root || !existsSync(root) || !statSync(root).isDirectory()) {
  console.error('Uso: node validar.mjs <folder> [--map] [--json]');
  process.exit(2);
}

const { ok, errors, warnings, markers, summary } = validar(root);
const ids = [...markers.keys()].sort();
if (wantJson) {
  const map = Object.fromEntries(ids.map((id) => [id, `${markers.get(id)[0].file}:${markers.get(id)[0].line}`]));
  console.log(JSON.stringify({ ok, summary, errors, warnings, ...(wantMap ? { map } : {}) }, null, 2));
} else {
  if (wantMap) for (const id of ids) console.log(`${id}\t${markers.get(id)[0].file}:${markers.get(id)[0].line}`);
  console.log(`IDs en INDEX: ${summary.ids} · marcadores: ${summary.markers} · archivos .md: ${summary.files} · enlaces relativos: ${summary.links}`);
  for (const e of errors) console.log(`ERROR  ${e}`);
  for (const w of warnings) console.log(`AVISO  ${w}`);
  console.log(errors.length ? `✗ ${errors.length} error(es), ${warnings.length} aviso(s)` : `✓ válido (${warnings.length} aviso(s))`);
}
process.exit(ok ? 0 : 1);
