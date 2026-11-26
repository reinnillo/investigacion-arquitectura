# investigacion-arquitectura

Skill para Claude que investiga una arquitectura tecnológica en fuentes reales y la convierte en un folder de Markdown que
una persona o una AI puede usar sin leerlo entero: el árbol de carpetas refleja la propia arquitectura, cada afirmación
dice de dónde sale y un `INDEX.md` lleva a cualquier concepto con un `grep`. Sirve para entender una arquitectura y, sobre
todo, para **comparar un sistema real con ella y mejorarlo paso a paso**.

Funciona con cualquier tema de arquitectura en tecnología: la práctica de una persona o un equipo, un patrón (hexagonal,
CQRS, microservicios), un producto (Kubernetes, Kafka) o un marco (Well-Architected, 12-factor).

## Qué produce

```
investigacion/
├── README.md        ← qué es, la tesis, el árbol anotado, las etiquetas de evidencia
├── INDEX.md         ← mapa para AIs: protocolo, conceptos con ID, preguntas de comparación
├── fuentes.md       ← fuentes primarias y secundarias, y afirmaciones descartadas
├── 1-<eje>/         ← la jerarquía sale de cómo el autor descompone la arquitectura
│   ├── README.md
│   └── 1-<capa>.md
└── 2-<area>.md
```

- **Evidencia en cada afirmación:** `[P]` leída en la fuente primaria, `[P, vía X]` primaria vista a través de un tercero,
  `[S]` relatada por un tercero, `[A]` adaptación del folder (no es del autor).
- **Afirmaciones descartadas:** lo que circula y no se sostiene queda documentado con lo que dicen las fuentes.
- **Cifras con dueño, periodo, base** y si están verificadas.
- **IDs estables y greppables:** cada concepto tiene un ID `PFX-ÁREA-n` y un marcador `<!-- @PFX-ÁREA-n -->`;
  `grep -rn --exclude=INDEX.md "@PFX-ÁREA-n -->" investigacion/` da archivo y línea.
- **Comparación con tu sistema:** cada concepto trae una pregunta y términos de búsqueda; el resultado va a
  `comparaciones/<sistema>.md` con estados `TIENE`, `PARCIAL`, `FALTA` o `N/A` y evidencia `archivo:línea`.

El folder no depende del skill para leerse: se puede compartir y otra AI lo usa siguiendo el protocolo de su `INDEX.md`.

## Instalación

### Claude Code, como plugin

```
/plugin marketplace add reinnillo/investigacion-arquitectura
/plugin install investigacion-arquitectura@reinnillo
```

### Claude Code, a mano

Copia `skills/investigacion-arquitectura/` a `~/.claude/skills/` (para todos tus proyectos) o a `.claude/skills/` de un
proyecto.

### Claude.ai

