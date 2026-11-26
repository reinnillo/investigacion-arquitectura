# INDEX — mapa para AIs de la arquitectura hexagonal

> **Para una AI:** lee sólo este archivo para orientarte. Tiene cada concepto en una línea, dónde está, su evidencia y cómo
> compararlo con otro sistema. Abre un archivo del folder sólo cuando necesites el detalle de un concepto, y sólo su sección.

## 1. Protocolo

1. **Localizar un concepto.** Cada concepto tiene un ID `HEX-<ÁREA>-<n>` y un marcador en su sección.
   `grep -rn --exclude=INDEX.md "@HEX-ELE-2A -->" hexagonal/` da archivo y línea; lee hasta el siguiente marcador.
2. **Comparar con un sistema.** Para cada ID de la sección 4, responde su **Pregunta** buscando con los términos de
   **Buscar**. Estado: `TIENE`, `PARCIAL`, `FALTA` o `N/A`, con archivo:línea del sistema. Plantilla en la sección 5.
3. **Proponer mejoras.** Cita el ID. Prioriza por dependencia: primero `HEX-REG-1` (sin dependencias hacia dentro, los
   puertos no aíslan nada), luego los puertos (`HEX-ELE-2*`) y al final los adaptadores de prueba (`HEX-ELE-3A`).
4. **Respetar la evidencia.** `[P]` el artículo de Cockburn o el original de un patrón relacionado; `[S]` un tercero; `[A]`
   valoración de este folder, no de Cockburn. Comprueba `HEX-SRC-2` antes de atribuirle algo.
5. **Mantener el índice.** Los IDs no se renumeran ni se reutilizan; cada ID tiene un marcador y una fila.

## 2. La arquitectura en 6 líneas

1. La aplicación debe poder ser dirigida por usuarios, programas o tests, y probarse sin su infraestructura (`HEX-TES-1`).
2. Ataca la lógica filtrada a la interfaz y el acoplamiento a la base de datos (`HEX-PRO-1`).
3. Tres elementos: aplicación, puertos y adaptadores (`HEX-ELE-0`).
4. Puertos primarios para quien la dirige y secundarios para lo que usa (`HEX-ELE-2A`, `HEX-ELE-2B`).
5. Las dependencias apuntan hacia la aplicación; el hexágono no significa seis (`HEX-REG-1`, `HEX-REG-2`).
6. Cuesta indirección; comparte idea con Onion y Clean (`HEX-COM-*`).

## 3. Áreas

| Área | Prefijo | Dónde | Qué cubre |
|---|---|---|---|
| Contexto | `HEX-ORI`, `HEX-TES` | [README.md](README.md) | Origen y tesis |
| Problema | `HEX-PRO` | [1-problema.md](1-problema.md) | El fallo de diseño que ataca |
| Elementos | `HEX-ELE` | [2-elementos/](2-elementos/README.md) | Aplicación, puertos, adaptadores |
| Reglas | `HEX-REG` | [3-reglas.md](3-reglas.md) | Dependencias y la forma del dibujo |
| Compromisos | `HEX-COM` | [4-compromisos.md](4-compromisos.md) | Costes y relacionados |
| Fuentes | `HEX-SRC` | [fuentes.md](fuentes.md) | Fuentes y afirmaciones descartadas |

## 4. Conceptos

| ID | Concepto (una línea) | Ev. | Pregunta para comparar | Buscar |
|---|---|---|---|---|
| `HEX-ORI-1` | Alistair Cockburn, 2005; también llamada Ports and Adapters | P | — | — |
| `HEX-TES-1` | Dirigible por usuarios, programas o tests, y probable sin su infraestructura | P | ¿Se puede ejecutar la lógica del sistema desde un test sin base de datos ni interfaz? | `test`, `mock`, `fake`, `in-memory` |
| `HEX-TES-2` | Entrada y salida se conectan por puertos; cada tecnología es un adaptador | P | ¿La lógica llama a la tecnología directamente o a través de una interfaz propia? | `interface`, `port`, `repository`, `gateway` |
| `HEX-PRO-0` | El acoplamiento está a los dos lados: interfaz e infraestructura | P | ¿Hay acoplamiento en los dos lados de la lógica? | `controller`, `handler`, `db`, `client` |
| `HEX-PRO-1` | Lógica de negocio filtrada a la interfaz; aplicación atada a la base de datos | P | ¿Hay reglas de negocio en controladores o vistas? ¿La lógica importa el cliente de base de datos? | `controller`, `route`, `sql`, `query` |
| `HEX-ELE-0` | Todo lo externo entra por un puerto mediante un adaptador | P | ¿Existe una frontera explícita entre la lógica y lo externo? | `ports/`, `adapters/`, `domain/`, `core/` |
| `HEX-ELE-1` | La aplicación no sabe qué tecnología hay al otro lado de sus puertos | P | ¿El núcleo importa algún framework, driver o cliente HTTP? | `import`, `require`, `framework` |
| `HEX-ELE-2` | Un puerto es una conversación con propósito; admite varias tecnologías | P | ¿Las interfaces se definen por propósito de la aplicación o por tecnología? | `interface`, `port`, `contract` |
| `HEX-ELE-2A` | Lado primario (driving): quien dirige la aplicación | P/S | ¿Hay puertos de entrada que no dependan del transporte (HTTP, CLI)? | `use case`, `service`, `command`, `handler` |
| `HEX-ELE-2B` | Lado secundario (driven): lo que la aplicación usa | P/S | ¿La persistencia y los servicios externos están detrás de interfaces de la aplicación? | `repository`, `gateway`, `client`, `store` |
| `HEX-ELE-3` | Un adaptador convierte entre una tecnología y la API de un puerto | P | ¿Cambiar de base de datos o de transporte exige tocar la lógica? | `adapter`, `driver`, `impl` |
| `HEX-ELE-3A` | Adaptadores de prueba: arnés de tests y base de datos en memoria | P | ¿Los tests usan adaptadores en memoria en lugar de la infraestructura real? | `in-memory`, `fake`, `stub`, `test double` |
| `HEX-REG-1` | Dependencias hacia dentro: la aplicación no conoce a ningún adaptador | P/S | ¿Algún módulo del núcleo importa un adaptador o la infraestructura? | `import`, `require`, `dependency-cruiser`, `eslint` |
| `HEX-REG-2` | El hexágono no significa seis puertos | P | — | — |
| `HEX-COM-1` | Coste: más interfaces e indirección; compensa con varias tecnologías o tests sin infraestructura | A | ¿El sistema tiene interfaces con una sola implementación y sin tests que las sustituyan? | `interface`, `implements`, `impl` |
| `HEX-COM-2` | Relacionados: Onion (Palermo, 2008) y Clean (Martin, 2012) | P | — | — |

### Fuentes

| ID | Concepto (una línea) | Ev. | Uso |
|---|---|---|---|
| `HEX-SRC-1` | Fuentes primarias y secundarias | — | Para citar o ampliar |
| `HEX-SRC-2` | Descartadas: seis puertos, exige DDD | — | Comprobar antes de atribuir |

## 5. Plantilla de comparación

Guarda cada comparación en `comparaciones/<sistema>.md`.

```markdown
# Comparación: <sistema> frente a HEX (fecha)

| ID | Estado | Evidencia en el sistema | Brecha | Mejora propuesta |
|---|---|---|---|---|
| HEX-REG-1 | FALTA | src/archivo.js:12 | qué falta | qué hacer |
```
