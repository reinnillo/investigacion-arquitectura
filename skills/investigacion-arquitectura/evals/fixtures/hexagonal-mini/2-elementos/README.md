# Elementos

Tres piezas: la aplicación en el centro, los puertos en su borde y los adaptadores fuera **[P]**.

```
   [usuario] [test]                       [base de datos] [correo]
        \      /                                \        /
     adaptadores ──puerto──▶ APLICACIÓN ◀──puerto── adaptadores
```

## Cómo se lee
<!-- @HEX-ELE-0 -->

- Todo lo que está fuera de la aplicación habla con ella a través de un puerto, mediante un adaptador **[P]**.
- Cockburn dibuja a la izquierda lo que dirige la aplicación y a la derecha lo que la aplicación usa **[P]**.

## Contenido

1. [Aplicación](aplicacion.md)
2. [Puertos](puertos.md)
3. [Adaptadores](adaptadores.md)