Descarga `investigacion-arquitectura.zip` de la [última release](https://github.com/reinnillo/investigacion-arquitectura/releases/latest)
y súbelo en *Settings → Capabilities → Skills*.

**Requisitos:** búsqueda y lectura web para investigar, y Node.js 18 o superior para el validador.

## Uso

Pídelo con tus palabras; el skill se activa solo:

- «Investiga la arquitectura hexagonal de Alistair Cockburn y ármame un folder en `docs/hexagonal/`.»
- «Tengo este borrador sobre twelve-factor y no me fío de los datos; verifícalo y conviértelo en un folder de investigación.»
- «Compara nuestro backend con `investigacion/` y dime qué nos falta, por prioridad.»

Tres modos:

| Modo | Qué hace |
|---|---|
| **Crear** | Delimita el tema, investiga y verifica, modela la arquitectura, escribe el folder y el índice, y lo valida |
| **Actualizar** | Amplía o corrige un folder existente sin renumerar IDs |
| **Comparar** | Lee sólo `INDEX.md`, busca cada concepto en tu sistema y escribe `comparaciones/<sistema>.md` |

## Validación y evaluación

```bash
S=skills/investigacion-arquitectura/scripts
node $S/validar.mjs <folder>          # estructura: IDs, marcadores, índice, enlaces, árbol, fuentes
node $S/validar.mjs <folder> --map    # ID → archivo:línea
node $S/evaluar.mjs <folder>          # calidad de 0 a 1; aprueba con 0,85 y sin fallos críticos
```

- **`validar.mjs`** comprueba que cada ID del índice tiene exactamente un marcador y cada marcador su fila; que hay un solo
  prefijo; que la evidencia, las celdas y las columnas del índice son válidas; que los enlaces y anclas existen; que el árbol
  del README coincide con los archivos; y que `fuentes.md` tiene URLs y descartadas.
- **`evaluar.mjs`** parte de esa validación y mide la calidad: densidad de etiquetas de evidencia, secciones de concepto sin
  etiqueta, fuentes primarias, fechas, citas, descartadas, granularidad y comparabilidad del índice, profundidad, nombres y
  relleno. Cada comprobación fallida dice dónde mirar.

El skill ejecuta los dos antes de entregar un folder. Ninguno juzga si lo escrito es verdad: eso lo cubren el procedimiento
de investigación del skill y el juez semántico de las evals.

## Evals

El skill trae su propio sistema de evals en
[skills/investigacion-arquitectura/evals/](skills/investigacion-arquitectura/evals/README.md):

| Capa | Qué comprueba | Cómo |
|---|---|---|
| Pruebas del evaluador | Que cada comprobación detecta la clase de fallo que vigila (40 pruebas) | `node --test skills/investigacion-arquitectura/evals/pruebas/*.test.mjs` |
| Evaluador determinista | La calidad medible de un folder y las expectativas de cada caso | `evaluar.mjs <folder> --esperado <caso>/esperado.json` |
| Runner | El skill de punta a punta, con y sin skill, con puntuación, coste y delta | `node skills/investigacion-arquitectura/evals/correr.mjs` |
| Juez semántico | Lo que un script no ve: descartes correctos, prioridades con sentido | `correr.mjs --juez` |

Cinco casos cubren los tres modos: un patrón (hexagonal), un producto con el pedido en inglés (Kubernetes), un borrador con
datos falsos que hay que descartar (12-factor), añadir un concepto sin romper IDs, y comparar un sistema con violaciones
deliberadas sin tocar su código. Los mismos casos funcionan con `claude plugin eval . --allow-tools
Write,Edit,Bash,WebSearch,WebFetch --scaffold`. Las ejecuciones reales tienen coste.

## Estructura del repo

```
.claude-plugin/
├── plugin.json
└── marketplace.json
skills/investigacion-arquitectura/
├── SKILL.md                 ← flujo de los tres modos
├── references/
│   ├── estructura.md        ← cómo derivar la jerarquía, arquetipos, IDs
│   ├── evidencia.md         ← etiquetas, verificación, cifras, fallos habituales
│   └── plantillas.md        ← README, INDEX, fuentes, áreas, conceptos, comparación
├── scripts/
│   ├── validar.mjs          ← validador estructural
│   ├── evaluar.mjs          ← evaluador de calidad
│   └── lib/                 ← validacion.mjs y evaluacion.mjs, la única fuente de las reglas
└── evals/                   ← casos, fixtures, runner, pruebas, disparo.json
```

## English

A Claude skill that researches a technology architecture (a person's or team's practice, a pattern, a product or a
framework) from real sources and turns it into a Markdown folder whose tree mirrors the architecture. Every claim carries
an evidence tag, unsupported claims are listed as discarded, and an AI-friendly `INDEX.md` with stable, greppable IDs and
comparison questions lets you compare your own system against it. It writes in the user's language, ships with a
validator and a quality evaluator it runs on its own output, and has its own eval suite (cases for its three modes, a
runner that compares runs with and without the skill, and tests for the evaluator). Install with `/plugin marketplace add reinnillo/investigacion-arquitectura`.

## Licencia

[MIT](LICENSE)
