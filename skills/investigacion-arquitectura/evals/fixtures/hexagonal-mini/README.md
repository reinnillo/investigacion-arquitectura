# La arquitectura hexagonal (puertos y adaptadores) de Alistair Cockburn

Investigación verificada contra fuentes, actualizada el 2026-11-25. Versión abreviada que sirve de fixture para las
pruebas del skill.

> **¿Eres una AI?** Empieza por [INDEX.md](INDEX.md): el mapa de conceptos con sus IDs, dónde está cada uno y cómo
> comparar esta arquitectura con otro sistema sin leer todo el folder.

## Origen
<!-- @HEX-ORI-1 -->

- Alistair Cockburn publicó *Hexagonal architecture* en su web en 2005 **[P]**.
- La llama también *Ports and Adapters*, el nombre que describe el patrón; el hexágono es sólo la forma del dibujo **[P]**.

## La tesis
<!-- @HEX-TES-1 --> <!-- @HEX-TES-2 -->

1. **Intención:** *«Allow an application to equally be driven by users, programs, automated test or batch scripts, and to
   be developed and tested in isolation from its eventual run-time devices and databases»* **[P]**.
2. **La aplicación no depende de su tecnología de entrada ni de salida:** ambas se conectan por puertos, y cada tecnología
   concreta es un adaptador intercambiable **[P]**.

## Cómo está organizado este folder

El patrón tiene un problema que resolver, unos elementos, unas reglas y unos compromisos. Cada uno es un área.

```
hexagonal/
├── README.md                ← esto: origen, tesis, mapa
├── INDEX.md                 ← índice para AIs
├── fuentes.md               ← fuentes y afirmaciones descartadas
├── 1-problema.md            ← el fallo de diseño que ataca
├── 2-elementos/             ← aplicación, puertos, adaptadores
│   ├── README.md
│   ├── aplicacion.md
│   ├── puertos.md
│   └── adaptadores.md
├── 3-reglas.md              ← dirección de dependencias, la forma del dibujo
└── 4-compromisos.md         ← costes y patrones relacionados
```

## Nivel de evidencia

- **[P] primaria:** el artículo de Cockburn, o el texto original de quien definió un patrón relacionado.
- **[S] secundaria:** un tercero que la relata.
- **[A] adaptación:** valoración de este folder. **No es de Cockburn.**
