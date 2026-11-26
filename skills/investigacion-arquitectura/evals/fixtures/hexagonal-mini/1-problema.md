# El problema

Cockburn parte de un fallo de diseño concreto, no de una forma geométrica **[P]**.

## Cómo se lee
<!-- @HEX-PRO-0 -->

- El patrón responde a un problema de acoplamiento a ambos lados de la aplicación: la interfaz de usuario y la
  infraestructura **[P]**.

## Lógica filtrada y acoplamiento
<!-- @HEX-PRO-1 -->

- La lógica de negocio se infiltra en el código de la interfaz de usuario, y entonces no se puede probar sin ella **[P]**.
- Por el otro lado, la aplicación queda atada a una base de datos o a servicios concretos, y no se puede ejecutar sin ellos
  **[P]**.
- El remedio es el mismo para los dos lados: separar la aplicación de todo lo externo con puertos **[P]**.
