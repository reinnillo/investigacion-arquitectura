import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearPedido } from '../src/dominio/pedido.js';

test('calcula el total del pedido', () => {
  const p = crearPedido('ana', [{ precio: 10, cantidad: 2 }]);
  assert.equal(p.total, 20);
});
