# Evals de investigacion-arquitectura

Este skill entrega un folder de investigación, así que se evalúa por **la calidad del folder que deja**, no por lo que dice
que hizo. El sistema tiene cuatro capas, de la más barata a la más cara:

| Capa | Qué comprueba | Coste | Cómo se ejecuta |
|---|---|---|---|
| 1. Pruebas del evaluador | Que cada comprobación detecta la clase de fallo que vigila | Gratis, segundos | `node --test evals/pruebas/*.test.mjs` |
| 2. Evaluador determinista | La calidad medible de un folder: estructura, índice, evidencia y expectativas del caso | Gratis, al instante | `node scripts/evaluar.mjs <folder> [--esperado <caso>/esperado.json]` |
| 3. Runner de casos | El skill de punta a punta: lo ejecuta con `claude -p` con y sin skill, y puntúa cada folder | Ejecuciones reales de modelo | `node evals/correr.mjs` |
| 4. Juez semántico | Lo que un script no puede ver: si los descartes son correctos, si la prioridad tiene sentido | Una llamada extra por ejecución | `node evals/correr.mjs --juez` |

El evaluador de la capa 2 es el mismo que el skill ejecuta en su paso 6: lo que el skill aprueba al trabajar es lo que se
mide aquí.

## Casos

| Caso | Modo | Qué pone a prueba |
|---|---|---|
| `patron-hexagonal` | Crear | Un patrón con nombre: jerarquía con sus elementos, fuente primaria de Cockburn |
| `research-k8s-control-plane` | Crear | Un producto, con el pedido en inglés: folder en inglés, componentes de la documentación oficial |
| `desde-borrador-12-factor` | Crear | Un borrador con cuatro afirmaciones falsas: descartarlas, no afirmarlas y no borrar el borrador |
| `actualizar-concepto` | Actualizar | Añadir un concepto a un folder existente sin renumerar ni perder IDs |
| `comparar-sistema` | Comparar | Comparar un sistema real con el folder: estados, referencias archivo:línea reales, hallazgos esperados, código intacto |

Cada caso es una carpeta con:

- `prompt.md`: ajustes de la ejecución y el pedido tal como lo escribiría un usuario;
- `case.yaml`: el resultado esperado en prosa;
- `esperado.json`: las expectativas que comprueba el evaluador (ver abajo);
- `graders/*.md`: afirmaciones semánticas para el juez (y para `claude plugin eval`);
- `place-files.sh`: prepara el directorio de trabajo (copia fixtures o archivos de entrada), si hace falta.

`fixtures/` tiene un folder de referencia completo (`hexagonal-mini`, puntúa 1) y un sistema pequeño con violaciones
deliberadas del patrón (`tienda`). `disparo.json` tiene pedidos que deben activar el skill y pedidos parecidos que no, para
el optimizador de descripciones de skill-creator.

## Comprobaciones del evaluador

Cada una vale entre 0 y 1 y tiene un peso. La puntuación es la media ponderada; se aprueba con **0,85** y sin ninguna
comprobación **crítica** fallida.

| Comprobación | Peso | Qué mide |
|---|---|---|
| `estructura.valida` | 3, crítica | El validador no da errores |
| `estructura.avisos` | 1 | Sin avisos del validador |
| `estructura.profundidad` | 1 | Como mucho tres niveles de carpetas |
| `estructura.nombres` | 1 | Minúsculas, guiones, sin tildes |
| `indice.granularidad` | 1 | Entre 15 y 80 IDs |
| `indice.secciones` | 1 | Protocolo, la arquitectura en N líneas, áreas, conceptos, plantilla de comparación |
| `indice.comparable` | 2 | Al menos el 70 % de los conceptos tiene pregunta y términos de búsqueda |
| `indice.resumen` | 0,5 | La arquitectura en 6–10 líneas |
| `evidencia.densidad` | 3 | Al menos el 80 % de las afirmaciones lleva etiqueta (las listas heredan la de su frase de entrada; los archivos de adaptación no cuentan) |
| `evidencia.por-concepto` | 2 | Cada sección de concepto tiene al menos una etiqueta |
| `evidencia.primarias` | 2 | Al menos dos URLs en fuentes primarias |
| `evidencia.fechas` | 1 | README y fuentes llevan fecha |
| `evidencia.citas` | 0,5 | Citas de 40 palabras o menos |
| `evidencia.descartadas` | 1 | La sección de descartadas tiene contenido |
| `contenido.aviso-ai` | 0,5 | El README enlaza a INDEX.md |
| `contenido.sin-relleno` | 1 | Sin `TODO`, `<marcadores>` sin sustituir ni archivos casi vacíos |

