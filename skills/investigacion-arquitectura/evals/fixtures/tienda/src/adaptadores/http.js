// Adaptador HTTP: recibe el pedido y aplica el descuento antes de crearlo.
import { createServer } from 'node:http';
import { crearPedido } from '../dominio/pedido.js';

export function servidor() {
  return createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const { cliente, lineas, cupon } = JSON.parse(body);
      const conDescuento = cupon === 'VIP' ? lineas.map((l) => ({ ...l, precio: l.precio * 0.9 })) : lineas;
      const pedido = crearPedido(cliente, conDescuento);
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify(pedido));
    });
  });
}
