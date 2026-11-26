#!/usr/bin/env node
// Puntúa la calidad de un folder de investigación de arquitectura (0–1) con comprobaciones medibles.
// Uso: node evaluar.mjs <folder> [--esperado <esperado.json>] [--trabajo <dir>] [--umbral 0.85] [--json]
//   --esperado  expectativas de un caso de prueba (conceptos, descartes, prohibidos, orden, IDs, comparación…)
//   --trabajo   directorio base para rutas de `persistentes` y `comparacion.sistema` (por defecto, el padre del folder)
// Exit 0 si aprueba (puntuación ≥ umbral y ningún crítico fallido), 1 si no, 2 si el uso es incorrecto.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { evaluar, formatear } from './lib/evaluacion.mjs';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const valued = new Set(['--esperado', '--trabajo', '--umbral']);
const root = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
if (!root || !existsSync(root) || !statSync(root).isDirectory()) {
  console.error('Uso: node evaluar.mjs <folder> [--esperado <esperado.json>] [--trabajo <dir>] [--umbral 0.85] [--json]');
  process.exit(2);
}
const esperado = opt('--esperado') ? JSON.parse(readFileSync(opt('--esperado'), 'utf8')) : {};
if (opt('--umbral')) esperado.umbral = Number(opt('--umbral'));
const r = evaluar(root, esperado, { trabajo: opt('--trabajo') });
console.log(args.includes('--json') ? JSON.stringify(r, null, 2) : formatear(r));
process.exit(r.aprobado ? 0 : 1);