### Expectativas de un caso (`esperado.json`)

| Campo | Comprobación | Peso |
|---|---|---|
| `carpeta` | Dónde debe quedar el folder (relativo al directorio de trabajo) | — |
| `idioma` | `es` o `en`, detectado por palabras frecuentes | 1 |
| `conceptos` | `[{nombre, patron}]` que deben aparecer en el árbol o en los conceptos del índice | 2 |
| `dominios_primarios` | Algún dominio debe estar entre las fuentes primarias | 2 |
| `descartes` | `[{nombre, patron}]` que deben estar en la tabla de descartadas | 3 |
| `prohibidos` | `[{nombre, patron}]` que no pueden afirmarse fuera de descartadas | 3, crítica |
| `orden` | Patrones que deben aparecer en este orden en los conceptos del índice | 1 |
| `persistentes` | Archivos del usuario que no se pueden borrar | 1, crítica |
| `intactos` | `[{ruta, sha256}]` del sistema comparado que no se pueden modificar | 1, crítica |
| `ids_preservados`, `ids_nuevos_min` | IDs que deben seguir y cuántos nuevos como mínimo | 2 (crítica) y 1 |
| `comparacion` | `{archivo, sistema, filas_min, esperados}`: filas con estado, referencias archivo:línea que existen y hallazgos obligatorios | 3 |
| `umbral` | Sustituye al 0,85 | — |

## Ejecutar

Desde la carpeta del skill:

```bash
node --test evals/pruebas/*.test.mjs                        # capa 1
node evals/correr.mjs --seco                                # el pipeline sin llamar a claude
node evals/correr.mjs --caso comparar-sistema --sin-base    # un caso, sólo con skill
node evals/correr.mjs --juez --concurrencia 2               # todo, con línea base y juez
```

| Opción | Efecto |
|---|---|
| `--caso <texto>` | Sólo los casos cuyo nombre lo contiene |
| `--sin-base` | Omite la línea base sin skill |
| `--repeticiones N` | Repite cada ejecución (varianza) |
| `--concurrencia N` | Ejecuciones simultáneas; comparten el límite de uso de tu cuenta |
| `--modelo M`, `--modelo-juez M` | Modelo del agente y del juez |
| `--juez` | Añade el juez semántico con `graders/*.md` |
| `--umbral X` | Umbral de aprobado |
| `--mantener` | Conserva los directorios de trabajo para inspeccionarlos |
| `--salida <dir>` | Dónde escribir `resultado.json` e `informe.md` (por defecto `evals/resultados/<fecha>/`) |
| `--seco` | Prepara y evalúa sin llamar a claude |
| `--permitir-copia-local` | Ejecuta aunque haya una copia del skill en `~/.claude/skills/` (contaminaría la línea base) |

El brazo con skill carga el repo como plugin (`--plugin-dir`); la línea base se ejecuta con la herramienta `Skill`
bloqueada. El informe da, por brazo, la puntuación media, cuántas aprueban, si el skill se activó, el resultado del juez,
el coste y la duración, y el **delta de puntuación** entre los dos brazos; por caso, las comprobaciones que fallan con su
detalle.

Los mismos casos funcionan con `claude plugin eval` (que lee `prompt.md`, `case.yaml` y `graders/`):

```bash
claude plugin eval . --allow-tools Write,Edit,Bash,WebSearch,WebFetch --scaffold
```

Las ejecuciones reales tienen coste: cada caso de modo Crear investiga en la web durante varios minutos.

## Añadir un caso

1. Crea `evals/<nombre>/` con `prompt.md`, `case.yaml`, `esperado.json`, al menos tres `graders/*.md` y, si necesita
   archivos de partida, `place-files.sh`.
2. Pon en `esperado.json` lo que un folder correcto **tiene que** cumplir y lo que **no puede** contener. Prefiere
   patrones que fallen ante el error típico (una afirmación falsa concreta) a patrones genéricos.
3. Comprueba que el caso se carga: `node --test evals/pruebas/correr.test.mjs` y `node evals/correr.mjs --seco --caso <nombre>`.

## Cambiar el evaluador

Una comprobación nueva lleva su prueba en `pruebas/evaluar.test.mjs`: una mutación del fixture que la hace fallar. El
fixture `hexagonal-mini` debe seguir puntuando 1; si no, o el fixture tiene un hueco real o la comprobación es injusta, y
hay que decidir cuál antes de tocar nada.
