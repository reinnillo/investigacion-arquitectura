# Plantillas

Sustituye lo que va entre `<…>`. Escribe en el idioma del usuario; estas plantillas están en español. Los marcadores dentro
de estos bloques de código son ejemplos: en los archivos reales van fuera de bloques de código.

## Contenido

1. README.md
2. INDEX.md
3. fuentes.md
4. README.md de un área
5. Archivo de concepto
6. Comparación (`comparaciones/<sistema>.md`)

## 1. README.md

````markdown
# <Nombre de la arquitectura> <de quién, si aplica>

Investigación verificada contra fuentes, actualizada el <AAAA-MM-DD>. <Si sustituye a un documento previo: qué tenía de
dudoso y dónde está lo descartado: [fuentes.md](fuentes.md#afirmaciones-descartadas).>

> **¿Eres una AI?** Empieza por [INDEX.md](INDEX.md): el mapa de conceptos con sus IDs, dónde está cada uno y cómo
> comparar esta arquitectura con otro sistema sin leer todo el folder.

## <Quién es | Origen>
<!-- @<PFX>-BIO-1 -->

<Autor, cargo, contexto; o quién definió el patrón, cuándo y dónde. Con etiquetas.>

## La tesis
<!-- @<PFX>-TES-1 --> <!-- @<PFX>-TES-2 -->

<La idea central en 2–4 puntos numerados, cada uno con su etiqueta y, si hay, una cita literal corta.>

## Cómo está organizado este folder

<Una o dos frases: los ejes de la arquitectura y cómo se relacionan las áreas.>

```
<folder>/
├── README.md                 ← esto: qué es, tesis, mapa
├── INDEX.md                  ← índice para AIs: IDs, ubicación, comparación con otro sistema
├── fuentes.md                ← fuentes y afirmaciones descartadas
├── 1-<area>/                 ← <qué cubre>
│   ├── README.md
│   └── 1-<concepto>.md       ← <qué cubre>
└── 2-<area>.md               ← <qué cubre>
```

## Nivel de evidencia

- **[P] primaria:** <qué cuenta como primaria en este tema>.
- **[S] secundaria:** un tercero que la relata.
- **[A] adaptación:** propuesta de este folder. **No es de <autor>.**

<Si hay cifras: de quién son y si están verificadas.>
````

El árbol lista **todos** los `.md` del folder (salvo `comparaciones/`), con las carpetas terminadas en `/` y sangría de
cuatro caracteres por nivel (`│   ` o `    `). El validador lo compara con los archivos reales.

## 2. INDEX.md

````markdown
# INDEX — mapa para AIs de <la arquitectura>

> **Para una AI:** lee sólo este archivo para orientarte. Tiene cada concepto en una línea, dónde está, su evidencia y cómo
> compararlo con otro sistema. Abre un archivo del folder sólo cuando necesites el detalle de un concepto, y sólo su sección.

## 1. Protocolo

1. **Localizar un concepto.** Cada concepto tiene un ID `<PFX>-<ÁREA>-<n>` y un marcador `<!-- @<PFX>-<ÁREA>-<n> -->` en
   su sección. `grep -rn --exclude=INDEX.md "@<PFX>-<ÁREA>-<n> -->" <folder>/` da archivo y línea; lee desde ahí hasta el
   siguiente marcador. Incluye ` -->` en el patrón para que `<PFX>-X-1` no encuentre también `<PFX>-X-1A`, y excluye este
   índice, que cita los marcadores en sus ejemplos.
2. **<Si hay catálogos con nombres únicos (comandos, componentes, principios):>** sus nombres son identificadores:
   `grep -rn "<nombre>"`. Están en <IDs de los catálogos>.
3. **Comparar con un sistema.** Para cada ID de la sección 4, responde su **Pregunta** buscando en el sistema con los
   términos de **Buscar**. Pon un estado — `TIENE`, `PARCIAL`, `FALTA` o `N/A` — con la evidencia (archivo:línea del
   sistema). Usa la plantilla de la sección 5.
4. **Proponer mejoras.** Cita siempre el ID. Prioriza <con el orden que impone la propia arquitectura: de la capa base a la
   punta; las dependencias entre elementos; los requisitos previos que el autor declara (`<PFX>-TES-n`). Si no impone
   ninguno: primero lo que desbloquea otros conceptos, luego lo más barato>.
5. **Respetar la evidencia.**
   - `[P]` primaria: <qué cuenta como primaria aquí>.
   - `[S]` secundaria: un tercero que la relata.
   - `[A]` adaptación de este folder: **no es de <autor>.** No la cites como suya.

   Antes de afirmar algo como suyo, comprueba que no está en `<PFX>-SRC-2` (afirmaciones descartadas).
6. **Mantener el índice.** Los IDs son estables: nunca se renumeran ni se reutilizan.
   - **Concepto nuevo:** se añade su marcador en la sección y su fila aquí.
   - **Concepto retirado:** se quitan los dos.
   - **Regla de consistencia:** cada ID de la sección 4 tiene exactamente un marcador en el folder, y cada marcador tiene su
     fila. Con el skill `investigacion-arquitectura` la comprueba `scripts/validar.mjs <folder>`; sin él, compara la lista
     de `grep -rhoE --exclude=INDEX.md "@<PFX>-[A-Z0-9]+-[0-9]+[A-Z]? -->" <folder>/` con las filas de la sección 4.

## 2. La arquitectura en <N> líneas

1. <Una línea por idea, de la tesis a la periferia, citando IDs (`<PFX>-TES-1`). Entre 6 y 10 líneas.>

## 3. Áreas

| Área | Prefijo | Dónde | Qué cubre |
|---|---|---|---|
| Contexto | `<PFX>-BIO`, `<PFX>-TES` | [README.md](README.md) | <…> |
| <Área> | `<PFX>-<ÁREA>` | [1-<area>/](1-<area>/README.md) | <…> |
| Fuentes | `<PFX>-SRC` | [fuentes.md](fuentes.md) | De dónde sale cada dato y qué se descartó |

## 4. Conceptos

La columna **Buscar** da términos genéricos para encontrar el equivalente en el código del sistema que se compara.

### <Área>

| ID | Concepto (una línea) | Ev. | Pregunta para comparar | Buscar |
|---|---|---|---|---|
| `<PFX>-<ÁREA>-0` | <cómo se lee el área> | P | <pregunta que se responde mirando un sistema> | `<término>`, `<sinónimo>` |

### Fuentes

| ID | Concepto (una línea) | Ev. | Uso |
|---|---|---|---|
| `<PFX>-SRC-1` | Fuentes primarias y secundarias, con qué aporta cada una | — | Para citar o ampliar un dato |
| `<PFX>-SRC-2` | Afirmaciones descartadas: <las más tentadoras> | — | Comprobar antes de atribuirle algo |

## 5. Plantilla de comparación

Guarda cada comparación en `comparaciones/<sistema>.md`. Es material del sistema comparado, no de esta investigación:
quítalo antes de compartir el folder si es privado.

```markdown
# Comparación: <sistema> frente a <PFX> (fecha, versión del sistema)

| ID | Estado | Evidencia en el sistema | Brecha | Mejora propuesta (capa) |
|---|---|---|---|---|
| <PFX>-<ÁREA>-0 | PARCIAL | ruta/archivo:línea | qué falta | qué hacer, dónde |

## Prioridad
1. <ID> — por qué primero
```

Estados: `TIENE` (equivalente completo) · `PARCIAL` (existe con huecos) · `FALTA` · `N/A` (no aplica al tipo de sistema).
````

**Cómo escribir las columnas de la sección 4:**

- **Concepto:** una línea autosuficiente con el dato que importa (nombre, número, regla). Quien sólo lee el índice debe
  poder razonar con ella.
- **Pregunta para comparar:** se responde inspeccionando un sistema, con sí/no y qué. «¿Las fronteras entre módulos las
  impone una herramienta o sólo la convención?» sirve; «¿Es buena la arquitectura?» no. `—` para conceptos que no se
  comparan (biografía, cifras ajenas).
- **Buscar:** 2–5 términos que aparecerían en el código o la configuración de un sistema con ese concepto: identificadores
  en inglés, nombres de herramientas, sinónimos. `—` si no aplica.
- Ninguna celda vacía: el validador lo rechaza.

## 3. fuentes.md

````markdown
# Fuentes
<!-- @<PFX>-SRC-1 -->

Consultadas el <AAAA-MM-DD>. <Fallos de acceso y qué se usó en su lugar.>

## Primarias [P]

| Fuente | Qué aporta |
|---|---|
| [<título>](<url>) | <qué datos salen de aquí> |

## Secundarias [S]

| Fuente | Qué relata |
|---|---|
| [<título>](<url>) | <…> |

## Afirmaciones descartadas
<!-- @<PFX>-SRC-2 -->

<De dónde vienen: el documento de partida, resúmenes que circulan…> No aparecen en ninguna fuente, o las fuentes las
contradicen:

| Afirmación | Qué dicen las fuentes |
|---|---|
| <afirmación tal como circula> | <lo que sí consta, con etiqueta y enlace a la sección del folder> |
````

Si no se descartó nada, la sección queda con una línea: «Ninguna a fecha de <AAAA-MM-DD>.»

## 4. README.md de un área

````markdown
# <Área>

<Qué es en una o dos frases, con etiqueta. Si el autor la dibuja, el diagrama en un bloque de código.>

## Cómo se lee
<!-- @<PFX>-<ÁREA>-0 -->

- <La regla que ordena el área, con etiqueta.>
- <Discrepancias entre fuentes, si las hay, y qué cuenta usa el folder.>

## <Capas | Partes | Contenido>

1. [<hijo>](<hijo>.md)
````

## 5. Archivo de concepto

````markdown
# <Concepto>

<Qué es, en una frase, con etiqueta.>

## <Subconcepto>
<!-- @<PFX>-<ÁREA>-<n> -->

- <Afirmación> **[P]**.
- <Cita literal corta> *«…»* **[P]**.
- <Lo que relata un tercero> **[S, Nombre]**.

## <Subconcepto>
<!-- @<PFX>-<ÁREA>-<n>A -->

| <Elemento> | <Regla> |
|---|---|
| `<nombre>` | <…> **[P]** |
````

Una sección por concepto con ID. Listas y tablas antes que párrafos. Sin relleno: cada línea es un dato con su etiqueta o
una relación entre datos.

## 6. Comparación (`comparaciones/<sistema>.md`)

Es la plantilla de la sección 5 de `INDEX.md`. Rellena una fila por cada ID con pregunta; la columna de evidencia cita
`archivo:línea` del sistema comparado, nunca de memoria.
