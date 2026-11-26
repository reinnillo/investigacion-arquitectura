# Evidencia: cómo se investiga y se verifica

La precisión del folder depende de una sola disciplina: **ninguna afirmación entra sin su etiqueta, y ninguna etiqueta
miente.** Un folder con diez afirmaciones bien sostenidas vale más que uno con cien en las que no se puede confiar, porque
quien lo use (una persona o una AI) no puede distinguir cuáles son las inventadas.

## Contenido

1. Etiquetas
2. Qué cuenta como fuente primaria
3. Procedimiento de verificación
4. Cifras
5. Citas
6. Fallos habituales que este procedimiento evita
7. Cómo buscar rápido

## 1. Etiquetas

| Etiqueta | Significa | Forma |
|---|---|---|
| **[P]** | La leíste tú en la fuente primaria | `**[P]**` |
| **[P, vía X]** | Es un artefacto primario (una diapositiva, una cita literal) que sólo viste reproducido por X | `**[P, vía XiaoHu]**` |
| **[S]** | Un tercero la relata | `**[S]**` o `**[S, Nombre]**` para decir cuál |
| **[A]** | Adaptación o propuesta del folder: **no es del autor** | `**[A]**` |

- La etiqueta va al final de la afirmación, en negrita. En las tablas, en una columna «Ev.» o al final de la celda.
- Una sección de adaptaciones lo dice en su título o en su primera línea, y cada fila lleva **[A]**.
- En `INDEX.md` la columna «Ev.» usa `P`, `S`, `A`, combinaciones con `/` (`P/S`) o `—`.

## 2. Qué cuenta como fuente primaria

La obra del propio autor o del propio sistema:

- **Persona o equipo:** su charla y su transcripción, sus posts, su repo, su libro, una entrevista en su canal.
- **Patrón:** el artículo, el libro o la charla de quien lo definió.
- **Sistema o producto:** la documentación oficial, el código fuente, los RFC o los documentos de diseño del proyecto.
- **Estándar:** el texto del estándar en su versión vigente.

Un resumen, un blog que relata una charla o un libro de otro autor es **secundario**, aunque sea excelente. Si sólo puedes
leer un primario a través de un tercero, etiqueta `[P, vía X]` y nombra a X en `fuentes.md`.

## 3. Procedimiento de verificación

1. **Lista las afirmaciones.** Si el usuario dio un documento de partida, cada afirmación suya es una **hipótesis**, no un
   dato. En temas grandes (más de unas 30 afirmaciones) lleva un registro de trabajo fuera del folder, en el directorio
   temporal: `afirmación | fuente | URL | cita | estado`.
2. **Busca el primario de cada afirmación central.** Las afirmaciones que sostienen un concepto del índice necesitan un
   primario o, si no existe o no es accesible, **dos secundarios independientes** que no se copien entre sí.
3. **Clasifica:** confirmada **[P]**, relatada **[S]**, propuesta **[A]**, o descartada.
4. **Descarta con motivo.** Una afirmación que ninguna fuente sostiene, o que las fuentes contradicen, va a la tabla de
   afirmaciones descartadas de `fuentes.md`, con lo que dicen las fuentes. No la borres sin más: quien llegue con la misma
   idea errónea debe encontrar por qué no se sostiene.
5. **Registra los fallos de acceso.** Si una fuente no abre (paywall, HTTP 402/403, vídeo sin transcripción), dilo en
   `fuentes.md` y di qué usaste en su lugar.
6. **Fecha todo.** «Consultadas el AAAA-MM-DD» en `fuentes.md`; «actualizada el AAAA-MM-DD» en `README.md`; la versión de
   repos y estándares (`v0.15.48`, «versión 2024»).

## 4. Cifras

Cada cifra declara:

- **de quién es** (la persona, su equipo, la empresa);
- **de qué periodo** (mes, año, «sin fecha»);
- **sobre qué base** (absoluta, relativa, sin base declarada);
- **si está verificada** de forma independiente o es autodeclarada.

Nunca fusiones cifras de dueños o periodos distintos en un rango («entre 4.000 y 11.000»): pon una fila por cifra. Si una
cifra que circula la dijo otra persona a la que el autor cita, es de esa persona.

## 5. Citas

- Literales, cortas y en el idioma original, en cursiva y entre comillas latinas: *«The first two layers are deterministic»*.
- El texto que las rodea va en el idioma del folder.
- Una cita no se parafrasea dentro de las comillas. Si la reconstruyes de memoria o de un resumen, no es una cita.

## 6. Fallos habituales que este procedimiento evita

| Fallo | Ejemplo | Cómo se evita |
|---|---|---|
| Estructura inventada | Un organigrama o una «flota de 20 agentes» que ninguna fuente menciona | Cada rol, capa o componente sale de una fuente |
| Cuenta de un resumen | «Clasifica en 4 categorías» cuando el repo lista 22 opciones | Cuenta sobre el listado primario |
| Herramienta ajena | Atribuir al autor comandos de otro producto | Comprueba en qué producto vive cada comando o API |
| Cifra ajena | El 70 % que dijo otra persona citada en la charla | Pregunta de quién es cada número |
| Garantía exagerada | «Garantiza matemáticamente que nada falle» por usar métodos formales en dos piezas | Copia el alcance exacto que da la fuente |
| KPIs de terceros | Listas de métricas de un blog presentadas como del autor | Etiqueta [S] con el nombre, o descarta |
| Rango fusionado | Mezclar cifras propias y del equipo | Una fila por dueño y periodo |
| Dato viejo | Una versión o un cargo que ya cambió | Prefiere la fuente más reciente y fecha el dato |

## 7. Cómo buscar rápido

- **Lanza las búsquedas independientes en el mismo turno**, no una tras otra: nombre + charla, nombre + repo, término +
  documentación oficial, término + crítica o limitaciones.
- Para temas recientes, con fechas, versiones o cifras, usa la búsqueda más exhaustiva que tengas desde el principio.
- **Al leer una página, pide lo que necesitas:** citas literales, cifras con su periodo, nombres exactos, fechas, versión.
  Un resumen genérico obliga a volver a leerla.
- Lee primero los primarios. Los secundarios sirven para encontrar primarios y para lo que no está en ellos.
- **Para cuando cada concepto previsto tenga su primario o sus dos secundarios**, o quede marcado como no verificable. Seguir
  buscando después de eso cuesta tokens sin añadir precisión.
