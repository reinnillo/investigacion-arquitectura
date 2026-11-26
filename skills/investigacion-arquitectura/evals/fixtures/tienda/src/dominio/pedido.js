// Lógica de pedidos.
import { leerPedidos, guardarPedidos } from '../infra/db.js';

export function crearPedido(cliente, lineas) {
  if (!lineas.length) throw new Error('Un pedido necesita al menos una línea');
  const total = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const pedido = { id: Date.now(), cliente, lineas, total };
  const pedidos = leerPedidos();
  pedidos.push(pedido);
  guardarPedidos(pedidos);
  return pedido;
}
