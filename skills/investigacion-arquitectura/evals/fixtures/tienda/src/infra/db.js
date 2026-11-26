// Cliente de base de datos: guarda los pedidos en un archivo JSON.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const FILE = new URL('../../pedidos.json', import.meta.url);

export function leerPedidos() {
  return existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : [];
}

export function guardarPedidos(pedidos) {
  writeFileSync(FILE, JSON.stringify(pedidos, null, 2));
}
