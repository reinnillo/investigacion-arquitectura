# Compromisos

## Costes
<!-- @HEX-COM-1 -->

- Cada puerto añade una interfaz y cada tecnología un adaptador: más indirección que llamar directamente a la base de datos
  **[A]**.
- Compensa cuando hay más de una tecnología por puerto o cuando se quiere probar la aplicación sin infraestructura **[A]**.

## Relacionados
<!-- @HEX-COM-2 -->

| Patrón | Autor y año | Qué comparte |
|---|---|---|
| Onion Architecture | Jeffrey Palermo, 2008 **[P]** | El dominio en el centro y la infraestructura fuera |
| Clean Architecture | Robert C. Martin, 2012 **[P]** | La regla de dependencias: el código fuente sólo apunta hacia dentro |
