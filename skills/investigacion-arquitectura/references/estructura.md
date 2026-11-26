# Cómo derivar la jerarquía del folder

El folder es un mapa de la arquitectura, no una plantilla rellenada. Quien lo abre debe reconocer la arquitectura en el
árbol antes de leer un solo archivo. Por eso la jerarquía se **deriva** de cómo la propia arquitectura se descompone a sí
misma: sus nombres, su orden y su número de piezas.

## Contenido

1. Archivos fijos
2. Procedimiento para derivar las áreas
3. Arquetipos de tema, con árboles de ejemplo
4. Carpeta o archivo
5. Nombres
6. IDs y marcadores

## 1. Archivos fijos

Todo folder tiene, en la raíz:

| Archivo | Para qué |
|---|---|
| `README.md` | Qué es y de quién, la tesis, el árbol anotado del folder, las etiquetas de evidencia y un aviso para AIs que apunta a `INDEX.md` |
| `INDEX.md` | Mapa para AIs: protocolo, la arquitectura en N líneas, áreas, conceptos con ID, plantilla de comparación |
| `fuentes.md` | Fuentes primarias y secundarias, fallos de acceso y la tabla de afirmaciones descartadas |

Opcionales, según el tema: `N-metricas.md` si hay cifras publicadas; una carpeta `plantillas/` dentro del área a la que
pertenecen si el folder propone adaptaciones **[A]**; `comparaciones/` la crea el modo Comparar, nunca el modo Crear.

## 2. Procedimiento para derivar las áreas

1. **Busca la descomposición del autor.** En la fuente primaria: ¿cómo la presenta? Capas, pirámide, planos, bucles,
   fases, pilares, factores, componentes, principios. Copia sus términos y su número exacto (si dice cinco capas, son cinco;
   si las fuentes discrepan, elige una cuenta y anota la discrepancia en el README del área).
2. **Identifica los ejes.** Muchas arquitecturas tienen más de una dimensión (calidad frente a ejecución; estático frente a
   dinámico; control frente a datos). Cada eje es un área de primer nivel.
3. **Añade lo que la rodea, si existe en las fuentes:** actores o roles, herramientas o kit, métricas, variantes y
   relacionados, cuándo no usarla. No crees áreas vacías por simetría.
4. **Ordena el primer nivel por lectura:** del modelo central a la periferia (modelo → ejecución → actores → herramientas →
   métricas). Numera (`1-`, `2-`…) ese orden.
5. **Dentro de un área, numera sólo si la arquitectura impone orden** (capas de abajo arriba, etapas de un pipeline, fases).
   Un conjunto sin orden (tipos de verificación, catálogo de bots) va sin número.
6. **Dibuja el árbol antes de escribir.** Si un área no se explica en una frase («qué cubre»), está mal cortada.

## 3. Arquetipos de tema

Son puntos de partida. La descomposición del autor manda sobre el arquetipo.

### A. Práctica de una persona o un equipo

Ejemplo: cómo construye software con agentes una ingeniera concreta. Áreas = sus modelos mentales con nombre, cómo ejecuta
el trabajo, quién lo ejecuta, su kit, sus cifras.

```
investigacion/
├── README.md  ├── INDEX.md  ├── fuentes.md
├── 1-piramide-de-confianza/      ← su modelo central, capas numeradas de la base a la punta
│   ├── README.md
│   ├── 1-codebase.md
│   ├── 2-analisis-estatico.md
│   └── 3-verificacion/           ← carpeta: tres subtemas con fuentes propias
│       ├── README.md
│       ├── runtime.md
│       └── formal.md
├── 2-bucles/                     ← segundo eje: ejecución
├── 3-bots/                       ← actores
├── 4-kit/                        ← herramientas: principios, skills, playbooks
└── 5-metricas.md
```

### B. Patrón o estilo con nombre

Ejemplos: hexagonal (puertos y adaptadores), CQRS, event sourcing, Clean Architecture, microservicios. Áreas = el problema
que resuelve, sus elementos, sus reglas o invariantes, variantes y relacionados, compromisos y cuándo no usarlo.

