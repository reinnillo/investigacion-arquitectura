---
name: investigacion-arquitectura
description: Crea, actualiza o usa para comparar folders de investigación de arquitecturas tecnológicas (como `investigacion/`). Investiga en fuentes reales, verifica cada afirmación con etiquetas [P]/[S]/[A], descarta lo que no se sostiene y organiza el resultado en carpetas y .md que reflejan la propia arquitectura, con un INDEX.md para AIs (IDs estables, marcadores greppables, preguntas de comparación) validado por script. Úsala siempre que el usuario quiera investigar, documentar, verificar o desglosar una arquitectura de software, sistemas, datos, IA/agentes, nube o plataforma (de una persona, equipo o empresa, un patrón como hexagonal o CQRS, un producto como Kubernetes, o un marco como 12-factor), aunque no diga «folder» ni «índice»; también para convertir un borrador de arquitectura en folder verificable, ampliar uno existente o comparar su sistema con él. Also for "research/document X's architecture" or "compare my system against X".
---

# Investigación de arquitectura

Produce un folder que una persona o una AI puede usar sin leerlo entero: el árbol refleja la arquitectura, cada afirmación
dice de dónde sale y un índice lleva a cualquier concepto con un `grep`. Sirve para entender una arquitectura y, sobre todo,
para comparar un sistema real con ella y mejorarlo paso a paso.

Las dos cualidades que importan, en este orden:

1. **Precisión.** Nada sin fuente, nada atribuido a quien no lo dijo y nada inventado para que la estructura quede
   simétrica. Lo que circula y no se sostiene se documenta como descartado. Un folder con datos dudosos es peor que no
   tenerlo, porque quien lo usa no puede saber qué partes fallan.
2. **Eficiencia.** Búsquedas en paralelo, lecturas dirigidas, cada archivo escrito una vez y la consistencia comprobada por
   un script en lugar de releer.

## Modos

| El usuario pide | Modo |
|---|---|
| Investigar o documentar una arquitectura nueva, o convertir un borrador en folder | **Crear** |
| Ampliar, corregir o poner al día un folder que ya existe | **Actualizar** |
| Comparar su sistema con un folder ya hecho | **Comparar** |

Si el pedido es ambiguo, decide por el estado del disco: si el folder ya existe con `INDEX.md`, es Actualizar o Comparar.

## Referencias

Léelas cuando llegues al paso que las usa, no antes:

- [references/estructura.md](references/estructura.md): cómo derivar la jerarquía de la propia arquitectura, arquetipos
  de tema con árboles de ejemplo, nombres, formato de IDs y marcadores. **Paso 3.**
- [references/evidencia.md](references/evidencia.md): etiquetas, qué es primario, procedimiento de verificación, cifras,
  citas, fallos habituales y cómo buscar rápido. **Pasos 2 y 4.**
- [references/plantillas.md](references/plantillas.md): plantillas de README, INDEX, fuentes, áreas, conceptos y
  comparación. **Pasos 4 y 5.**
- `scripts/validar.mjs`: el validador (Node ≥ 18, sin dependencias). **Pasos 5 y 6.**

## Modo Crear

### 1. Delimitar

Fija, sin rondas de preguntas si el contexto lo deja claro:

- **Tema** y su **arquetipo**: práctica de una persona o equipo, patrón con nombre, sistema o producto, o marco o estándar.
- **Ruta del folder**: la que diga el usuario; si no, `investigacion/` (o `research/` si el usuario escribe en inglés) en
  el directorio de trabajo, o `investigacion-<tema>/` si ya existe uno con otro tema.
- **Idioma**: el del usuario. Nombres de archivo en ese idioma, en minúsculas, con guiones y sin tildes.
- **Prefijo de IDs**: 2–6 mayúsculas que nombren el tema (`LT`, `HEX`, `K8S`).
- **Fecha de hoy** para «actualizada el» y «consultadas el».
- **Documento de partida**, si el usuario lo da: léelo entero. Sus afirmaciones son hipótesis que hay que verificar, no
  fuentes. No lo borres salvo que el usuario lo pida: el folder lo sustituye y `fuentes.md` dice qué tenía de falso.

Pregunta sólo si falta algo que cambie el resultado y no se puede deducir, como un tema ambiguo entre dos arquitecturas
distintas con el mismo nombre.

### 2. Investigar

Lee [references/evidencia.md](references/evidencia.md) entero antes de la primera búsqueda.

- Lanza en el mismo turno todas las búsquedas independientes: fuente primaria, repo o documentación oficial, charlas o
  artículos del autor, críticas y limitaciones, cifras.
- Lee primero los primarios, pidiendo al leer lo que necesitas: citas literales, cifras con periodo, nombres exactos,
  fechas, versión.
- Con un documento de partida, verifica cada afirmación suya y clasifícala: confirmada, relatada, adaptación o descartada.
- Termina cuando cada concepto previsto tenga un primario o dos secundarios independientes, o quede marcado como no
  verificable.

En un tema amplio (más de cinco áreas o veinte fuentes), si el entorno permite subagentes y el usuario lo acepta, reparte la
investigación por área. Cada subagente devuelve afirmaciones con URL, cita literal y etiqueta. La escritura queda en una
sola mano para que el estilo y los IDs sean coherentes.

### 3. Modelar la arquitectura

Lee [references/estructura.md](references/estructura.md).

Extrae de los primarios cómo se descompone la arquitectura según su autor: sus ejes, sus piezas, su orden y su vocabulario.
Dibuja el árbol del folder y la lista de IDs **antes** de escribir ningún archivo. Comprueba que:

