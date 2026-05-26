# PRP - Auditoria y Mejora Integral de FotosWiki

## Estado
- Propuesta aprobada para ejecucion futura.
- Este documento planifica el trabajo. No implica cambios de codigo todavia.

## Objetivo
Fortalecer la base tecnica de FotosWiki para reducir errores, mejorar mantenibilidad y asegurar una evolucion estable del producto sin romper la UX actual.

## Alcance
- Tooling de calidad (lint, typecheck, build).
- Robustez de capa de red contra fallos de MediaWiki.
- Unificacion de logica de indexado/busqueda.
- Coherencia UX en filtros y estados de carga/error.
- Mejora de mantenibilidad en componentes grandes.

## No Alcance
- Rediseño visual completo.
- Cambio de stack tecnologico.
- Refactor masivo no incremental.

## Diagnostico Base
- `npm run build` compila correctamente.
- `npm run typecheck` no existe en scripts actuales.
- `npm run lint` usa una via incompatible con la configuracion actual de Next 16.
- No hay suite de tests automatizados configurada.
- Existe duplicacion de logica de indexado entre cliente y API.
- Hay manejo de errores silencioso en varios flujos (catch vacios).

## Criterios Globales de Exito
- Calidad base en verde: lint, typecheck, build.
- Menor riesgo de fallos silenciosos en red.
- Comportamiento de busqueda consistente entre server/client.
- Flujos de galeria y filtros predecibles para usuario final.
- Reduccion de complejidad en archivos grandes sin cambiar comportamiento.

## Plan por Fases

### Fase 0 - Baseline y Guardrails
Objetivo: definir punto de partida y reglas de verificacion por fase.

Tareas:
- Documentar baseline de calidad y estado funcional.
- Definir checklist de validacion para todas las fases.
- Establecer queries de regresion para busqueda.

Aceptacion:
- Baseline registrado.
- Checklist de verificacion listo para ejecucion repetible.

---

### Fase 1 - Tooling de Calidad (Critica)
Objetivo: habilitar scripts confiables de calidad y alinear documentacion.

Tareas:
- Ajustar scripts en `package.json` para lint y typecheck funcionales.
- Adaptar lint a Next 16 sin comandos obsoletos.
- Alinear README con scripts reales.

Aceptacion:
- `npm run lint` OK.
- `npm run typecheck` OK.
- `npm run build` OK.

---

### Fase 2 - Robustez de Capa de Red
Objetivo: hacer resiliente el acceso a MediaWiki.

Tareas:
- Introducir util compartido para fetch con validacion de `res.ok`.
- Definir estrategia de timeout y parse seguro.
- Reducir `catch` silenciosos en caminos criticos.

Aceptacion:
- Fallos de red no rompen la UI.
- Errores reportados de forma coherente.
- Flujos clave mantienen fallback funcional.

---

### Fase 3 - Unificacion de Indexado y Busqueda
Objetivo: eliminar drift entre cliente y servidor en construccion del indice.

Tareas:
- Extraer normalizacion/tokenizacion comun.
- Reutilizar la misma logica en API y cliente.
- Validar resultados con set de queries de regresion.

Aceptacion:
- Salida de busqueda consistente entre server/client.
- Menor duplicacion de codigo.
- Calidad base sigue en verde.

---

### Fase 4 - Coherencia UX (Filtros y Estados)
Objetivo: alinear expectativas de usuario con comportamiento real.

Tareas:
- Revisar etiquetado y mapeo de filtros por epoca.
- Unificar estados de carga/vacio/error en busqueda y compartir.
- Verificar consistencia en mobile y desktop.

Aceptacion:
- Filtros con semantica coherente.
- Estados de interfaz claramente distinguibles.

---

### Fase 5 - Mantenibilidad de Componentes Grandes
Objetivo: reducir complejidad local sin alterar UX.

Tareas:
- Particionar `GalleryScreen` en subcomponentes acotados.
- Separar logica de acciones (header/share/grid) para claridad.
- Mantener APIs internas simples (KISS/YAGNI).

Aceptacion:
- Menor complejidad por archivo.
- Comportamiento funcional intacto.
- Calidad base en verde.

## Riesgos y Mitigacion
- Riesgo: regresiones al tocar capa de red.
  - Mitigacion: cambios incrementales + smoke sobre rutas clave.
- Riesgo: cambios en indexado alteren busqueda.
  - Mitigacion: comparar queries antes/despues.
- Riesgo: ajustes de lint/typecheck revelen deuda adicional.
  - Mitigacion: priorizar errores bloqueantes primero.

## Smoke Checklist (cada fase)
- Ruta `/` carga correctamente.
- Ruta `/gallery` carga, busca y navega fotos.
- Ruta `/favorites` funcional.
- Ruta `/foto/[title]` renderiza detalle.
- Ruta `/seleccion` abre enlaces compartidos.
- PWA/SW sin degradacion evidente.

## Orden Recomendado de Ejecucion
1. Fase 1 - Tooling de calidad.
2. Fase 2 - Robustez de red.
3. Fase 3 - Unificacion de busqueda.
4. Fase 4 - Coherencia UX.
5. Fase 5 - Mantenibilidad.

## Definicion de Hecho (DoD)
- Cambios implementados por fase sin mezclar objetivos.
- Build, lint y typecheck en verde.
- Validacion smoke completada.
- Sin regresiones funcionales observables.