```
hexagonal/
├── README.md  ├── INDEX.md  ├── fuentes.md
├── 1-problema.md                 ← qué fallo de diseño ataca, en palabras del autor
├── 2-elementos/
│   ├── README.md                 ← el diagrama del autor
│   ├── aplicacion.md
│   ├── puertos.md
│   └── adaptadores.md
├── 3-reglas.md                   ← dirección de dependencias, qué no puede importar qué
├── 4-variantes-y-relacionados.md
└── 5-compromisos.md              ← costes, cuándo no usarlo
```

### C. Sistema o producto concreto

Ejemplos: Kubernetes, Kafka, PostgreSQL, la plataforma interna publicada de una empresa. Áreas = los planos o componentes
según su documentación, el recorrido de una petición, el modelo de estado, las garantías ante fallos, la operación.

```
kubernetes-control-plane/
├── README.md  ├── INDEX.md  ├── fuentes.md
├── 1-componentes/                ← tal como los nombra la documentación oficial
│   ├── README.md
│   ├── kube-apiserver.md
│   ├── etcd.md
│   ├── kube-scheduler.md
│   └── kube-controller-manager.md
├── 2-recorrido-de-una-peticion.md
├── 3-modelo-de-estado.md         ← estado deseado frente a observado, reconciliación
├── 4-garantias-y-fallos.md
└── 5-operacion.md
```

### D. Marco, estándar o arquitectura de referencia

Ejemplos: AWS Well-Architected, 12-factor, C4, OWASP SAMM. Áreas = sus pilares o factores, exactamente como el estándar los
enumera. Las preguntas de comparación suelen salir del propio estándar.

```
twelve-factor/
├── README.md  ├── INDEX.md  ├── fuentes.md
└── factores/
    ├── README.md
    ├── 01-codebase.md
    ├── 02-dependencias.md
    └── …                         ← uno por factor, numerados como en el original
```

## 4. Carpeta o archivo

- **Archivo** cuando el elemento cabe en una o varias secciones de un archivo de hasta unas 120 líneas.
- **Carpeta** cuando tiene dos o más subtemas con desarrollo y fuentes propias. La carpeta lleva un `README.md` que dice
  cómo se lee el conjunto (su concepto `-0`) y enlaza a cada hijo.
- **Profundidad máxima: tres niveles** bajo la raíz. Más profundidad dificulta la búsqueda sin añadir precisión.
- Un catálogo largo (35 skills, 22 playbooks) es **una tabla en un archivo**, no un archivo por fila.

## 5. Nombres

- Minúsculas, guiones, sin tildes ni eñes (`piramide-de-confianza`, no `Pirámide de Confianza`): son rutas en todos los
  sistemas y se escriben en un `grep` sin dudar.
- En el idioma del usuario. El nombre del folder lo da el usuario; si no, `investigacion/` (o `research/` en inglés), y
  si ya existe uno con otro tema, `investigacion-<tema>/`.
- Conserva los términos propios de la arquitectura sin traducir cuando son nombres (`poteto-mode`, `kube-apiserver`).

## 6. IDs y marcadores

**Formato:** `<PFX>-<ÁREA>-<n>[letra]`.

- `PFX`: 2–6 caracteres en mayúsculas que nombran el tema; empieza por letra (`LT` por las iniciales de una persona,
  `HEX`, `K8S`, `TWF`). **Un solo prefijo por folder.**
- `ÁREA`: 2–5 caracteres por área (`PIR`, `BUC`, `ELE`, `CMP`). Contexto: `BIO` (persona) u `ORI` (origen) y `TES`
  (tesis). Fuentes: siempre `SRC-1` (fuentes) y `SRC-2` (descartadas).
- `n`: `0` para el «cómo se lee» de un área, luego 1, 2, 3… Los subconceptos llevan letra: `PIR-3A`, `PIR-3B`.

**Granularidad:** un ID por concepto que alguien pueda citar o comparar por separado contra un sistema. Unas 25–60 IDs
para un tema completo. Con menos de 15 el índice no guía; con más de 80 deja de leerse de un vistazo.

**Marcador:** `<!-- @PFX-ÁREA-n -->` en la línea siguiente al título de su sección. Varios marcadores en una sección sólo
si los conceptos son inseparables (los tres puntos de una tesis). Nunca dentro de un bloque de código: el validador los
ignora ahí, a propósito, para que las plantillas puedan mostrar marcadores de ejemplo.

**Estabilidad:** los IDs no se renumeran ni se reutilizan. Un concepto retirado pierde su marcador y su fila; su número
queda libre para siempre.