- cada área de primer nivel se explica en una frase;
- el número y el orden de las piezas coinciden con la fuente (si dice cinco capas, hay cinco);
- no hay áreas vacías creadas por simetría;
- los conceptos tienen la granularidad de un ID comparable (unas 25–60 en total).

### 4. Escribir los archivos de contenido

Con las plantillas de [references/plantillas.md](references/plantillas.md), escribe cada archivo una sola vez y completo:

- un concepto por sección, con su marcador `<!-- @PFX-ÁREA-n -->` en la línea siguiente al título;
- cada afirmación con su etiqueta; las citas literales cortas, en el idioma original;
- cada cifra con su dueño, periodo, base y si está verificada;
- las adaptaciones **[A]** separadas y marcadas como tales, nunca mezcladas con lo que es del autor;
- listas y tablas antes que párrafos. Los catálogos largos van en una tabla, no en un archivo por elemento.

Después escribe `fuentes.md` (primarias, secundarias, fallos de acceso, descartadas) y `README.md` (contexto, tesis, árbol
completo, evidencia).

### 5. Escribir INDEX.md

Es la pieza que hace el folder útil sin leerlo entero; dale el mismo cuidado que al contenido.

- **Protocolo**: cómo localizar un concepto con `grep`, cómo comparar y cómo priorizar mejoras **según el orden que impone
  la propia arquitectura** (capas de la base a la punta, dependencias, requisitos previos que declara el autor).
- **La arquitectura en 6–10 líneas**, citando IDs.
- **Tabla de áreas** con su prefijo `PFX-ÁREA` y enlace.
- **Una fila por ID**: concepto autosuficiente en una línea, evidencia, una pregunta que se responde mirando un sistema y
  términos de búsqueda genéricos. `—` donde no aplica, nunca una celda vacía.
- **Plantilla de comparación.**

Usa `node <skill>/scripts/validar.mjs <folder> --map` para obtener la lista de ID → archivo:línea en lugar de recorrer los
archivos a mano.

### 6. Validar

```bash
node <ruta-del-skill>/scripts/validar.mjs <folder>
```

El script comprueba que:

- cada ID del índice tiene exactamente un marcador en el folder, y cada marcador su fila;
- hay un solo prefijo y cada área figura en la tabla de áreas;
- la evidencia del índice es válida, no hay celdas vacías y las columnas cuadran;
- los enlaces relativos y sus anclas existen;
- el árbol de `README.md` coincide con los archivos reales;
- `fuentes.md` tiene URLs y sección de descartadas;
- cada archivo tiene marcadores y etiquetas de evidencia.

Corrige sólo lo que reporte y vuelve a ejecutarlo hasta que salga `✓ válido`. Los avisos se revisan uno a uno: o se
corrigen, o se justifican en el informe final. Si el script se equivoca, dilo en el informe; no cambies el folder para
complacer a un falso positivo.

El script no puede juzgar la verdad de lo escrito. Antes de terminar, relee la tabla de descartadas y la columna «Ev.» del
índice preguntándote, por cada fila **P**: ¿lo leí yo en el primario?

### 7. Informar

Responde al usuario con:

- la ruta y el árbol de primer y segundo nivel;
- cifras: IDs, fuentes primarias y secundarias, afirmaciones descartadas, resultado del validador;
- qué no se pudo verificar y por qué;
- el siguiente paso útil, normalmente comparar un sistema concreto con el folder.

## Modo Actualizar

1. Lee `INDEX.md` y ejecuta `validar.mjs <folder> --map`. Con eso sabes qué hay y dónde, sin abrir cada archivo.
2. Investiga sólo lo nuevo o lo dudoso, con el mismo rigor del paso 2. Las cifras y versiones antiguas se vuelven a
   comprobar si el usuario pide ponerlas al día.
3. Edita en el sitio. Los IDs no se renumeran ni se reutilizan: los nuevos continúan la numeración de su área; un concepto
   retirado pierde su marcador y su fila. Si un cambio altera la estructura, actualiza el árbol del README y la tabla de
   áreas.
4. Actualiza la fecha de `README.md` y de `fuentes.md`. Valida e informa como en los pasos 6 y 7, diciendo qué IDs se
   añadieron, cambiaron o retiraron.

## Modo Comparar

El objetivo es mejorar un sistema real, así que la comparación tiene que apoyarse en evidencia del sistema, no en
impresiones.

1. Lee sólo `INDEX.md` del folder.
2. Para cada ID con pregunta, busca en el sistema con los términos de **Buscar** (`Grep`) y abre sólo lo que aparezca.
   Responde la pregunta con un estado (`TIENE`, `PARCIAL`, `FALTA`, `N/A`) y `archivo:línea` del sistema. Abre la sección del
   folder (con el `grep` del protocolo) sólo si la línea del índice no basta para juzgar.
3. Escribe `comparaciones/<sistema>.md` con la plantilla de la sección 5 del índice y ordena la prioridad con el protocolo.
   El validador ignora `comparaciones/`. Avisa de que ese archivo contiene datos del sistema comparado y conviene quitarlo
   antes de compartir el folder.
4. No cambies el código del sistema en este modo. Las mejoras siguen el proceso propio de ese proyecto (su plan, sus
   reglas, su `CLAUDE.md`), citando el ID que las motiva.

## Compartir

El folder está pensado para pasarlo a otra persona y a su AI. Por eso no contiene datos privados del usuario ni de sus
sistemas (salvo en `comparaciones/`, que se quita antes de compartir), y no depende de este skill para leerse: el protocolo
del índice es autosuficiente.
